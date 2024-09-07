/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { ESLintUtils, TSESTree as T } from "@typescript-eslint/utils";
import { jsxHasProp, jsxPropName } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "preferClasslist";
type Options = [{ classnames?: Array<string> }?];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/prefer-classlist.md",
    },
    fixable: "code",
    deprecated: true,
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
            },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferClasslist:
        "The classlist prop should be used instead of {{ classnames }} to efficiently set classes based on an object.",
    },
  },
  defaultOptions: [],
  create(context) {
    const classnames = context.options[0]?.classnames ?? ["cn", "clsx", "classnames"];
    return {
      JSXAttribute(node) {
        if (
          ["class", "className"].indexOf(jsxPropName(node)) === -1 ||
          jsxHasProp(
            (node.parent as T.JSXOpeningElement | undefined)?.attributes ?? [],
            "classlist"
          )
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
