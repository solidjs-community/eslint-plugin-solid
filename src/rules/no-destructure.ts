/* eslint-disable */
import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "",
    },
    messages: {
      prefer: "",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    return {};
  },
};

export default rule;
