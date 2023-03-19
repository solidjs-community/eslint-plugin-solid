import { ESLintUtils, TSESTree as T } from "@typescript-eslint/utils";
import { hasProp, propName } from "jsx-ast-utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "preferClasslist";
type Options = [{ classnames?: Array<string> }?];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      recommended: false,
      description:
        "Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/prefer-classlist.md",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          classnames: {
            type: "array",
            description: "An array of names to treat as `classnames` functions",
            default: ["cn", "clsx", "classnames"],
            items: {
              type: "string",
              minItems: 1,
              uniqueItems: true,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferClasslist:
        "The classlist prop should be used instead of {{ classnames }} to efficiently set classes based on an object.",
    },
    deprecated: true,
  },
  defaultOptions: [],
  create(context) {
    const classnames = context.options[0]?.classnames ?? ["cn", "clsx", "classnames"];
    return {
      JSXAttribute(node) {
        if (
          ["class", "className"].indexOf(propName(node)) === -1 ||
          hasProp((node.parent as T.JSXOpeningElement | undefined)?.attributes, "classlist", {
            ignoreCase: false,
          })
        ) {
          return;
        }
        if (node.value?.type === "JSXExpressionContainer") {
          const expr = node.value.expression;
          if (
            expr.type === "CallExpression" &&
            expr.callee.type === "Identifier" &&
            classnames.indexOf(expr.callee.name) !== -1 &&
            expr.arguments.length === 1 &&
            expr.arguments[0].type === "ObjectExpression"
          ) {
            context.report({
              node,
              messageId: "preferClasslist",
              data: {
                classnames: expr.callee.name,
              },
              fix: (fixer) => {
                const attrRange = node.range;
                const objectRange = expr.arguments[0].range;
                return [
                  fixer.replaceTextRange([attrRange[0], objectRange[0]], "classlist={"),
                  fixer.replaceTextRange([objectRange[1], attrRange[1]], "}"),
                ];
              },
            });
          }
        }
      },
    };
  },
});
