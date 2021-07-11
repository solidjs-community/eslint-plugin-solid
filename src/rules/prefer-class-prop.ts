import type { Rule } from "eslint";
import { elementType, getProp, hasProp } from "jsx-ast-utils";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
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
    return {
      JSXOpeningElement(node) {
        if (isDOMElementName(elementType(node))) {
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

function isDOMElementName(name: string) {
  return name === name.toLowerCase();
}

export default rule;
