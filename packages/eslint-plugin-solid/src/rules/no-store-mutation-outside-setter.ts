/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable } from "../compat";
import { getSolidSourceRegex, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

// Array methods that mutate their receiver in place.
const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

type MessageIds = "mutateStore" | "mutateProjection";
type Options = [];

/*
 * Store setters receive a mutable draft in Solid 2.0 (`produce` semantics by
 * default), which makes mutating the read proxy directly — `store.count++`,
 * `store.items.push(x)` — look plausible. It isn't: the proxy's write traps
 * silently ignore writes outside a draft scope, with no error or dev warning
 * of any kind — the mutation just vanishes. That silence is exactly why this
 * rule matters: lint is currently the only guardrail. Draft mutations inside
 * the setter are written through the draft parameter, a different variable,
 * so they never resolve to the store and are naturally exempt.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow mutating a store's read proxy; store state changes only through the setter's mutable draft.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-store-mutation-outside-setter.md",
    },
    schema: [],
    messages: {
      mutateStore:
        "'{{name}}' is a store's read proxy, which is read-only; this mutation is silently ignored — no error, no update, the write just vanishes. Mutate the draft inside the setter instead: `{{setter}}(draft => { ... })`.",
      mutateProjection:
        "'{{name}}' is a projection, a read-only derived store. Derive this value inside the projection function instead of mutating the result.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));

    type Target = { kind: "store"; setter: string | null } | { kind: "projection" };

    /** Resolves an identifier to the store or projection it names, if any. */
    const resolveTarget = (id: T.Identifier): Target | null => {
      const def = findVariable(context, id)?.defs[0];
      if (!def || def.type !== "Variable" || !def.node.init) return null;
      const { id: declId, init } = def.node;
      if (init.type !== "CallExpression" || init.callee.type !== "Identifier") return null;

      // const [store, setStore] = createStore(...)
      if (
        declId.type === "ArrayPattern" &&
        declId.elements[0]?.type === "Identifier" &&
        declId.elements[0].name === id.name &&
        matchImport("createStore", init.callee.name)
      ) {
        const setter = declId.elements[1]?.type === "Identifier" ? declId.elements[1].name : null;
        return { kind: "store", setter };
      }
      // const projected = createProjection(...)
      if (declId.type === "Identifier" && matchImport("createProjection", init.callee.name)) {
        return { kind: "projection" };
      }
      return null;
    };

    /** Walks a member chain (`store.a.b`) down to its base identifier. */
    const baseIdentifier = (node: T.Node): T.Identifier | null => {
      let current: T.Node = node;
      while (current.type === "MemberExpression") current = current.object;
      return current.type === "Identifier" ? current : null;
    };

    const checkMutation = (member: T.MemberExpression, reportNode: T.Node) => {
      const base = baseIdentifier(member);
      const target = base && resolveTarget(base);
      if (!target) return;
      if (target.kind === "projection") {
        context.report({
          node: reportNode,
          messageId: "mutateProjection",
          data: { name: base.name },
        });
      } else {
        context.report({
          node: reportNode,
          messageId: "mutateStore",
          data: { name: base.name, setter: target.setter ?? "setStore" },
        });
      }
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      AssignmentExpression(node) {
        if (node.left.type === "MemberExpression") checkMutation(node.left, node);
      },
      UpdateExpression(node) {
        if (node.argument.type === "MemberExpression") checkMutation(node.argument, node);
      },
      UnaryExpression(node) {
        if (node.operator === "delete" && node.argument.type === "MemberExpression") {
          checkMutation(node.argument, node);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          MUTATING_METHODS.has(node.callee.property.name)
        ) {
          checkMutation(node.callee, node);
        }
      },
    };
  },
});
