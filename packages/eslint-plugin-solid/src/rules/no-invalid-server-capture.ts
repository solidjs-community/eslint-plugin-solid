/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import {
  isFunctionNode,
  hasUseServerDirective,
  getUseServerEligibility,
  isInsideUseServerFunction,
  programHasUseServerDirective,
} from "../utils";
import { getSourceCode } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "invalidCapture";
type Options = [];

/*
 * An editor-time mirror of the compiler's closure-capture validation. An
 * extracted server function runs in a different closure environment than the
 * one it was written in: on the server it is hoisted to module top level, on
 * the client it is replaced by a network proxy. Any variable captured from an
 * intermediate scope — declared between module top level and the server
 * function itself — does not exist at runtime. The compiler rejects this at
 * build time; this rule reports the same captures as you type.
 *
 * Module-level directives are unaffected (the whole module runs on the
 * server, so its closures are intact). Eligibility mirrors the transform:
 * functions it never extracts (object/class methods, getters/setters) are
 * not validated, and directives nested inside an already-extracted server
 * function are ignored.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow server functions from capturing variables in enclosing non-module scopes, mirroring the compiler's build-time validation.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-invalid-server-capture.md",
    },
    schema: [],
    messages: {
      invalidCapture:
        "Server functions cannot capture '{{name}}' from an enclosing {{kind}}: on the server the function is hoisted to module level and on the client it becomes a network proxy, so the captured variable does not exist at runtime. Use parameters, module-level bindings, imports, or globals instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = getSourceCode(context);
    let moduleLevel = false;

    return {
      Program(node) {
        moduleLevel = programHasUseServerDirective(node);
      },
      ":function"(node: T.Node) {
        if (!isFunctionNode(node)) return;
        if (moduleLevel) return;
        if (!hasUseServerDirective(node)) return;
        if (getUseServerEligibility(node) !== "eligible") return;
        if (isInsideUseServerFunction(node)) return;

        const scope = sourceCode.scopeManager?.acquire(node);
        if (!scope) return;
        // `through` holds every reference crossing this function's boundary,
        // including those from nested scopes.
        for (const reference of scope.through) {
          const variable = reference.resolved;
          if (!variable) continue; // a true global
          // TS type-only references are erased from the output and never captured
          const typedReference = reference as {
            isTypeReference?: boolean;
            isValueReference?: boolean;
          };
          if (typedReference.isTypeReference && !typedReference.isValueReference) continue;
          const declarationScope = variable.scope;
          if (declarationScope.type === "module" || declarationScope.type === "global") continue;
          // A named function expression referencing itself travels with the
          // extracted function and stays valid.
          if (
            declarationScope.type === "function-expression-name" &&
            declarationScope.block === node
          ) {
            continue;
          }
          context.report({
            node: reference.identifier,
            messageId: "invalidCapture",
            data: {
              name: reference.identifier.name,
              kind: declarationScope.type === "function" ? "function" : "block",
            },
          });
        }
      },
    };
  },
});
