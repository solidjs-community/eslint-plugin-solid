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
      notHtml:
        "the string passed to innerHTML does not appear to be valid HTML",
      useInnerText: "for text content, using innerText is clearer and safer",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    return {
      JSXAttribute(node) {
        if (propName(node) !== "innerHTML") {
          return;
        }
        if (context.options[0]?.allowStatic) {
          const innerHtmlNode =
            node.value.type === "JSXExpressionContainer"
              ? node.value.expression
              : node.value;
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
