import type { Rule } from "eslint";

function isDOMElementName(name: string) {
  return name === name.toLowerCase();
}

export const message = "Prefer the `class` prop over `className`.";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevents usage of React's `className` prop on DOM elements, fixing to use `class` instead (although `className` is technically supported).",
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
          // only auto-fix if there is no class prop defined
          const fix = !node.attributes.some(
            (attr) =>
              attr.type === "JSXAttribute" &&
              attr.name.type === "JSXIdentifier" &&
              attr.name.name === "class"
          )
            ? (fixer) => fixer.replaceText(classNameAttribute.name, "class")
            : undefined;
          if (classNameAttribute) {
            context.report({
              node: classNameAttribute,
              message,
              fix,
            });
          }
        }
      },
    };
  },
};

export default rule;
