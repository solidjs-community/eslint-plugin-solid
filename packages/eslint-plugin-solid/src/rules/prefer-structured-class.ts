import type { TSESLint } from "@typescript-eslint/utils";
import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { getSourceCode } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "manualClassString" | "useStructuredForm";
type Options = [];

/** Does this expression contain a runtime-varying part (conditional, logical, or call)? */
const containsDynamicPart = (node: T.Node): boolean => {
  switch (node.type) {
    case "ConditionalExpression":
    case "LogicalExpression":
    case "CallExpression":
      return true;
    case "BinaryExpression":
      return (
        node.operator === "+" && (containsDynamicPart(node.left) || containsDynamicPart(node.right))
      );
    case "TemplateLiteral":
      return node.expressions.some(containsDynamicPart);
    default:
      return false;
  }
};

const isStringLiteral = (node: T.Node): node is T.StringLiteral =>
  node.type === "Literal" && typeof node.value === "string";

const isEmptyString = (node: T.Node): boolean => isStringLiteral(node) && node.value === "";

/*
 * In Solid 2.0, `class` accepts arrays and objects natively
 * (`ClassValue = string | number | boolean | null | undefined |
 * Record<string, boolean> | ClassValue[]`), and toggles only the affected
 * classes. Manually-built strings — the React/classnames reflex — still work
 * but re-run the whole concatenation on every change. This rule nudges toward
 * either structured form; it imposes no preference between array and object.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce using the structured array/object forms of the `class` prop over manually-built class strings.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/prefer-structured-class.md",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      manualClassString:
        "Manually building class strings re-runs the whole expression on every change. In Solid 2.0, `class` accepts arrays and objects directly: `class={[base, { active: active() }]}`.",
      useStructuredForm: "Convert to the structured array form.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = getSourceCode(context);

    /**
     * Build a suggestion for the simple binary shape
     * `"base " + (cond ? "cls" : "")` -> `["base", cond && "cls"]`.
     * Returns null for anything more complex.
     */
    const simpleBinarySuggestion = (
      expression: T.Expression
    ): ((fixer: TSESLint.RuleFixer) => TSESLint.RuleFix) | null => {
      if (expression.type !== "BinaryExpression" || expression.operator !== "+") return null;
      const { left, right } = expression;
      if (!isStringLiteral(left) || right.type !== "ConditionalExpression") return null;
      if (!isEmptyString(right.alternate)) return null;

      const base = left.value.trim();
      if (!base) return null;
      const test = sourceCode.getText(right.test);
      const consequent = sourceCode.getText(right.consequent);
      return (fixer) =>
        fixer.replaceText(expression, `[${JSON.stringify(base)}, ${test} && ${consequent}]`);
    };

    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "class") return;
        if (node.value?.type !== "JSXExpressionContainer") return;
        const expression = node.value.expression;
        if (expression.type === "JSXEmptyExpression") return;

        let manual = false;
        if (expression.type === "TemplateLiteral") {
          // `btn-${kind}` (plain interpolation) is fine; conditionals inside are not.
          manual = expression.expressions.some(containsDynamicPart);
        } else if (expression.type === "BinaryExpression" && expression.operator === "+") {
          manual = containsDynamicPart(expression);
        } else if (
          expression.type === "CallExpression" &&
          expression.callee.type === "MemberExpression" &&
          expression.callee.property.type === "Identifier" &&
          expression.callee.property.name === "join"
        ) {
          // [..].join(" ") or [..].filter(Boolean).join(" ")
          manual = true;
        }
        if (!manual) return;

        const suggestionFix = simpleBinarySuggestion(expression);
        context.report({
          node: expression,
          messageId: "manualClassString",
          suggest: suggestionFix
            ? [{ messageId: "useStructuredForm", fix: suggestionFix }]
            : undefined,
        });
      },
    };
  },
});
