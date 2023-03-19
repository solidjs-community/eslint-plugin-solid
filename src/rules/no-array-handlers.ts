import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { isDOMElementName, trace } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

export default createRule({
  meta: {
    type: "problem",
    docs: {
      recommended: false,
      description: "Disallow usage of type-unsafe event handlers.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/no-array-handlers.md",
    },
    schema: [],
    messages: {
      noArrayHandlers: "Passing an array as an event handler is potentially type-unsafe.",
    },
  },
  defaultOptions: [],
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

        const isNamespacedHandler =
          node.name.type === "JSXNamespacedName" && node.name.namespace.name === "on";
        const isNormalEventHandler =
          node.name.type === "JSXIdentifier" && /^on[a-zA-Z]/.test(node.name.name);

        if (
          (isNamespacedHandler || isNormalEventHandler) &&
          node.value?.type === "JSXExpressionContainer" &&
          trace(node.value.expression, context.getScope()).type === "ArrayExpression"
        ) {
          // Warn if passed an array
          context.report({
            node,
            messageId: "noArrayHandlers",
          });
        }
      },
    };
  },
});
