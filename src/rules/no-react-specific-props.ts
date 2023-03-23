import { TSESLint, ESLintUtils } from "@typescript-eslint/utils";
import { getProp, hasProp } from "jsx-ast-utils";
import { isDOMElementName } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

const reactSpecificProps = [
  { from: "className", to: "class" },
  { from: "htmlFor", to: "for" },
];

export default createRule({
  meta: {
    type: "problem",
    docs: {
      recommended: "warn",
      description:
        "Disallow usage of React-specific `className`/`htmlFor` props, which were deprecated in v1.4.0.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/no-react-specific-props.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      prefer: "Prefer the `{{ to }}` prop over the deprecated `{{ from }}` prop.",
      noUselessKey: "Elements in a <For> or <Index> list do not need a key prop.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        for (const { from, to } of reactSpecificProps) {
          const classNameAttribute = getProp(node.attributes, from);
          if (classNameAttribute) {
            // only auto-fix if there is no class prop defined
            const fix = !hasProp(node.attributes, to, { ignoreCase: false })
              ? (fixer: TSESLint.RuleFixer) => fixer.replaceText(classNameAttribute.name, to)
              : undefined;

            context.report({
              node: classNameAttribute,
              messageId: "prefer",
              data: { from, to },
              fix,
            });
          }
        }
        if (node.name.type === "JSXIdentifier" && isDOMElementName(node.name.name)) {
          const keyProp = getProp(node.attributes, "key");
          if (keyProp) {
            // no DOM element has a 'key' prop, so we can assert that this is a holdover from React.
            context.report({
              node: keyProp,
              messageId: "noUselessKey",
              fix: (fixer) => fixer.remove(keyProp),
            });
          }
        }
      },
    };
  },
});
