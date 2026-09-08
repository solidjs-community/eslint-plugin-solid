/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { getSourceCode } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "booleanValue" | "booleanExpression" | "useStrings";
type Options = [];

interface AttributePolicy {
  /** The string tokens meaning on/off for this attribute. */
  tokens: [trueToken: string, falseToken: string];
  /** Why a boolean/bare `true` misbehaves; undefined when `true` is harmless. */
  trueBehavior?: string;
  /** Why a boolean `false` misbehaves; the primary hazard for every entry. */
  falseBehavior: string;
}

const INHERITED = (token: string) =>
  `a boolean false removes the attribute, leaving the inherited state rather than "${token}"`;
const ARIA_FALSE =
  'a boolean false removes the attribute, producing the "undefined" state rather than "false"';
const ARIA_TRUE =
  'a boolean true writes an empty attribute value, which assistive technologies do not reliably treat as "true"';

/**
 * Enumerated attributes whose boolean forms misbehave. Deliberately excludes
 * ARIA attributes that default to "false" (aria-disabled, aria-busy, ...):
 * for those, removing the attribute IS the false state, so a boolean false is
 * harmless and flagging it would be noise.
 */
const ATTRIBUTES = new Map<string, AttributePolicy>([
  [
    "draggable",
    {
      tokens: ["true", "false"],
      trueBehavior:
        'a bare or boolean-true draggable writes an empty value, which is invalid and behaves as "auto"',
      falseBehavior: 'a boolean false removes the attribute, which behaves as "auto", not "false"',
    },
  ],
  ["spellcheck", { tokens: ["true", "false"], falseBehavior: INHERITED("false") }],
  ["contenteditable", { tokens: ["true", "false"], falseBehavior: INHERITED("false") }],
  ["translate", { tokens: ["yes", "no"], falseBehavior: INHERITED("no") }],
  // ARIA tristate/undefined-default states: absence means "undefined" (not
  // checkable / not expandable / hidden-ness computed from the tree), which is
  // a different state from an explicit "false".
  [
    "aria-checked",
    { tokens: ["true", "false"], trueBehavior: ARIA_TRUE, falseBehavior: ARIA_FALSE },
  ],
  [
    "aria-expanded",
    { tokens: ["true", "false"], trueBehavior: ARIA_TRUE, falseBehavior: ARIA_FALSE },
  ],
  [
    "aria-hidden",
    { tokens: ["true", "false"], trueBehavior: ARIA_TRUE, falseBehavior: ARIA_FALSE },
  ],
  [
    "aria-pressed",
    { tokens: ["true", "false"], trueBehavior: ARIA_TRUE, falseBehavior: ARIA_FALSE },
  ],
  [
    "aria-selected",
    { tokens: ["true", "false"], trueBehavior: ARIA_TRUE, falseBehavior: ARIA_FALSE },
  ],
]);

const BOOLEAN_OPERATORS = new Set([
  "===",
  "!==",
  "==",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "in",
  "instanceof",
]);

/** Is this expression provably boolean-valued without type information? */
const isProvablyBoolean = (node: T.Node): boolean => {
  switch (node.type) {
    case "Literal":
      return typeof node.value === "boolean";
    case "UnaryExpression":
      return node.operator === "!";
    case "BinaryExpression":
      return BOOLEAN_OPERATORS.has(node.operator);
    case "LogicalExpression":
      return (
        node.operator !== "??" && isProvablyBoolean(node.left) && isProvablyBoolean(node.right)
      );
    default:
      return false;
  }
};

/*
 * Enumerated attributes look boolean but aren't: they want literal string
 * tokens ("true"/"false", or "yes"/"no" for translate). Solid's attribute
 * path removes the attribute entirely when the value is `false` and writes an
 * empty string for `true`, so booleans silently produce a different state
 * than the matching token would. The rule only reports values that provably
 * misbehave: boolean literals in the broken direction, bare `draggable`, and
 * expressions that are boolean by construction. Dynamic values whose type
 * can't be proven locally are left alone.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow boolean values on enumerated attributes like draggable and tristate aria-*, which take string tokens — a boolean false removes the attribute instead of writing "false".',
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-boolean-enumerated-attribute.md",
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [],
    messages: {
      booleanValue:
        "'{{name}}' is an enumerated attribute, not a boolean one: {{behavior}}. Use the string \"{{token}}\".",
      booleanExpression:
        "'{{name}}' is an enumerated attribute, not a boolean one: {{behavior}}. Map the expression to its string tokens.",
      useStrings: 'Write the string tokens: {expr ? "{{trueToken}}" : "{{falseToken}}"}.',
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = getSourceCode(context);

    return {
      JSXAttribute(node) {
        // Only native elements: components receive these as ordinary props.
        const element = node.parent;
        if (
          element?.type !== "JSXOpeningElement" ||
          element.name.type !== "JSXIdentifier" ||
          !/^[a-z]/.test(element.name.name)
        ) {
          return;
        }
        if (node.name.type !== "JSXIdentifier") return;
        const name = node.name.name;
        const policy = ATTRIBUTES.get(name);
        if (!policy) return;
        const [trueToken, falseToken] = policy.tokens;

        // A bare attribute compiles to `true`, i.e. an empty attribute value —
        // valid for the empty-string-means-true attributes, broken elsewhere.
        if (!node.value) {
          if (policy.trueBehavior) {
            context.report({
              node,
              messageId: "booleanValue",
              data: { name, behavior: policy.trueBehavior, token: trueToken },
              fix: (fixer) => fixer.insertTextAfter(node, `="${trueToken}"`),
            });
          }
          return;
        }

        if (node.value.type !== "JSXExpressionContainer") return;
        const expression = node.value.expression;

        if (expression.type === "Literal" && typeof expression.value === "boolean") {
          const behavior = expression.value ? policy.trueBehavior : policy.falseBehavior;
          if (!behavior) return; // boolean true is harmless here
          const token = expression.value ? trueToken : falseToken;
          context.report({
            node: node.value,
            messageId: "booleanValue",
            data: { name, behavior, token },
            fix: (fixer) => fixer.replaceText(node.value!, `"${token}"`),
          });
          return;
        }

        if (isProvablyBoolean(expression)) {
          context.report({
            node: node.value,
            messageId: "booleanExpression",
            data: { name, behavior: policy.falseBehavior },
            suggest: [
              {
                messageId: "useStrings",
                data: { trueToken, falseToken },
                fix: (fixer) =>
                  fixer.replaceText(
                    node.value!,
                    `{${sourceCode.getText(expression)} ? "${trueToken}" : "${falseToken}"}`
                  ),
              },
            ],
          });
        }
      },
    };
  },
});
