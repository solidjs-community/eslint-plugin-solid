import type { Rule } from "eslint";
import { elementType, getProp, hasProp } from "jsx-ast-utils";
import { isDOMElementName } from "../utils";

const reactSpecificProps = [
  { from: "className", to: "class" },
  { from: "htmlFor", to: "for" },
  { from: "tabIndex", to: "tabindex" },
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
        "Prevents usage of React's `className` prop on DOM elements, fixing to use `class` instead (although `className` is technically supported).",
    },
    messages: {
      preferClass: "Prefer the `class` prop over `className`.",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    const checkComponents = context.options[0]?.checkComponents ?? false;
    return {
      JSXOpeningElement(node) {
        if (!checkComponents || isDOMElementName(elementType(node))) {
          const classNameAttribute = getProp(node.attributes, "className");
          // only auto-fix if there is no class prop defined
          const fix = !hasProp(node.attributes, "class", { ignoreCase: false })
            ? (fixer) => fixer.replaceText(classNameAttribute.name, "class")
            : undefined;
          if (classNameAttribute) {
            context.report({
              node: classNameAttribute,
              messageId: "preferClass",
              fix,
            });
          }
        }
      },
    };
  },
};

export default rule;
