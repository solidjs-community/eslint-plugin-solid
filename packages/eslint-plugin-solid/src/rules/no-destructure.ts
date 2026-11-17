import type { TSESTree as T, TSESLint } from "@typescript-eslint/utils";
import { getFunctionName, isSolidV2, type FunctionNode } from "../utils";
import { createRule, getStringIfConstant, getSourceCode } from "../compat";

const getName = (node: T.Node): string | null => {
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" ? node.value : null;
    case "Identifier":
      return node.name;
    case "AssignmentPattern":
      return getName(node.left);
    default:
      return getStringIfConstant(node);
  }
};

interface PropertyInfo {
  real: T.Literal | T.Identifier | T.Expression;
  var: string;
  computed: boolean;
  init: T.Expression | undefined;
}

// Given ({ 'hello-world': helloWorld = 5 }), returns { real: Literal('hello-world'), var: 'helloWorld', computed: false, init: Literal(5) }
const getPropertyInfo = (prop: T.Property): PropertyInfo | null => {
  const valueName = getName(prop.value);
  if (valueName !== null) {
    return {
      real: prop.key,
      var: valueName,
      computed: prop.computed,
      init: prop.value.type === "AssignmentPattern" ? prop.value.right : undefined,
    };
  } else {
    return null;
  }
};

