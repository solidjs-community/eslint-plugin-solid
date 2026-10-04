import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable, getSourceCode } from "../compat";
import { getSolidSourceRegex, isFunctionNode, trace, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "neverWritten" | "neverRead" | "replaceWithAccessor";
type Options = [];

/*
 * A destructured signal tuple is the only handle on the signal, so scope
 * analysis is conclusive: if the setter is never referenced the value can
 * never change, and if the accessor is never referenced the state can never
 * be observed. Unused-variable rules miss both halves because the *other*
 * half keeps the declaration "used". Exported declarations are skipped —
 * references in other modules are invisible here.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow signals that are never written (use a plain value) or never read (dead state).",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-unused-signal.md",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      neverWritten:
        "This {{kind}} is never written, so its value can never change. Use a plain value, or `createMemo` if it should derive from reactive state.",
      neverRead:
        "This {{kind}} is never read, so setting it has no effect. Remove the {{kind}}, or read the value where the state should be used.",
      replaceWithAccessor: "Replace with a constant accessor.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));

    /** Does this pattern element's variable have any reference besides its initialization? */
    const isUsed = (element: T.Identifier): boolean => {
      const variable = findVariable(context, element);
      // Unresolvable variables can't be proven unused; assume they're fine.
      if (!variable) return true;
      return variable.references.some((ref) => !ref.init);
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      VariableDeclarator(node) {
        if (
          node.init?.type !== "CallExpression" ||
          node.init.callee.type !== "Identifier" ||
          node.id.type !== "ArrayPattern" ||
          node.id.elements.length > 2
        ) {
          return;
        }
        const primitive = matchImport(
          ["createSignal", "createStore", "createOptimistic"],
          node.init.callee.name
        );
        if (!primitive) return;
        const kind =
          primitive === "createSignal"
            ? "signal"
            : primitive === "createStore"
            ? "store"
            : "optimistic value";
        // Only plain `[accessor, setter]` shapes (with possible holes) are conclusive.
        const [accessor = null, setter = null] = node.id.elements;
        if (
          (accessor && accessor.type !== "Identifier") ||
          (setter && setter.type !== "Identifier")
        ) {
          return;
        }
        // Exported signals can be read or written by other modules. Only the
        // directly-exported declaration (`export const [a, setA] = ...`) is
        // exempt; a tuple declared *inside* an exported function can't be
        // reached from other modules, so it's still conclusively analyzable.
        if (
          node.parent?.type === "VariableDeclaration" &&
          node.parent.parent?.type === "ExportNamedDeclaration"
        ) {
          return;
        }

        if (!accessor || !isUsed(accessor)) {
          context.report({ node: accessor ?? node.id, messageId: "neverRead", data: { kind } });
          return;
        }
        // Function-form derived primitives (`createSignal(fn)`, `createStore(fn,
        // seed)`) change through their source function — Solid 2.0 re-runs it as
        // a tracked computation — so "never written" is not evidence of dead
        // state. Skip the neverWritten check whenever the first argument is a
        // function node or an identifier that provably resolves to one
        // (`trace` only looks through const bindings, so an unresolvable or
        // reassigned identifier conservatively keeps the check). neverRead
        // still applies: an unread derived primitive is dead state either way.
        const firstArg = node.init.arguments[0];
        if (firstArg && isFunctionNode(trace(firstArg, context))) return;
        if (!setter || !isUsed(setter)) {
          const init = node.init;
          const initialValue = init.arguments[0];
          // Only suggest the rewrite for signals whose initial value is a
          // simple literal; richer expressions may want createMemo or
          // evaluate-once semantics, and store/optimistic results aren't
          // accessor-shaped.
          const suggest =
            primitive === "createSignal" && (!initialValue || initialValue.type === "Literal")
              ? [
                  {
                    messageId: "replaceWithAccessor" as const,
                    fix: (fixer: TSESLint.RuleFixer) =>
                      fixer.replaceText(
                        node,
                        `${accessor.name} = () => ${
                          initialValue ? getSourceCode(context).getText(initialValue) : "undefined"
                        }`
                      ),
                  },
                ]
              : undefined;
          context.report({
            node: setter ?? node.id,
            messageId: "neverWritten",
            data: { kind },
            suggest,
          });
        }
      },
    };
  },
});
