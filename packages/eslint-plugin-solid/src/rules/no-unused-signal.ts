import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable, getSourceCode } from "../compat";
import { findParent, trackImports } from "../utils";

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
        "This signal is never written, so its value can never change. Use a plain constant (`const {{accessor}} = () => value`), or `createMemo` if the value is derived from reactive state.",
      neverRead:
        "This signal is never read, so setting it has no effect. Remove the signal, or read the value where the state should be used.",
      replaceWithAccessor: "Replace with a constant accessor.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports();

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
          !matchImport("createSignal", node.init.callee.name) ||
          node.id.type !== "ArrayPattern" ||
          node.id.elements.length > 2
        ) {
          return;
        }
        // Only plain `[accessor, setter]` shapes (with possible holes) are conclusive.
        const [accessor = null, setter = null] = node.id.elements;
        if (
          (accessor && accessor.type !== "Identifier") ||
          (setter && setter.type !== "Identifier")
        ) {
          return;
        }
        // Exported signals can be read or written by other modules.
        if (findParent(node, (n) => n.type === "ExportNamedDeclaration")) return;

        if (!accessor || !isUsed(accessor)) {
          context.report({ node: accessor ?? node.id, messageId: "neverRead" });
          return;
        }
        if (!setter || !isUsed(setter)) {
          const init = node.init;
          const initialValue = init.arguments[0];
          // Only suggest the rewrite when the initial value is a simple literal;
          // richer expressions may want createMemo or evaluate-once semantics.
          const suggest =
            !initialValue || initialValue.type === "Literal"
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
            data: { accessor: accessor.name },
            suggest,
          });
        }
      },
    };
  },
});
