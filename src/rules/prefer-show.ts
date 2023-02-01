import { TSESLint, TSESTree as T } from "@typescript-eslint/utils";

const EXPENSIVE_TYPES = ["JSXElement", "JSXFragment", "Identifier"];

const rule: TSESLint.RuleModule<"preferShowAnd" | "preferShowTernary", []> = {
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
  create(context) {
    const sourceCode = context.getSourceCode();
    const putIntoJSX = (node: T.Node): string => {
      const text = sourceCode.getText(node);
      return node.type === "JSXElement" || node.type === "JSXFragment" ? text : `{${text}}`;
    };

    return {
      "JSXElement > JSXExpressionContainer > LogicalExpression": (node: T.LogicalExpression) => {
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
      },
      "JSXElement > JSXExpressionContainer > ConditionalExpression": (
        node: T.ConditionalExpression
      ) => {
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
      },
    };
  },
};

export default rule;
