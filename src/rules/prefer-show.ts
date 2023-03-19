import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

const EXPENSIVE_TYPES = ["JSXElement", "JSXFragment", "Identifier"];

export default createRule({
  meta: {
    type: "problem",
    docs: {
      recommended: false,
      description:
        "Enforce using Solid's `<Show />` component for conditionally showing content. Solid's compiler covers this case, so it's a stylistic rule only.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/prefer-show.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferShowAnd: "Use Solid's `<Show />` component for conditionally showing content.",
      preferShowTernary:
        "Use Solid's `<Show />` component for conditionally showing content with a fallback.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.getSourceCode();
    const putIntoJSX = (node: T.Node): string => {
      const text = sourceCode.getText(node);
      return node.type === "JSXElement" || node.type === "JSXFragment" ? text : `{${text}}`;
    };

    const logicalExpressionHandler = (node: T.LogicalExpression) => {
      if (node.operator === "&&" && EXPENSIVE_TYPES.includes(node.right.type)) {
        context.report({
          node,
          messageId: "preferShowAnd",
          fix: (fixer) =>
            fixer.replaceText(
              node.parent?.type === "JSXExpressionContainer" &&
                node.parent.parent?.type === "JSXElement"
                ? node.parent
                : node,
              `<Show when={${sourceCode.getText(node.left)}}>${putIntoJSX(node.right)}</Show>`
            ),
        });
      }
    };
    const conditionalExpressionHandler = (node: T.ConditionalExpression) => {
      if (
        EXPENSIVE_TYPES.includes(node.consequent.type) ||
        EXPENSIVE_TYPES.includes(node.alternate.type)
      ) {
        context.report({
          node,
          messageId: "preferShowTernary",
          fix: (fixer) =>
            fixer.replaceText(
              node.parent?.type === "JSXExpressionContainer" &&
                node.parent.parent?.type === "JSXElement"
                ? node.parent
                : node,
              `<Show when={${sourceCode.getText(node.test)}} fallback={${sourceCode.getText(
                node.alternate
              )}}>${putIntoJSX(node.consequent)}</Show>`
            ),
        });
      }
    };

    return {
      JSXExpressionContainer(node) {
        if (node.parent?.type !== "JSXElement") {
          return;
        }
        if (node.expression.type === "LogicalExpression") {
          logicalExpressionHandler(node.expression);
        } else if (
          node.expression.type === "ArrowFunctionExpression" &&
          node.expression.body.type === "LogicalExpression"
        ) {
          logicalExpressionHandler(node.expression.body);
        } else if (node.expression.type === "ConditionalExpression") {
          conditionalExpressionHandler(node.expression);
        } else if (
          node.expression.type === "ArrowFunctionExpression" &&
          node.expression.body.type === "ConditionalExpression"
        ) {
          conditionalExpressionHandler(node.expression.body);
        }
      },
    };
  },
});
