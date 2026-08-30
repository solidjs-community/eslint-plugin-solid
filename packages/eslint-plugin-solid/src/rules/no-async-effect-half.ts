/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable } from "../compat";
import { isFunctionNode, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "asyncEffect";
type Options = [];

/*
 * In Solid 2.0's split `createEffect(compute, effect)` form, the effect half
 * may return a cleanup function. An async effect function returns a Promise
 * instead, so the cleanup it "returns" is silently discarded — and statements
 * after the first `await` run detached from the effect's lifecycle, possibly
 * after the effect has been rerun or disposed. The compute half is exempt:
 * async computations are first-class in Solid 2.0.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow async functions as the effect half of `createEffect(compute, effect)`, where a returned cleanup function would be silently discarded.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-async-effect-half.md",
    },
    schema: [],
    messages: {
      asyncEffect:
        "The effect half of {{name}} must be synchronous: an async function returns a Promise, so its cleanup return value is discarded and code after `await` runs outside the effect's lifecycle. Do the async work in the compute half (async computations are tracked), or start it here and register cleanup synchronously.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports();

    /** Resolves an identifier to the function it names, if statically knowable. */
    const resolveFunction = (id: T.Identifier): T.Node | null => {
      const def = findVariable(context, id)?.defs[0];
      if (!def) return null;
      if (def.type === "FunctionName") return def.node;
      if (def.type === "Variable" && def.node.init && isFunctionNode(def.node.init)) {
        return def.node.init;
      }
      return null;
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.arguments.length < 2) return;
        const name = matchImport(["createEffect", "createRenderEffect"], node.callee.name);
        if (!name) return;

        const effectHalf = node.arguments[1];
        const fn = effectHalf.type === "Identifier" ? resolveFunction(effectHalf) : effectHalf;
        if (fn && isFunctionNode(fn) && fn.async) {
          context.report({ node: effectHalf, messageId: "asyncEffect", data: { name } });
        }
      },
    };
  },
});
