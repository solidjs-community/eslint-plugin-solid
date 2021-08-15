import type { Rule } from "eslint";
import { propName } from "jsx-ast-utils";
import { getStringIfConstant } from "eslint-utils";
import isHtml from "is-html";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          // if the innerHTML value is guaranteed to be a static string (i.e. no user input), allow it
          allowStatic: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
    docs: {
      description:
        "Prevents usage of the innerHTML attribute, which can often lead to security vulnerabilities",
    },
    messages: {
      dangerous:
        "innerHTML is dangerous; passing unsanitized input can lead to security vulnerabilities",
      conflict:
        "innerHTML should not be used on an element with child elements, as they will be overwritten",
      notHtml: "the string passed to innerHTML does not appear to be valid HTML",
      useInnerText: "for text content, using innerText is clearer and safer",
      dangerouslySetInnerHTML: "dangerouslySetInnerHTML is not supported; use innerHTML instead",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    const allowStatic = Boolean(context.options[0]?.allowStatic);
    return {
      JSXAttribute(node) {
        if (propName(node) === "dangerouslySetInnerHTML") {
          if (
            node.value.type === "JSXExpressionContainer" &&
            node.value.expression.type === "ObjectExpression" &&
            node.value.expression.properties.length === 1 &&
            ((p) =>
              p.type === "Property" && p.key.type === "Identifier" && p.key.name === "__html")(
              node.value.expression.properties[0]
            )
          ) {
            context.report({
              node,
              messageId: "dangerouslySetInnerHTML",
              fix: (fixer) => {
                const htmlProp = node.value.expression.properties[0];
                const propRange = node.range;
                const valueRange = htmlProp.value.range;
                return [
                  fixer.replaceTextRange([propRange[0], valueRange[0]], "innerHTML={"),
                  fixer.replaceTextRange([valueRange[1], propRange[1]], "}"),
                ];
              },
            });
          } else {
            context.report({
              node,
              messageId: "dangerouslySetInnerHTML",
            });
          }
          return;
        } else if (propName(node) !== "innerHTML") {
          return;
        }

        if (allowStatic) {
          const innerHtmlNode =
            node.value.type === "JSXExpressionContainer" ? node.value.expression : node.value;
          const innerHtml = getStringIfConstant(innerHtmlNode);
          if (typeof innerHtml === "string") {
            if (isHtml(innerHtml)) {
              // go up to enclosing JSXElement and check if it has children
              if (node.parent.parent.children?.length) {
                context.report({
                  node: node.parent.parent, // report error on JSXElement instead of JSXAttribute
                  messageId: "conflict",
                });
              }
            } else {
              context.report({
                node,
                messageId: "notHtml",
                suggest: [
                  {
                    fix: (fixer) => fixer.replaceText(node.name, "innerText"),
                    messageId: "useInnerText",
                  },
                ],
              });
            }
          } else {
            context.report({
              node,
              messageId: "dangerous",
            });
          }
        } else {
          context.report({
            node,
            messageId: "dangerous",
          });
        }
      },
    };
  },
};

export default rule;
