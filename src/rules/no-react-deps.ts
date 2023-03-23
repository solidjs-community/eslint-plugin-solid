import { ESLintUtils } from "@typescript-eslint/utils";
import { isFunctionNode, trace, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

export default createRule({
  meta: {
    type: "problem",
    docs: {
      recommended: "warn",
      description: "Disallow usage of dependency arrays in `createEffect` and `createMemo`.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/no-react-deps.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      noUselessDep:
        "In Solid, `{{name}}` doesn't accept a dependency array because it automatically tracks its dependencies. If you really need to override the list of dependencies, use `on`.",
    },
  },
  defaultOptions: [],
  create(context) {
    /** Tracks imports from 'solid-js', handling aliases. */
    const { matchImport, handleImportDeclaration } = trackImports();

    return {
      ImportDeclaration: handleImportDeclaration,
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          matchImport(["createEffect", "createMemo"], node.callee.name) &&
          node.arguments.length === 2 &&
          node.arguments.every((arg) => arg.type !== "SpreadElement")
        ) {
          // grab both arguments, tracing any variables to their actual values if possible
          const [arg0, arg1] = node.arguments.map((arg) => trace(arg, context.getScope()));

          if (isFunctionNode(arg0) && arg0.params.length === 0 && arg1.type === "ArrayExpression") {
            // A second argument that looks like a dependency array was passed to
            // createEffect/createMemo, and the inline function doesn't accept a parameter, so it
            // can't just be an initial value.
            context.report({
              node: node.arguments[1], // if this is a variable, highlight the usage, not the initialization
              messageId: "noUselessDep",
              data: {
                name: node.callee.name,
              },
              // remove dep array if it's given inline, otherwise don't fix
              fix: arg1 === node.arguments[1] ? (fixer) => fixer.remove(arg1) : undefined,
            });
          }
        }
      },
    };
  },
});
