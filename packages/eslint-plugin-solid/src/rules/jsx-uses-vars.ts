/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { markVariableAsUsed } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

/*
 * This rule is lifted almost verbatim from eslint-plugin-react's
 * jsx-uses-vars rule under the MIT license. Thank you for your work!
 * Solid's custom directives are also handled.
 */

export default createRule({
  meta: {
    type: "problem",
    docs: {
      // eslint-disable-next-line eslint-plugin/require-meta-docs-description
      description: "Prevent variables used in JSX from being marked as unused.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/jsx-uses-vars.md",
    },
    schema: [],
    // eslint-disable-next-line eslint-plugin/prefer-message-ids
    messages: {},
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        let parent: T.JSXTagNameExpression;
        switch (node.name.type) {
          case "JSXNamespacedName": // <Foo:Bar>
            return;
          case "JSXIdentifier": // <Foo>
            markVariableAsUsed(context, node.name.name, node.name);
            break;
          case "JSXMemberExpression": // <Foo...Bar>
            parent = node.name.object;
            while (parent?.type === "JSXMemberExpression") {
              parent = parent.object;
            }
            if (parent.type === "JSXIdentifier") {
              markVariableAsUsed(context, parent.name, parent);
            }
            break;
        }
      },
      "JSXAttribute > JSXNamespacedName": (node: T.JSXNamespacedName) => {
        // <Element use:X /> applies the `X` custom directive to the element, where `X` must be an identifier in scope.
        if (
          node.namespace?.type === "JSXIdentifier" &&
          node.namespace.name === "use" &&
          node.name?.type === "JSXIdentifier"
        ) {
          markVariableAsUsed(context, node.name.name, node.name);
        }
      },
    };
  },
});
