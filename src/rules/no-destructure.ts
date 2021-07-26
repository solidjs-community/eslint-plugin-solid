import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevents usage of React-specific `className`/`htmlFor` props (though they are supported for compatibility).",
    },
    messages: {
      prefer: "Prefer the `{{ to }}` prop over `{{ from }}`.",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    return {};
  },
};
