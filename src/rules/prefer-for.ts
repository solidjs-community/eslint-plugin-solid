import { TSESTree as T, ESLintUtils, ASTUtils } from "@typescript-eslint/utils";
import { isFunctionNode } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const { getPropertyName } = ASTUtils;

export default createRule({
  meta: {
    type: "problem",
    docs: {
      recommended: "error",
      description:
        "Enforce using Solid's `<For />` component for mapping an array to JSX elements.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/prefer-for.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferFor:
        "Use Solid's `<For />` component for efficiently rendering lists. Array#map causes DOM elements to be recreated.",
      preferForOrIndex:
        "Use Solid's `<For />` component or `<Index />` component for rendering lists. Array#map causes DOM elements to be recreated.",
    },
  },
  defaultOptions: [],
  create(context) {
    const reportPreferFor = (node: T.CallExpression) => {
      const jsxExpressionContainerNode = node.parent as T.JSXExpressionContainer;
      const arrayNode = (node.callee as T.MemberExpression).object;
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
      CallExpression(node) {
        const callOrChain = node.parent?.type === "ChainExpression" ? node.parent : node;
        if (
          callOrChain.parent?.type === "JSXExpressionContainer" &&
          callOrChain.parent.parent?.type === "JSXElement"
        ) {
          // check for Array.prototype.map in JSX
          if (
            node.callee.type === "MemberExpression" &&
            getPropertyName(node.callee) === "map" &&
            node.arguments.length === 1 && // passing thisArg to Array.prototype.map is rare, deopt in that case
            isFunctionNode(node.arguments[0])
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
        }
      },
    };
  },
});
