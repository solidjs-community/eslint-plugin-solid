/* eslint-disable */
// @ts-nocheck
import { TSESLint, TSESTree as T, ASTUtils } from "@typescript-eslint/utils";
import { Rule } from "eslint";
import { getProp } from "jsx-ast-utils";
import { isFunctionNode } from "../utils";

const {} = ASTUtils;

const rule: TSESLint.RuleModule<"preferFor" | "preferForOrIndex", []> = {
  meta: {
    type: "problem",
    docs: {
      recommended: "error",
      description:
        "Enforce using Solid's `<For />` component for mapping an array to JSX elements.",
      url: "https://github.com/joshwilsonvu/eslint-plugin-solid/blob/main/docs/prefer-for.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferFor: "Use Solid's `<For />` component for efficiently rendering lists.",
      preferForOrIndex:
        "Use Solid's `<For />` component or `<Index />` component for rendering lists.",
    },
  },
  create(context) {
    const esTreeNodeToTSNodeMap = context.parserServices?.esTreeNodeToTSNodeMap;
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }
        const keyAttribute = getProp(node.attributes, "key");
        const fix: TSESLint.ReportFixFunction = (fixer) => {};
        if (keyAttribute) {
          if (/^[a-z]/.test(node.name.name)) {
          }
        }
      },
    };
  },
};
