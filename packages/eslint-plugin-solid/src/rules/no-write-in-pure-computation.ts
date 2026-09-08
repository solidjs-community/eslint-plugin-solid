/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable } from "../compat";
import {
  FunctionNode,
  findParent,
  getFunctionName,
  isFunctionNode,
  getSolidSourceRegex,
  trackImports,
} from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "writeInMemo" | "writeInCompute" | "writeInComponent";
type Options = [];

/*
 * `createMemo` callbacks, the compute half of `createEffect(compute,
 * effect)`, and component bodies are pure owned scopes in Solid 2.0:
 * writing other reactive state from inside them creates update cycles and
 * throws in dev mode (REACTIVE_WRITE_IN_OWNED_SCOPE). Only setter calls
 * whose nearest enclosing function IS the pure scope are flagged — a setter
 * inside a nested function (an event handler, an `onSettled` or
 * `createTrackedEffect` callback, the effect half) runs later, in an
 * imperative scope, and is fine.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow writing signals or stores inside `createMemo`, the compute half of `createEffect`, or a component body, which are pure owned scopes.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-write-in-pure-computation.md",
    },
    schema: [],
    messages: {
      writeInMemo:
        "Calling the setter '{{name}}' inside createMemo makes the computation impure and creates an update cycle. Derive the value instead of storing it, or move the write to an effect.",
      writeInCompute:
        "Calling the setter '{{name}}' in the compute half of {{api}} — the compute function is tracked and must be pure. Move the write into the effect half (the second argument).",
      writeInComponent:
        "Calling the setter '{{name}}' during component setup — the body runs once as a pure owned scope, and Solid 2.0 throws on setup writes in dev. Initialize the state with the right value instead, or move the write into an effect half or event handler.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));

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

    /**
     * Setter calls whose nearest enclosing function might be a component.
     * Whether it IS one (contains JSX, component-shaped) is only known at the
     * function's :exit, so reports are deferred until then.
     */
    const pendingComponentWrites = new Map<FunctionNode, T.CallExpression[]>();
    const functionStack: Array<{ hasJSX: boolean }> = [];

    /**
     * Matches the component detection in no-destructure/components-return-once:
     * containing JSX isn't enough on its own, because data callbacks
     * (`items.map((item) => <li />)`) and lowercase-named helpers also return
     * JSX. Component-shaped means: not lowercase-named, not a "render prop",
     * and not a plain call argument (unless the callee is PascalCase, like a
     * HOC).
     */
    const isComponent = (node: FunctionNode) =>
      !getFunctionName(node)?.match(/^[a-z]/) &&
      node.parent?.type !== "JSXExpressionContainer" &&
      !(
        node.parent?.type === "CallExpression" &&
        node.parent.arguments.includes(node as T.CallExpressionArgument) &&
        !(node.parent.callee as T.Identifier).name?.match(/^[A-Z]/)
      );

    return {
      ImportDeclaration: handleImportDeclaration,
      ":function"() {
        functionStack.push({ hasJSX: false });
      },
      JSXElement() {
        if (functionStack.length) functionStack[functionStack.length - 1].hasJSX = true;
      },
      JSXFragment() {
        if (functionStack.length) functionStack[functionStack.length - 1].hasJSX = true;
      },
      ":function:exit"(node: T.Node) {
        const { hasJSX } = functionStack.pop() ?? { hasJSX: false };
        if (!isFunctionNode(node)) return;
        const pending = pendingComponentWrites.get(node);
        if (!pending) return;
        pendingComponentWrites.delete(node);
        // A function that is itself a registered computation is reported
        // through the computation path, never as a component.
        if (!hasJSX || computations.has(node) || !isComponent(node)) return;
        for (const call of pending) {
          context.report({
            node: call,
            messageId: "writeInComponent",
            data: { name: (call.callee as T.Identifier).name },
          });
        }
      },
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

        const enclosing = findParent(node, isFunctionNode);
        if (!enclosing || !isFunctionNode(enclosing)) return;
        const computation = computations.get(enclosing);
        if (!computation && !isSetter(node.callee)) return;
        if (computation) {
          if (isSetter(node.callee)) {
            context.report({
              node,
              messageId: computation.messageId,
              data: { name: node.callee.name, api: computation.api },
            });
          }
          return;
        }
        // Possibly a setup-scope write; decided at the function's :exit.
        const pending = pendingComponentWrites.get(enclosing);
        if (pending) pending.push(node);
        else pendingComponentWrites.set(enclosing, [node]);
      },
    };
  },
});
