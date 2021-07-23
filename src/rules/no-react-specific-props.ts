import type { Rule } from "eslint";
import { elementType, getProp, hasProp } from "jsx-ast-utils";
import { isDOMElementName } from "../utils";

const reactSpecificProps = [
  { from: "className", to: "class" },
  { from: "htmlFor", to: "for" },
];

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          // don't just check DOM elements, check components (starting with uppercase letter) too
          checkComponents: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
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
    return {
      JSXOpeningElement(node) {
        for (const { from, to } of reactSpecificProps) {
          const classNameAttribute = getProp(node.attributes, from);
          // only auto-fix if there is no class prop defined
          const fix = !hasProp(node.attributes, "class", { ignoreCase: false })
            ? (fixer) => fixer.replaceText(classNameAttribute.name, to)
            : undefined;
          if (classNameAttribute) {
            context.report({
              node: classNameAttribute,
              messageId: "prefer",
              data: { from, to },
              fix,
            });
          }
        }
      },
    };
  },
};

export default rule;
