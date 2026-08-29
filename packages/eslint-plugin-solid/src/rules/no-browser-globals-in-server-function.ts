/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, TSESLint as Lint, ESLintUtils } from "@typescript-eslint/utils";
import {
  isFunctionNode,
  hasUseServerDirective,
  getUseServerEligibility,
  isInsideUseServerFunction,
  programHasUseServerDirective,
} from "../utils";
import { getSourceCode } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "browserGlobal";
type Options = [];

/**
 * Globals that exist only in browsers. Deliberately conservative: server
 * runtimes (Node, Deno, Bun, edge workers) provide `fetch`, `Response`,
 * `FormData`, `URL`, `crypto`, and even `navigator`, so only unambiguous
 * DOM/BOM globals are listed.
 */
const BROWSER_GLOBALS = new Set([
  "window",
  "document",
  "alert",
  "confirm",
  "prompt",
  "localStorage",
  "sessionStorage",
  "history",
  "location",
  "matchMedia",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "customElements",
]);

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow browser-only globals inside server functions, which run exclusively on the server.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-browser-globals-in-server-function.md",
    },
    schema: [],
    messages: {
      browserGlobal:
        "'{{name}}' is a browser global, and server functions only run on the server, where it does not exist. Read request data from the function's arguments or use server platform APIs instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = getSourceCode(context);
    let moduleLevel = false;

    const checkReferences = (references: Lint.Scope.Reference[]) => {
      for (const reference of references) {
        const name = reference.identifier.name;
        if (!BROWSER_GLOBALS.has(name)) continue;
        // A binding with definitions is the user's own variable; a def-less
        // resolution is a configured global (e.g. `globals.browser`).
        if (reference.resolved && reference.resolved.defs.length > 0) continue;
        // `typeof window` guards are dead code here but intentional
        const parent = reference.identifier.parent;
        if (parent?.type === "UnaryExpression" && parent.operator === "typeof") continue;
        context.report({
          node: reference.identifier,
          messageId: "browserGlobal",
          data: { name },
        });
      }
    };

    return {
      Program(node) {
        moduleLevel = programHasUseServerDirective(node);
        if (moduleLevel) {
          // The whole module runs on the server; check every reference in it.
          // References resolved to configured globals (`globals.browser`)
          // never reach a scope's `through`, so walk each scope directly.
          for (const scope of sourceCode.scopeManager?.scopes ?? []) {
            checkReferences(scope.references);
          }
        }
      },
      ":function"(node: T.Node) {
        if (moduleLevel || !isFunctionNode(node)) return;
        if (!hasUseServerDirective(node)) return;
        if (getUseServerEligibility(node) !== "eligible") return;
        if (isInsideUseServerFunction(node)) return;
        const scope = sourceCode.scopeManager?.acquire(node);
        // `through` holds every reference crossing the function's boundary,
        // including refs from nested scopes that resolve to outer globals.
        if (scope) checkReferences(scope.through);
      },
    };
  },
});
