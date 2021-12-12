import type { Rule } from "eslint";
import { getPropertyName } from "eslint-utils";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using Solid's `<For />` component for mapping an array to JSX elements.",
      url: "https://github.com/joshwilsonvu/eslint-plugin-solid/blob/main/docs/prefer-for.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferFor: "Use Solid's `<For />` component for efficiently rendering lists.",
      preferForOrIndex:
        "Use Solid's `<For />` component or `<Index />` component for rendering lists.",
    },
  },
  create(context): Rule.RuleListener {
    const reportPreferFor = (node) => {
      const jsxExpressionContainerNode = node.parent;
      const arrayNode = node.callee.object;
      const mapFnNode = node.arguments[0];
      context.report({
        node,
        messageId: "preferFor",
        fix: (fixer) => {
          const beforeArray: [number, number] = [
            jsxExpressionContainerNode.range[0],
            arrayNode.range[0],
          ];
          const betweenArrayAndMapFn: [number, number] = [arrayNode.range[1], mapFnNode.range[0]];
          const afterMapFn: [number, number] = [
            mapFnNode.range[1],
            jsxExpressionContainerNode.range[1],
          ];
          // We can insert the <For /> component
          return [
            fixer.replaceTextRange(beforeArray, "<For each={"),
            fixer.replaceTextRange(betweenArrayAndMapFn, "}>{"),
            fixer.replaceTextRange(afterMapFn, "}</For>"),
          ];
        },
      });
    };

    return {
      "JSXElement > JSXExpressionContainer > CallExpression": (node) => {
        if (
          node.callee.type === "MemberExpression" &&
          getPropertyName(node.callee) === "map" &&
          node.arguments.length === 1 && // passing thisArg to Array.prototype.map is rare, deopt in that case
          node.arguments[0].type.includes("FunctionExpression")
        ) {
          const mapFnNode = node.arguments[0];
          if (mapFnNode.params.length === 1 && mapFnNode.params[0].type !== "RestElement") {
            // The map fn doesn't take an index param, so it can't possibly be an index-keyed list. Use <For />.
            // The returned JSX, if it's coming from React, will have an unnecessary `key` prop to be removed in
            // the useless-keys rule.
            reportPreferFor(node);
          } else {
            // Too many possible solutions to make a suggestion or fix
            context.report({
              node,
              messageId: "preferForOrIndex",
            });
          }
        }
      },
    };
  },
};

export default rule;
