/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { ESLintUtils } from "@typescript-eslint/utils";
import { findParent, isFunctionNode, getSolidSourceRegex, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "moduleScopePrimitive";
type Options = [];

const REACTIVE_PRIMITIVES = [
  "createSignal",
  "createMemo",
  "createStore",
  "createEffect",
  "createRenderEffect",
  "createOptimistic",
  "createOptimisticStore",
  "createProjection",
];

/*
 * Reactive state created at module scope is shared across every request when
 * server rendering, leaking one user's state into another's response. It is a
 * valid pattern in client-only apps, which is why this rule is only enabled
 * in the strict config. Wrapping in `createRoot` (or any function) is the
 * deliberate escape hatch and is not flagged.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow reactive primitives at module scope, where state is shared across SSR requests.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-module-scope-reactive-primitive.md",
    },
    schema: [],
    messages: {
      moduleScopePrimitive:
        "{{name}} at module scope creates state shared across all SSR requests. Create it inside a component or provider, or wrap it in `createRoot` if module-level state is intentional (client-only).",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));

    return {
      ImportDeclaration: handleImportDeclaration,
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        const name = matchImport(REACTIVE_PRIMITIVES, node.callee.name);
        if (!name) return;
        if (findParent(node, isFunctionNode) == null) {
          context.report({
            node,
            messageId: "moduleScopePrimitive",
            data: { name: node.callee.name },
          });
        }
      },
    };
  },
});
