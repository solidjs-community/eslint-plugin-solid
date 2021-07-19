import type { Rule } from "eslint";
import { getPropertyName } from "eslint-utils";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Recommends using Solid's <For /> component for mapping an array to JSX elements.",
    },
    messages: {
      preferFor:
        "For performance, use Solid's `<For />` component or `<Index />` component for rendering lists.",
    },
  },
  create(context): Rule.RuleListener {
    return {
      "JSXExpressionContainer > CallExpression": (node) => {
        if (
          node.callee.type === "MemberExpression" &&
          getPropertyName(node.callee) === "map" &&
          node.arguments.length === 1 &&
          node.arguments[0].type.includes("FunctionExpression")
        ) {
          // Too many possible solutions to make a suggestion or fix
          context.report({
            node,
            messageId: "preferFor",
          });
        }
      },
    };
  },
};

export default rule;
