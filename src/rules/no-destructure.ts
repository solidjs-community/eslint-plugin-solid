/* eslint-disable */
import type { Rule } from "eslint";
import type {
  FunctionExpression,
  FunctionDeclaration,
  ObjectPattern,
  Literal,
  Identifier,
  Expression,
  RestElement,
  ArrowFunctionExpression,
} from "estree-jsx";
import { getStringIfConstant } from "eslint-utils";
import { isReturningJSX } from "../utils/ast";

const getName = (node): string | null => {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Identifier":
      return node.name;
    case "AssignmentPattern":
      return getName(node.left);
    default:
      return getStringIfConstant(node);
  }
};

interface PropertyInfo {
  real: Literal | Identifier | Expression;
  var: string;
  computed: boolean;
  init: Expression | undefined;
}

// Given ({ 'hello-world': helloWorld = 5 }), returns { real: Literal('hello-world'), var: 'helloWorld', computed: false, init: Literal(5) }
const getPropertyInfo = (prop): PropertyInfo | null => {
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

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent destructuring props. In Solid, props must be used with property accesses (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the parameter list.",
    },
    messages: {
      noDestructure:
        "Destructuring component props breaks Solid's reactivity; use property access instead.",
      // noWriteToProps: "Component props are readonly, writing to props is not supported.",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    const matchDestructuredParams = (node) => {
      const props = node.params[0];
      if (props.type === "ObjectPattern" && isReturningJSX(node)) {
        // Props are destructured in the function params, not the body. We actually don't
        // need to handle the case where props are destructured in the body, because that
        // will be a violation of "solid/reactivity".
        context.report({
          node: props,
          messageId: "noDestructure",
          fix: (fixer) =>
            fixDestructure({
              func: node,
              props,
              fixer,
            }),
        });
      }
      // TODO: this is a weird spot for this block of code, and might be TS's job anyway.
      // if (props.type === "Identifier") {
      //   const sourceCode = context.getSourceCode();
      //   const scope = sourceCode.scopeManager.acquire(node);
      //   if (scope) {
      //     const variable = scope.set.get(props.name);
      //     if (variable) {
      //       variable.references.forEach((reference) => {
      //         if (!reference.isReadOnly()) {
      //           // Props references should be readonly
      //           context.report({
      //             node: reference.identifier,
      //             messageId: "noWriteToProps",
      //           });
      //         }
      //       });
      //     }
      //   }
      // }
    };

    const fixDestructure = ({
      func,
      props,
      fixer,
      propsName = "props",
    }: {
      func: FunctionExpression | FunctionDeclaration | ArrowFunctionExpression;
      props: ObjectPattern;
      fixer: Rule.RuleFixer;
      propsName?: string;
    }): Array<Rule.Fix> => {
      const properties = props.properties;

      const propertyInfo: Array<PropertyInfo> = [];
      let rest: RestElement | null = null;

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

      const fixes: Array<Rule.Fix> = [];

      const hasDefaults = propertyInfo.some((info) => info.init);

      // Replace destructured props with a `props` identifier (`_props` in case of rest params)
      const origProps = !rest ? propsName : "_" + propsName;
      fixes.push(fixer.replaceText(props, origProps));

      const sourceCode = context.getSourceCode();

      // Insert a line that reassigns props to props merged with defaults
      const mergePropsLine = hasDefaults
        ? `  ${origProps} = mergeProps({ ${propertyInfo
            .filter((info) => info.init)
            .map(
              (info) =>
                `${info.computed ? "[" : ""}${sourceCode.getText(info.real)}${
                  info.computed ? "]" : ""
                }: ${sourceCode.getText(info.init)}`
            )
            .join(", ")} }, ${origProps});\n`
        : null;

      // Insert a line that keeps named props and extracts the rest into a new reactive rest object
      const splitPropsLine = rest
        ? `  const [${propsName}, ${
            (rest.argument as Identifier)?.name ?? "rest"
          }] = splitProps(${origProps}, [${propertyInfo
            .map((info) =>
              info.real.type === "Identifier"
                ? JSON.stringify(info.real.name)
                : sourceCode.getText(info.real)
            )
            .join(", ")}]);\n`
        : null;

      if (mergePropsLine || splitPropsLine) {
        const body = func.body;
        if (body.type === "BlockStatement") {
          if (body.body.length > 0) {
            // Inject lines handling defaults/rest params before the first statement in the block.
            fixes.push(
              fixer.insertTextBefore(
                body.body[0],
                `${mergePropsLine ?? ""}${splitPropsLine ?? ""}\n`
              )
            );
          }
          // with an empty block statement body, no need to inject code
        } else {
          // The function is an arrow function that implicitly returns an expression, possibly with wrapping parentheses.
          // These must be removed to convert the function body to a block statement for code injection.
          const maybeOpenParen = sourceCode.getTokenBefore(body);
          if (maybeOpenParen?.value === "(") {
            fixes.push(fixer.remove(maybeOpenParen));
          }
          const maybeCloseParen = sourceCode.getTokenAfter(body);
          if (maybeCloseParen?.value === ")") {
            fixes.push(fixer.remove(maybeCloseParen));
          }

          // Inject lines handling defaults/rest params
          fixes.push(
            fixer.insertTextBefore(
              body,
              `{\n${mergePropsLine ?? ""}${splitPropsLine ?? ""}  return (`
            )
          );
          fixes.push(fixer.insertTextAfter(body, `);\n}`));
        }
      }

      const scope = sourceCode.scopeManager.acquire(func);
      if (scope) {
        propertyInfo
          .map((info) => [info, scope.set.get(info.var)] as const) // iterate through destructured variables, associated with real node
          .filter(([, variable]) => Boolean(variable))
          .forEach(([info, variable]) => {
            // replace all usages of the variable with props accesses
            variable!.references.forEach((reference) => {
              if (reference.isReadOnly()) {
                const access =
                  info.real.type === "Identifier" && !info.computed
                    ? `.${info.real.name}`
                    : `[${sourceCode.getText(info.real)}]`;
                fixes.push(fixer.replaceText(reference.identifier, `${propsName}${access}`));
              }
            });
          });
      }

      return fixes;
    };

    return {
      "FunctionDeclaration[params.length=1]": matchDestructuredParams,
      "FunctionExpression[params.length=1]": matchDestructuredParams,
      "ArrowFunctionExpression[params.length=1]": matchDestructuredParams,
    };
  },
};

export default rule;
