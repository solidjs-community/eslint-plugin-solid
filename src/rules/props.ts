/* eslint-disable */

import type { Rule } from "eslint";
import { elementType, getProp, hasProp } from "jsx-ast-utils";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensures that component props are evaluated lazily, not destructured, ",
    },
    messages: {},
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    return {
      "ObjectExpression > SpreadElement[argument.name=props]": (node) => {},
    };
  },
};

export default rule;
