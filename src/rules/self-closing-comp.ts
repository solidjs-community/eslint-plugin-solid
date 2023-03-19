import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { isDOMElementName } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

function isComponent(node: T.JSXOpeningElement) {
  return (
    (node.name.type === "JSXIdentifier" && !isDOMElementName(node.name.name)) ||
    node.name.type === "JSXMemberExpression"
  );
}

const voidDOMElementRegex =
  /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;
function isVoidDOMElementName(name: string) {
  return voidDOMElementRegex.test(name);
}

function childrenIsEmpty(node: T.JSXOpeningElement) {
  return (node.parent as T.JSXElement).children.length === 0;
}

function childrenIsMultilineSpaces(node: T.JSXOpeningElement) {
  const childrens = (node.parent as T.JSXElement).children;

  return (
    childrens.length === 1 &&
    childrens[0].type === "JSXText" &&
    childrens[0].value.indexOf("\n") !== -1 &&
    childrens[0].value.replace(/(?!\xA0)\s/g, "") === ""
  );
}

type MessageIds = "selfClose" | "dontSelfClose";
type Options = [{ component?: "all" | "none"; html?: "all" | "void" | "none" }?];

/**
 * This rule is adapted from eslint-plugin-react's self-closing-comp rule under the MIT license,
 * with some enhancements. Thank you for your work!
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "layout",
    docs: {
      description: "Disallow extra closing tags for components without children.",
      recommended: "warn",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/self-closing-comp.md",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "which Solid components should be self-closing when possible",
            enum: ["all", "none"],
            default: "all",
          },
          html: {
            type: "string",
            description: "which native elements should be self-closing when possible",
            enum: ["all", "void", "none"],
            default: "all",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      selfClose: "Empty components are self-closing.",
      dontSelfClose: "This element should not be self-closing.",
    },
  },
  defaultOptions: [],
  create(context) {
    function shouldBeSelfClosedWhenPossible(node: T.JSXOpeningElement): boolean {
      if (isComponent(node)) {
        const whichComponents = context.options[0]?.component ?? "all";
        return whichComponents === "all";
      } else if (node.name.type === "JSXIdentifier" && isDOMElementName(node.name.name)) {
        const whichComponents = context.options[0]?.html ?? "all";
        switch (whichComponents) {
          case "all":
            return true;
          case "void":
            return isVoidDOMElementName(node.name.name);
          case "none":
            return false;
        }
      }
      return true; // shouldn't encounter
    }

    return {
      JSXOpeningElement(node) {
        const canSelfClose = childrenIsEmpty(node) || childrenIsMultilineSpaces(node);
        if (canSelfClose) {
          const shouldSelfClose = shouldBeSelfClosedWhenPossible(node);
          if (shouldSelfClose && !node.selfClosing) {
            context.report({
              node,
              messageId: "selfClose",
              fix(fixer) {
                // Represents the last character of the JSXOpeningElement, the '>' character
                const openingElementEnding = node.range[1] - 1;
                // Represents the last character of the JSXClosingElement, the '>' character
                const closingElementEnding = (node.parent as T.JSXElement).closingElement!.range[1];

                // Replace />.*<\/.*>/ with '/>'
                const range = [openingElementEnding, closingElementEnding] as const;
                return fixer.replaceTextRange(range, " />");
              },
            });
          } else if (!shouldSelfClose && node.selfClosing) {
            context.report({
              node,
              messageId: "dontSelfClose",
              fix(fixer) {
                const sourceCode = context.getSourceCode();
                const tagName = context.getSourceCode().getText(node.name);
                // Represents the last character of the JSXOpeningElement, the '>' character
                const selfCloseEnding = node.range[1];
                // Replace ' />' or '/>' with '></${tagName}>'
                const lastTokens = sourceCode.getLastTokens(node, { count: 3 }); // JSXIdentifier, '/', '>'
                const isSpaceBeforeSelfClose = sourceCode.isSpaceBetween?.(
                  lastTokens[0],
                  lastTokens[1]
                );
                const range = [
                  isSpaceBeforeSelfClose ? selfCloseEnding - 3 : selfCloseEnding - 2,
                  selfCloseEnding,
                ] as const;
                return fixer.replaceTextRange(range, `></${tagName}>`);
              },
            });
          }
        }
      },
    };
  },
});
