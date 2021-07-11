import type { Rule } from "eslint";
import { hasProp, propName } from "jsx-ast-utils";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          // an array of names to treat as classnames functions, defaults to ["cn", "clsx", "classnames"]
          classnames: {
            type: "array",
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
    docs: {
      description:
        "Recommends using the classlist prop over importing a classnames helper. The classlist prop accepts an object { [class: string]: boolean } just like classnames.",
    },
    messages: {
      preferClasslist:
        "The classlist prop should be used instead of {{ classnames }} to efficiently set classes based on an object.",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    const classnames = context.options[0]?.classnames ?? [
      "cn",
      "clsx",
      "classnames",
    ];
    return {
      JSXAttribute(node) {
        if (
          ["class", "className"].indexOf(propName(node)) === -1 ||
          hasProp(node.parent.attributes, "classlist", { ignoreCase: false })
        ) {
          return;
        }
        if (node.value.type === "JSXExpressionContainer") {
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
                  fixer.replaceTextRange(
                    [attrRange[0], objectRange[0]],
                    "classlist={"
                  ),
                  fixer.replaceTextRange([objectRange[1], attrRange[1]], "}"),
                ];
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
