import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

/*
 * This rule is adapted from eslint-plugin-react's jsx-no-duplicate-props rule under
 * the MIT license, with some enhancements. Thank you for your work!
 */

type MessageIds = "noDuplicateProps" | "noDuplicateClass" | "noDuplicateChildren";
type Options = [{ ignoreCase?: boolean }?];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      recommended: "error",
      description: "Disallow passing the same prop twice in JSX.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/jsx-no-duplicate-props.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          ignoreCase: {
            type: "boolean",
            description: "Consider two prop names differing only by case to be the same.",
            default: false,
          },
        },
      },
    ],
    messages: {
      noDuplicateProps: "Duplicate props are not allowed.",
      noDuplicateClass:
        "Duplicate `class` props are not allowed; while it might seem to work, it can break unexpectedly. Use `classList` instead.",
      noDuplicateChildren: "Using {{used}} at the same time is not allowed.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        const ignoreCase = context.options[0]?.ignoreCase ?? false;
        const props = new Set();
        const checkPropName = (name: string, node: T.Node) => {
          if (ignoreCase || name.startsWith("on")) {
            name = name
              .toLowerCase()
              .replace(/^on(?:capture)?:/, "on")
              .replace(/^(?:attr|prop):/, "");
          }
          if (props.has(name)) {
            context.report({
              node,
              messageId: name === "class" ? "noDuplicateClass" : "noDuplicateProps",
            });
          }
          props.add(name);
        };

        node.attributes.forEach((decl) => {
          if (decl.type === "JSXSpreadAttribute") {
            if (decl.argument.type === "ObjectExpression") {
              for (const prop of decl.argument.properties) {
                if (prop.type === "Property") {
                  if (prop.key.type === "Identifier") {
                    checkPropName(prop.key.name, prop.key);
                  } else if (prop.key.type === "Literal") {
                    checkPropName(String(prop.key.value), prop.key);
                  }
                }
              }
            }
          } else {
            const name =
              decl.name.type === "JSXNamespacedName"
                ? `${decl.name.namespace.name}:${decl.name.name.name}`
                : decl.name.name;
            checkPropName(name, decl.name);
          }
        });

        const hasChildrenProp = props.has("children");
        const hasChildren = (node.parent as T.JSXElement | T.JSXFragment).children.length > 0;
        const hasInnerHTML = props.has("innerHTML") || props.has("innerhtml");
        const hasTextContent = props.has("textContent") || props.has("textContent");
        const used = [
          hasChildrenProp && "`props.children`",
          hasChildren && "JSX children",
          hasInnerHTML && "`props.innerHTML`",
          hasTextContent && "`props.textContent`",
        ].filter(Boolean);
        if (used.length > 1) {
          context.report({
            node,
            messageId: "noDuplicateChildren",
            data: {
              used: used.join(", "),
            },
          });
        }
      },
    };
  },
});
