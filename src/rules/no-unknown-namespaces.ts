import type { Rule } from "eslint";

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr"];
const styleNamespaces = ["style", "class"];

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensures that only Solid-specific namespaced attribute names (i.e. 'on:' in <div on:click={...} />) are used.",
    },
    messages: {
      unknown: `'{{namespace}}:' is not one of Solid's special prefixes for JSX attributes (${knownNamespaces
        .map((n) => `'${n}:'`)
        .join(", ")}).`,
      style:
        "Using the '{{namespace}}:' special prefix is potentially confusing, prefer the '{{namespace}}' prop instead.",
    },
  },
  create(context): Rule.RuleListener {
    return {
      "JSXAttribute > JSXNamespacedName": (node) => {
        const namespace = node.namespace?.name;
        if (!knownNamespaces.includes(namespace)) {
          if (styleNamespaces.includes(namespace)) {
            context.report({
              node,
              messageId: "style",
              data: { namespace },
            });
          } else {
            context.report({
              node,
              messageId: "unknown",
              data: { namespace },
            });
          }
        }
      },
    };
  },
};

export default rule;
