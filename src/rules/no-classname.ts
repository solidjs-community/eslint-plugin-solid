import type { Rule } from "eslint";

function isDOMElementName(name: string) {
  return name === name.toLowerCase();
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevents usage of React's `className` prop on DOM elements, fixing to use `class` instead.",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    return {
      JSXOpeningElement(node) {
        if (
          node.name.type === "JSXIdentifier" &&
          isDOMElementName(node.name.name)
        ) {
          const classNameAttribute = node.attributes.find(
            (attr) =>
              attr.type === "JSXAttribute" &&
              attr.name.type === "JSXIdentifier" &&
              attr.name.name === "className"
          );
          if (classNameAttribute) {
            context.report({
              node,
              message:
                "Unexpected usage of `className` for element '{{ el }}', did you mean `class`?",
              data: {
                el: node.name,
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
