import { TSESTree as T, TSESLint } from "@typescript-eslint/utils";
import { isDOMElementName, trace } from "../utils";

const rule: TSESLint.RuleModule<"noArrayHandlers", []> = {
  meta: {
    type: "problem",
    docs: {
      recommended: false,
      description: "Disallow usage of unsafe event handlers.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/no-array-handlers.md",
    },
    schema: [],
    messages: { noArrayHandlers: "Passing an array as an event handler is potentially unsafe." },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const openingElement = node.parent as T.JSXOpeningElement;
        if (
          openingElement.name.type !== "JSXIdentifier" ||
          !isDOMElementName(openingElement.name.name)
        ) {
          return; // bail if this is not a DOM/SVG element or web component
        }

        if (node.name.type === "JSXNamespacedName") {
          if (
            node.name.namespace.name === "on" &&
            node.value?.type === "JSXExpressionContainer" &&
            node.value.expression.type === "ArrayExpression"
          ) {
            // Handling events that start with "on:"
            context.report({
              node,
              messageId: "noArrayHandlers",
            });
          }
          return; // bali if it's not an event namespace
        }

        // string name of the name node
        const { name } = node.name;

        if (!/^on[a-zA-Z].*$/.test(name)) {
          return; // bail if Solid doesn't consider the prop name an event handler
        }

        if (node.value?.type === "JSXExpressionContainer") {
          if (node.value.expression.type === "ArrayExpression") {
            // If passed an array
            context.report({
              node,
              messageId: "noArrayHandlers",
            });
          } else if (node.value.expression.type === "Identifier") {
            const traced = trace(node.value.expression, context.getScope());
            if (traced.type === "ArrayExpression") {
              context.report({
                node,
                messageId: "noArrayHandlers",
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
