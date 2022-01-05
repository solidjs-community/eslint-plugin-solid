import type { TSESLint, TSESTree as T } from "@typescript-eslint/experimental-utils";

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr"];
const styleNamespaces = ["style", "class"];

const rule: TSESLint.RuleModule<"unknown" | "style", []> = {
  meta: {
    type: "problem",
    docs: {
      recommended: "error",
      description:
        "Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).",
      url: "https://github.com/joshwilsonvu/eslint-plugin-solid/blob/main/docs/no-unknown-namespaces.md",
    },
    schema: [],
    messages: {
      unknown: `'{{namespace}}:' is not one of Solid's special prefixes for JSX attributes (${knownNamespaces
        .map((n) => `'${n}:'`)
        .join(", ")}).`,
      style:
        "Using the '{{namespace}}:' special prefix is potentially confusing, prefer the '{{namespace}}' prop instead.",
    },
  },
  create(context) {
    return {
      "JSXAttribute > JSXNamespacedName": (node: T.JSXNamespacedName) => {
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
