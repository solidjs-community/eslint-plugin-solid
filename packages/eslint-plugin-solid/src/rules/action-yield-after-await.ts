import { ESLintUtils, TSESTree as T } from "@typescript-eslint/utils";
import { findVariable } from "../compat";
import {
  findParent,
  getSolidSourceRegex,
  ignoreTransparentWrappers,
  isFunctionNode,
} from "../utils";

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: "problem",
    docs: {
      description: "Require a bare yield after await in Solid action generators.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/action-yield-after-await.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      missingYield:
        "Await inside an action runs its continuation outside the transaction; add a bare yield before any write or reader creation.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const solidSourceRegex = getSolidSourceRegex(context);

    function wrappedNode(node: T.Node): T.Node {
      while (
        node.parent &&
        (node.parent.type === "TSAsExpression" ||
          node.parent.type === "TSNonNullExpression" ||
          node.parent.type === "TSSatisfiesExpression") &&
        node.parent.expression === node
      )
        node = node.parent;
      return node;
    }

    function isAction(callee: T.Node): boolean {
      callee = ignoreTransparentWrappers(callee);
      let identifier: T.Identifier;
      let namespace = false;
      if (callee.type === "Identifier") {
        identifier = callee;
      } else if (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        ((!callee.computed &&
          callee.property.type === "Identifier" &&
          callee.property.name === "action") ||
          (callee.computed &&
            callee.property.type === "Literal" &&
            callee.property.value === "action"))
      ) {
        identifier = callee.object;
        namespace = true;
      } else {
        return false;
      }
      const def = findVariable(context, identifier)?.defs[0];
      if (
        def?.type !== "ImportBinding" ||
        def.parent.type !== "ImportDeclaration" ||
        !solidSourceRegex.test(def.parent.source.value)
      )
        return false;
      if (def.parent.importKind === "type") return false;
      const specifier = def.node;
      return namespace
        ? specifier.type === "ImportNamespaceSpecifier"
        : specifier.type === "ImportSpecifier" &&
            specifier.importKind !== "type" &&
            (specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value) === "action";
    }

    function hasOwnAwait(node: T.Node | null | undefined): boolean {
      if (!node || isFunctionNode(node)) return false;
      if (node.type === "AwaitExpression") return true;
      return (sourceCode.visitorKeys[node.type] ?? []).some((key) => {
        const child = (node as unknown as Record<string, T.Node | T.Node[] | null>)[key];
        return Array.isArray(child) ? child.some(hasOwnAwait) : !!child && hasOwnAwait(child);
      });
    }

    function check(node: T.AwaitExpression) {
      const fn = findParent(node, isFunctionNode);
      if (fn?.type !== "FunctionExpression" || !fn.async || !fn.generator) return;
      const argument = wrappedNode(fn);
      const call = argument.parent;
      if (
        call?.type !== "CallExpression" ||
        call.arguments[0] !== argument ||
        !isAction(call.callee)
      )
        return;

      // Only a directly yielded await has no intervening operand evaluation.
      const yielded = wrappedNode(node);
      if (
        yielded.parent?.type === "YieldExpression" &&
        yielded.parent.argument === yielded &&
        !yielded.parent.delegate
      )
        return;
      let statement: T.Node = node;
      while (statement.parent && statement.parent !== fn) {
        if (statement.type.endsWith("Statement") || statement.type === "VariableDeclaration") break;
        statement = statement.parent;
      }

      // Simple declarations and local identifier assignments do no user work
      // after the await. Member assignments can invoke setters, so exclude them.
      let root: T.Node | null = null;
      if (statement.type === "ExpressionStatement") {
        root = ignoreTransparentWrappers(statement.expression);
        if (
          root.type === "AssignmentExpression" &&
          root.operator === "=" &&
          root.left.type === "Identifier"
        ) {
          const variable = findVariable(context, root.left);
          if (
            variable?.defs.some(
              (def) =>
                def.type === "Variable" || def.type === "Parameter" || def.type === "CatchClause"
            )
          ) {
            root = root.right;
          }
        }
      }
      if (statement.type === "VariableDeclaration" && statement.declarations.length === 1) {
        const declaration = statement.declarations[0];
        if (declaration.id.type === "Identifier") root = declaration.init;
      }
      const simple = root && ignoreTransparentWrappers(root) === node;
      const parent = statement.parent;
      const siblings =
        parent?.type === "BlockStatement"
          ? parent.body
          : parent?.type === "SwitchCase"
          ? parent.consequent
          : null;
      const index = siblings?.indexOf(statement as T.Statement) ?? -1;
      const next = index >= 0 ? siblings?.[index + 1] : undefined;
      const bareYield =
        next?.type === "ExpressionStatement" &&
        next.expression.type === "YieldExpression" &&
        !next.expression.argument &&
        !next.expression.delegate;
      // Nested awaits still have a continuation inside the outer await operand.
      if (simple && bareYield) return;
      const nestedAwait = hasOwnAwait(node.argument);
      context.report({
        node,
        messageId: "missingYield",
        fix:
          simple && siblings && !nestedAwait
            ? (fixer) =>
                fixer.insertTextAfter(
                  statement,
                  sourceCode.getLastToken(statement)?.value === ";" ? " yield;" : "; yield;"
                )
            : undefined,
      });
    }

    return {
      AwaitExpression: check,
    };
  },
});
