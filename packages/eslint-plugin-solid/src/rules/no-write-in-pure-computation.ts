/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable } from "../compat";
import { findParent, isFunctionNode, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "writeInMemo" | "writeInCompute";
type Options = [];

/*
 * `createMemo` callbacks and the compute half of `createEffect(compute,
 * effect)` are pure tracked computations: writing other reactive state from
 * inside them creates update cycles and throws in Solid 2.0 dev mode. Only
 * setter calls whose nearest enclosing function IS the computation are
 * flagged — a setter inside a nested function (say, an event handler the
 * memo returns) runs later, outside the computation, and is fine.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow writing signals or stores inside `createMemo` or the compute half of `createEffect`, which must be pure.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-write-in-pure-computation.md",
    },
    schema: [],
    messages: {
      writeInMemo:
        "Calling the setter '{{name}}' inside createMemo makes the computation impure and creates an update cycle. Derive the value instead of storing it, or move the write to an effect.",
      writeInCompute:
        "Calling the setter '{{name}}' in the compute half of {{api}} — the compute function is tracked and must be pure. Move the write into the effect half (the second argument).",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports();

    /** Pure computation functions seen so far, mapped to how to report writes in them. */
    const computations = new Map<T.Node, { messageId: MessageIds; api: string }>();

    /**
     * Does this signal opt into owned-scope writes? Core skips its dev guard
     * for signals created with `ownedWrite: true`, and its error message
     * steers users to that option — so the lint must honor it too. The check
     * only says "no" when it can *prove* the opt-in is absent: a missing
     * options argument, or an object literal (followed through one level of
     * const indirection) that is fully readable and lacks `ownedWrite`.
     * Everything else — spreads, casts, unresolvable or reassigned
     * variables — is assumed to opt in, so the rule can only under-report,
     * never contradict core.
     */
    const allowsOwnedWrite = (init: T.CallExpression): boolean => {
      let options: T.Node | undefined = init.arguments[1];
      if (!options) return false;
      if (options.type === "Identifier") {
        const variable = findVariable(context, options);
        const def = variable?.defs[0];
        if (
          variable?.defs.length !== 1 ||
          def?.type !== "Variable" ||
          def.node.parent?.kind !== "const" ||
          !def.node.init ||
          // A const holding an object can still be given properties later
          // (`opts.ownedWrite = true`); any reference that mutates the object
          // or escapes it (passed elsewhere, aliased) makes the literal read
          // inconclusive. Only references that ARE the options argument of a
          // signal creation keep it conclusive.
          variable.references.some(
            (ref) =>
              ref.identifier !== def.node.id &&
              !(
                ref.identifier.parent?.type === "CallExpression" &&
                ref.identifier.parent.arguments[1] === ref.identifier
              )
          )
        ) {
          return true;
        }
        options = def.node.init;
      }
      if (options.type !== "ObjectExpression") return true;
      return options.properties.some(
        (property) =>
          property.type === "SpreadElement" ||
          ((property.key.type === "Identifier"
            ? property.key.name === "ownedWrite"
            : property.key.type === "Literal" && property.key.value === "ownedWrite") &&
            !(property.value.type === "Literal" && property.value.value === false))
      );
    };

    /** Is `id` the setter half of a signal/store/optimistic tuple? */
    const isSetter = (id: T.Identifier): boolean => {
      const def = findVariable(context, id)?.defs[0];
      if (!def || def.type !== "Variable" || !def.node.init) return false;
      const { id: declId, init } = def.node;
      if (
        declId.type !== "ArrayPattern" ||
        declId.elements[1]?.type !== "Identifier" ||
        declId.elements[1].name !== id.name ||
        init.type !== "CallExpression" ||
        init.callee.type !== "Identifier"
      ) {
        return false;
      }
      const primitive = matchImport(
        ["createSignal", "createStore", "createOptimistic"],
        init.callee.name
      );
      if (!primitive) return false;
      // `ownedWrite` is a SignalOptions flag; store setters have no such
      // exemption in core, so only signal-shaped primitives honor it.
      if (primitive !== "createStore" && allowsOwnedWrite(init)) return false;
      return true;
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;

        // Register pure computation callbacks. Ancestors are visited before
        // descendants, so these are known before their setter calls are seen.
        if (matchImport("createMemo", node.callee.name)) {
          const fn = node.arguments[0];
          if (isFunctionNode(fn)) {
            computations.set(fn, { messageId: "writeInMemo", api: "createMemo" });
          }
          return;
        }
        const effectName = matchImport(["createEffect", "createRenderEffect"], node.callee.name);
        if (effectName && node.arguments.length >= 2) {
          const fn = node.arguments[0];
          if (isFunctionNode(fn)) {
            computations.set(fn, { messageId: "writeInCompute", api: effectName });
          }
          return;
        }

        if (computations.size === 0) return;
        const enclosing = findParent(node, isFunctionNode);
        const computation = enclosing && computations.get(enclosing);
        if (computation && isSetter(node.callee)) {
          context.report({
            node,
            messageId: computation.messageId,
            data: { name: node.callee.name, api: computation.api },
          });
        }
      },
    };
  },
});
