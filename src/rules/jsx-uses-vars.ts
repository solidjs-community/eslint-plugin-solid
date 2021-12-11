import type { Rule } from "eslint";

/*
 * This rule is lifted almost verbatim from eslint-plugin-react's
 * jsx-uses-vars rule under the MIT license. Thank you for your work!
 * Solid's custom directives are also handled.
 */

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      // eslint-disable-next-line eslint-plugin/require-meta-docs-description
      description: "Prevent variables used in JSX from being marked as unused.",
    },
    schema: [],
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.namespace) {
          return; // <Foo:Bar>
        }
        if (node.name.name) {
          // <Foo>
          context.markVariableAsUsed(node.name.name);
        } else if (node.name.object) {
          // <Foo...Bar>
          let parent = node.name.object;
          while (parent.object) {
            parent = parent.object;
          }
          context.markVariableAsUsed(parent.name);
        }
      },
      "JSXAttribute > JSXNamespacedName": (node) => {
        // <Element use:X /> applies the `X` custom directive to the element, where `X` must be an identifier in scope.
        if (
          node.namespace?.type === "JSXIdentifier" &&
          node.namespace.name === "use" &&
          node.name?.type === "JSXIdentifier"
        ) {
          context.markVariableAsUsed(node.name.name);
        }
      },
    };
  },
};

export default rule;
