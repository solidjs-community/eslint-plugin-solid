import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { FunctionNode } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

export default createRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow early returns in components. Solid components only run once, and so conditionals should be inside JSX.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/components-return-once.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      noEarlyReturn:
        "Solid components run once, so an early return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
    },
  },

  defaultOptions: [],

  create(context) {
    const JSXElement = T.AST_NODE_TYPES.JSXElement;

    const isFunction = (node: T.Node | undefined) => {
      return (
        node?.type === T.AST_NODE_TYPES.FunctionDeclaration ||
        node?.type === T.AST_NODE_TYPES.ArrowFunctionExpression ||
        node?.type === T.AST_NODE_TYPES.FunctionExpression
      );
    };

    const onFunctionEnter = (node: FunctionNode) => {
      const checkEarlyReturn = (node: FunctionNode) => {
        const fnName = (() => {
          if (
            node.type === T.AST_NODE_TYPES.ArrowFunctionExpression ||
            node.type === T.AST_NODE_TYPES.FunctionExpression
          ) {
            if (node.parent.type === T.AST_NODE_TYPES.VariableDeclarator) {
              return (node.parent.id as T.Identifier).name;
            }
          }

          if (node.parent.type === T.AST_NODE_TYPES.CallExpression) {
            return (node.parent.callee as T.Identifier).name;
          }

          return node.id?.name;
        })();

        // skip non components
        if (fnName?.at(0)?.toUpperCase() !== fnName?.at(0)) return;

        const body = node.body;
        if (body.type !== T.AST_NODE_TYPES.BlockStatement) return;

        let hasJsx = false;

        for (const statement of body.body) {
          if (statement.type !== T.AST_NODE_TYPES.ReturnStatement) continue;

          if (statement.argument?.type === T.AST_NODE_TYPES.LogicalExpression) {
            if (
              statement.argument.left.type === JSXElement ||
              statement.argument.right.type === JSXElement
            ) {
              hasJsx = true;
              break;
            }
          }

          if (statement.argument?.type === T.AST_NODE_TYPES.ConditionalExpression) {
            if (
              statement.argument.alternate.type === JSXElement ||
              statement.argument.consequent.type === JSXElement
            ) {
              hasJsx = true;
              break;
            }
          }

          if (statement.argument?.type === JSXElement) {
            hasJsx = true;
            break;
          }
        }

        // if jsx was not found, return
        if (!hasJsx) return;

        const ifStatements = body.body.filter(
          (x) =>
            x.type === T.AST_NODE_TYPES.IfStatement ||
            (x.type === T.AST_NODE_TYPES.ReturnStatement &&
              (x.argument?.type === T.AST_NODE_TYPES.ConditionalExpression ||
                x.argument?.type === T.AST_NODE_TYPES.LogicalExpression))
        );

        if (ifStatements.length === 0) return;

        for (const statement of ifStatements) {
          context.report({
            node: statement,
            messageId: "noEarlyReturn",
          });
        }
      };

      let parent = node.parent;

      // go out until the next outer is not a function
      while (isFunction(parent)) {
        if (isFunction(parent.parent)) {
          parent = parent.parent!;
          console.log(parent);
          continue;
        }

        parent && checkEarlyReturn(parent as FunctionNode);
        return;
      }

      checkEarlyReturn(node);
    };

    return {
      FunctionDeclaration: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      FunctionExpression: onFunctionEnter,
    };
  },
});
