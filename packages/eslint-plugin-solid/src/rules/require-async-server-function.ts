/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils, ASTUtils } from "@typescript-eslint/utils";
import {
  FunctionNode,
  isFunctionNode,
  hasUseServerDirective,
  getUseServerEligibility,
  isInsideUseServerFunction,
  programHasUseServerDirective,
} from "../utils";
import { findVariable, getSourceCode } from "../compat";

const { getFunctionHeadLocation } = ASTUtils;
const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "asyncServerFunction";
type Options = [];

/*
 * The client half of a server function is always asynchronous: calls cross
 * the network and resolve a Promise. The server half deliberately preserves
 * synchronous entry for in-process SSR calls. A non-async server function
 * therefore returns `T` during SSR and `Promise<T>` on the client, and its
 * declared TypeScript type matches only one of them — a split TS cannot see,
 * because it types the source declaration, not the compiled proxy.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description: "Require server functions to be async, matching their client-side contract.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/require-async-server-function.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      asyncServerFunction:
        "Server functions should be async: on the client every call resolves a Promise, but during server rendering this function is called in-process and returns synchronously, so the same code observes two different types.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = getSourceCode(context);
    let moduleLevel = false;

    const checkFunction = (fn: FunctionNode) => {
      if (fn.async) return;
      context.report({
        loc: getFunctionHeadLocation(fn, sourceCode),
        messageId: "asyncServerFunction",
        fix: (fixer) => {
          const firstToken = sourceCode.getFirstToken(fn);
          return firstToken ? fixer.insertTextBefore(firstToken, "async ") : null;
        },
      });
    };

    /** Resolves `export { name }` specifiers to top-level function nodes. */
    const resolveExportedFunction = (identifier: T.Identifier): FunctionNode | null => {
      const variable = findVariable(context, identifier);
      const def = variable?.defs[0];
      if (!def) return null;
      if (def.type === "FunctionName" && isFunctionNode(def.node)) return def.node;
      if (
        def.type === "Variable" &&
        def.node.type === "VariableDeclarator" &&
        isFunctionNode(def.node.init)
      ) {
        return def.node.init;
      }
      return null;
    };

    return {
      Program(node) {
        moduleLevel = programHasUseServerDirective(node);
      },
      ":function"(node: T.Node) {
        if (!isFunctionNode(node)) return;
        // Function-level directives. Ineligible positions (object/class
        // methods) are never extracted at all; valid-use-server owns those.
        if (
          !moduleLevel &&
          hasUseServerDirective(node) &&
          getUseServerEligibility(node) === "eligible" &&
          !isInsideUseServerFunction(node)
        ) {
          checkFunction(node);
        }
      },
      ExportNamedDeclaration(node) {
        if (!moduleLevel) return;
        if (node.declaration) {
          if (isFunctionNode(node.declaration)) {
            checkFunction(node.declaration);
          } else if (node.declaration.type === "VariableDeclaration") {
            for (const declarator of node.declaration.declarations) {
              if (isFunctionNode(declarator.init)) checkFunction(declarator.init);
            }
          }
        } else {
          for (const specifier of node.specifiers) {
            if (specifier.local.type !== "Identifier") continue;
            const fn = resolveExportedFunction(specifier.local);
            if (fn) checkFunction(fn);
          }
        }
      },
      ExportDefaultDeclaration(node) {
        if (!moduleLevel) return;
        if (isFunctionNode(node.declaration)) checkFunction(node.declaration);
      },
    };
  },
});
