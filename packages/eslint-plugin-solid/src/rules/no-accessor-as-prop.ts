/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable } from "../compat";
import { isDOMElementName, isFunctionNode, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "accessorAsProp" | "functionAsProp";
type Options = [];

// Attributes on DOM elements that legitimately accept a function value.
const FUNCTION_ATTRIBUTES = new Set(["ref", "children"]);

// camelCase `onX` names are event handlers; lowercase `onx` names are literal
// attributes in Solid 2.0 but are solid/event-handlers' territory — skip both
// here so a single node never gets two reports.
const isOnPrefixed = (name: string) => name.length > 2 && name.startsWith("on");

/*
 * Passing an uncalled signal accessor as a DOM element attribute
 * (`<div title={count} />`) silently sets the attribute to a stringified
 * function. TypeScript flags this with a cryptic assignability error that
 * many pipelines never run (Vite builds don't typecheck); this rule is the
 * enforcement and translation layer. Unlike solid/reactivity's signal
 * tracing, any expression that resolves to a function fires here.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow passing uncalled signal accessors or other functions as value-typed DOM element attributes.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-accessor-as-prop.md",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      accessorAsProp:
        "'{{attribute}}' expects a value, but '{{name}}' is a signal accessor — call it: '{{name}}()'.",
      functionAsProp:
        "'{{attribute}}' expects a value, but this is a function; it would render as a stringified function. If it derives a value, call it.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports();

    /** Is `id` a signal accessor or plain function we can resolve statically? */
    const resolveFunctionKind = (id: T.Identifier): "accessor" | "function" | null => {
      const variable = findVariable(context, id);
      const def = variable?.defs[0];
      if (!def) return null;

      if (def.type === "FunctionName") return "function";
      if (def.type !== "Variable" || !def.node.init) return null;

      const { id: declId, init } = def.node;
      // const count = () => ...;
      if (declId.type === "Identifier" && isFunctionNode(init)) return "function";
      if (init.type !== "CallExpression" || init.callee.type !== "Identifier") return null;

      // const memo = createMemo(...)
      if (
        declId.type === "Identifier" &&
        matchImport(["createMemo", "children"], init.callee.name)
      ) {
        return "accessor";
      }
      // const [count] = createSignal(...); const [value] = createOptimistic(...)
      if (
        declId.type === "ArrayPattern" &&
        declId.elements[0]?.type === "Identifier" &&
        declId.elements[0].name === id.name &&
        matchImport(["createSignal", "createOptimistic"], init.callee.name)
      ) {
        return "accessor";
      }
      return null;
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      JSXAttribute(node) {
        // Only plain attributes on native DOM elements; namespaced attributes
        // and custom elements can legitimately carry unusual values.
        if (node.name.type !== "JSXIdentifier") return;
        const attribute = node.name.name;
        if (FUNCTION_ATTRIBUTES.has(attribute) || isOnPrefixed(attribute)) return;

        const element = node.parent as T.JSXOpeningElement;
        if (
          element.name.type !== "JSXIdentifier" ||
          !isDOMElementName(element.name.name) ||
          element.name.name.includes("-")
        ) {
          return;
        }

        if (node.value?.type !== "JSXExpressionContainer") return;
        const expression = node.value.expression;

        if (isFunctionNode(expression)) {
          context.report({ node: expression, messageId: "functionAsProp", data: { attribute } });
          return;
        }

        if (expression.type === "Identifier") {
          const kind = resolveFunctionKind(expression);
          if (kind === "accessor") {
            context.report({
              node: expression,
              messageId: "accessorAsProp",
              data: { attribute, name: expression.name },
              suggest: [
                {
                  messageId: "accessorAsProp",
                  data: { attribute, name: expression.name },
                  fix: (fixer) => fixer.insertTextAfter(expression, "()"),
                },
              ],
            });
          } else if (kind === "function") {
            context.report({
              node: expression,
              messageId: "functionAsProp",
              data: { attribute },
              suggest: [
                {
                  messageId: "functionAsProp",
                  data: { attribute },
                  fix: (fixer) => fixer.insertTextAfter(expression, "()"),
                },
              ],
            });
          }
        }
      },
    };
  },
});