export default createRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow destructuring props. In Solid, props must be used with property accesses (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the parameter list.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-destructure.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      noDestructure:
        "Destructuring component props breaks Solid's reactivity; use property access instead.",
      // noWriteToProps: "Component props are readonly, writing to props is not supported.",
    },
  },
  defaultOptions: [],
  create(context) {
    const functionStack: Array<{
      /** switched to true by :exit if JSX is detected in the current function */
      hasJSX: boolean;
    }> = [];
    const currentFunction = () => functionStack[functionStack.length - 1];
    const onFunctionEnter = () => {
      functionStack.push({ hasJSX: false });
    };
    // Matches the component detection in components-return-once: containing JSX
    // isn't enough on its own, because data callbacks (`items.map(({ id }) => ...)`)
    // and lowercase-named helpers (`renderItem`) also return JSX; their object
    // param is a plain data item, not reactive props.
    const isComponent = (node: FunctionNode) =>
      !getFunctionName(node)?.match(/^[a-z]/) &&
      node.parent?.type !== "JSXExpressionContainer" && // "render props" aren't components
      !(
        // functions passed as arguments are callbacks, unless the callee is a
        // component-wrapper (PascalCase, like HOCs). A FunctionDeclaration can
        // never be a call argument, so the cast below is safe.
        (
          node.parent?.type === "CallExpression" &&
          node.parent.arguments.includes(node as T.CallExpressionArgument) &&
          !(node.parent.callee as T.Identifier).name?.match(/^[A-Z]/)
        )
      );

    const onFunctionExit = (node: FunctionNode) => {
      if (node.params.length === 1) {
        const props = node.params[0];
        if (props.type === "ObjectPattern" && currentFunction().hasJSX && isComponent(node)) {
          // Props are destructured in the function params, not the body. We actually don't
          // need to handle the case where props are destructured in the body, because that
          // will be a violation of "solid/reactivity".
          context.report({
            node: props,
            messageId: "noDestructure",
            fix: canFixDestructure(node, props)
              ? (fixer) => fixDestructure(node, props, fixer)
              : undefined,
          });
        }
      }

      // Pop on exit
      functionStack.pop();
    };

    /**
     * The fix rewrites every destructured binding to a `props.x` access and may
     * declare `props`, `_props` and the rest name. Skip it (report only) when
     * that can't be done faithfully (#261):
     * - a property the fix can't represent, such as a nested pattern
     *   (`{ user: { name } }`), or a rest that isn't a plain identifier;
     * - a default that reads another destructured prop (`{ a, b = a }`): the
     *   default moves into a `merge`/`mergeProps` call where `a` is unbound,
     *   and rewriting it inside the parameter overlaps the parameter fix;
     * - a name the fix introduces (`props`, `_props`) that is already declared
     *   anywhere in the function, or read from an enclosing scope, since the
     *   new binding would collide with or shadow it.
     */
    const canFixDestructure = (func: FunctionNode, props: T.ObjectPattern): boolean => {
      const destructured = new Set<string>();
      for (const property of props.properties) {
        if (property.type === "RestElement") {
          if (property.argument.type !== "Identifier") return false;
          destructured.add(property.argument.name);
          continue;
        }
        const info = getPropertyInfo(property);
        if (info === null) return false;
        destructured.add(info.var);
      }

      const scope = getSourceCode(context).scopeManager?.acquire(func);
      if (!scope) return false;

      for (const name of destructured) {
        const variable = scope.set.get(name);
        if (
          variable?.references.some(
            (reference) =>
              reference.identifier.range[0] >= props.range[0] &&
              reference.identifier.range[1] <= props.range[1] &&
              !reference.init
          )
        ) {
          return false;
        }
      }

      const introduced = ["props", "_props"];
      const conflicts = (name: string): boolean => {
        // Read from an enclosing scope (e.g. an outer component's `props`)
        if (scope.through.some((reference) => reference.identifier.name === name)) return true;
        // Declared in the function or any scope nested in it
        const stack = [scope];
        while (stack.length) {
          const current = stack.pop()!;
          for (const variable of current.variables) {
            if (variable.name !== name) continue;
            // the destructured binding itself goes away with the fix
            if (current === scope && destructured.has(name)) continue;
            // `arguments` and similar implicit variables have no definitions
            if (variable.defs.length === 0) continue;
            return true;
          }
          stack.push(...current.childScopes);
        }
        return false;
      };
      return !introduced.some(conflicts);
    };

    /** Import the props helpers the fix uses from "solid-js", extending an existing import. */
    function* importHelpers(
      fixer: TSESLint.RuleFixer,
      names: Array<string>
    ): Generator<TSESLint.RuleFix> {
      const program = getSourceCode(context).ast;
      const solidImport = program.body.find(
        (node): node is T.ImportDeclaration =>
          node.type === "ImportDeclaration" &&
          node.source.value === "solid-js" &&
          node.importKind !== "type" &&
          !node.specifiers.some((s) => s.type === "ImportNamespaceSpecifier")
      );
      const imported = new Set(
        solidImport?.specifiers.map((s) =>
          s.type === "ImportSpecifier"
            ? s.imported.type === "Identifier"
              ? s.imported.name
              : s.imported.value
            : ""
        )
      );
      const missing = names.filter((name) => !imported.has(name));
      if (!missing.length) return;
      const named = solidImport?.specifiers.filter(
        (s): s is T.ImportSpecifier => s.type === "ImportSpecifier"
      );
      if (solidImport && named?.length) {
        yield fixer.insertTextAfter(named[named.length - 1], `, ${missing.join(", ")}`);
      } else if (solidImport && solidImport.specifiers.length) {
        // only a default import
        yield fixer.insertTextAfter(solidImport.specifiers[0], `, { ${missing.join(", ")} }`);
      } else {
        const imports = program.body.filter((node) => node.type === "ImportDeclaration");
        const text = `import { ${missing.join(", ")} } from "solid-js";`;
        if (imports.length) {
          yield fixer.insertTextAfter(imports[imports.length - 1], `\n${text}`);
        } else {
          yield fixer.insertTextBeforeRange([program.range[0], program.range[0]], `${text}\n`);
        }
      }
    }

    function* fixDestructure(
      func: FunctionNode,
      props: T.ObjectPattern,
      fixer: TSESLint.RuleFixer
    ): Generator<TSESLint.RuleFix> {
      const propsName = "props";
      const properties = props.properties;

      const propertyInfo: Array<PropertyInfo> = [];
      let rest: T.RestElement | null = null;

      for (const property of properties) {
        if (property.type === "RestElement") {
          rest = property;
        } else {
          const info = getPropertyInfo(property);
          if (info === null) {
            continue;
          }
          propertyInfo.push(info);
        }
      }

      const hasDefaults = propertyInfo.some((info) => info.init);
      // Solid 2.0 replaced `mergeProps`/`splitProps` with `merge`/`omit` (#239)
      const v2 = isSolidV2(context);
      const mergeName = v2 ? "merge" : "mergeProps";
      const splitName = v2 ? "omit" : "splitProps";
      const helpers = [...(hasDefaults ? [mergeName] : []), ...(rest ? [splitName] : [])];

      // Replace destructured props with a `props` identifier (`_props` in case of rest
      // params/defaults). `omit` returns only the rest, so 2.0 keeps `props` for rest alone.
      const origProps = !(hasDefaults || (rest && !v2)) ? propsName : "_" + propsName;
      if (props.typeAnnotation) {
        // in `{ prop1, prop2 }: Props`, leave `: Props` alone
        const range = [props.range[0], props.typeAnnotation.range[0]] as const;
        yield fixer.replaceTextRange(range, origProps);
      } else {
        yield fixer.replaceText(props, origProps);
      }

      const sourceCode = getSourceCode(context);

      const defaultsObjectString = () =>
        propertyInfo
          .filter((info) => info.init)
          .map(
            (info) =>
              `${info.computed ? "[" : ""}${sourceCode.getText(info.real)}${
                info.computed ? "]" : ""
              }: ${sourceCode.getText(info.init)}`
          )
          .join(", ");
      const splitPropsArray = () =>
        `[${propertyInfo
          .map((info) =>
            info.real.type === "Identifier"
              ? JSON.stringify(info.real.name)
              : sourceCode.getText(info.real)
          )
          .join(", ")}]`;

      const restName = (rest?.argument.type === "Identifier" && rest.argument.name) || "rest";
      const omitKeys = () =>
        propertyInfo
          .map((info) =>
            info.real.type === "Identifier"
              ? JSON.stringify(info.real.name)
              : sourceCode.getText(info.real)
          )
          .join(", ");

      let lineToInsert = "";
      if (v2) {
        if (hasDefaults) {
          lineToInsert += `  const ${propsName} = merge({ ${defaultsObjectString()} }, ${origProps});\n`;
        }
        if (rest) {
          lineToInsert += `  const ${restName} = omit(${propsName}${
            propertyInfo.length ? ", " + omitKeys() : ""
          });\n`;
        }
      } else if (hasDefaults && rest) {
        // Insert a line that assigns _props
        lineToInsert = `  const [${propsName}, ${
          (rest.argument.type === "Identifier" && rest.argument.name) || "rest"
        }] = splitProps(mergeProps({ ${defaultsObjectString()} }, ${origProps}), ${splitPropsArray()});\n`;
      } else if (hasDefaults) {
        // Insert a line that assigns _props merged with defaults to props
        lineToInsert = `  const ${propsName} = mergeProps({ ${defaultsObjectString()} }, ${origProps});\n`;
      } else if (rest) {
        // Insert a line that keeps named props and extracts the rest into a new reactive rest object
        lineToInsert = `  const [${propsName}, ${
          (rest.argument.type === "Identifier" && rest.argument.name) || "rest"
        }] = splitProps(${origProps}, ${splitPropsArray()});\n`;
      }

      if (lineToInsert) {
        yield* importHelpers(fixer, helpers);
        const body = func.body;
        if (body.type === "BlockStatement") {
          if (body.body.length > 0) {
            // Inject lines handling defaults/rest params before the first statement in the block.
            yield fixer.insertTextBefore(body.body[0], lineToInsert);
          }
          // with an empty block statement body, no need to inject code
        } else {
          // The function is an arrow function that implicitly returns an expression, possibly with wrapping parentheses.
          // These must be removed to convert the function body to a block statement for code injection.
          const maybeOpenParen = sourceCode.getTokenBefore(body);
          if (maybeOpenParen?.value === "(") {
            yield fixer.remove(maybeOpenParen);
          }
          const maybeCloseParen = sourceCode.getTokenAfter(body);
          if (maybeCloseParen?.value === ")") {
            yield fixer.remove(maybeCloseParen);
          }

          // Inject lines handling defaults/rest params
          yield fixer.insertTextBefore(body, `{\n${lineToInsert}  return (`);
          yield fixer.insertTextAfter(body, `);\n}`);
        }
      }

      const scope = sourceCode.scopeManager?.acquire(func);
      if (scope) {
        // iterate through destructured variables, associated with real node
        for (const [info, variable] of propertyInfo.map(
          (info) => [info, scope.set.get(info.var)] as const
        )) {
          if (variable) {
            // replace all usages of the variable with props accesses
            for (const reference of variable.references) {
              if (reference.isReadOnly()) {
                const access =
                  info.real.type === "Identifier" && !info.computed
                    ? `.${info.real.name}`
                    : `[${sourceCode.getText(info.real)}]`;
                yield fixer.replaceText(reference.identifier, `${propsName}${access}`);
              }
            }
          }
        }
      }
    }

    return {
      FunctionDeclaration: onFunctionEnter,
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      "FunctionDeclaration:exit": onFunctionExit,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      JSXElement() {
        if (functionStack.length) {
          currentFunction().hasJSX = true;
        }
      },
      JSXFragment() {
        if (functionStack.length) {
          currentFunction().hasJSX = true;
        }
      },
    };
  },
});
