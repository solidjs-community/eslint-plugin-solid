/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { ESLintUtils } from "@typescript-eslint/utils";
import { getSolidSourceRegex, trackImports } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "singleArgEffect" | "singleArgRenderEffect";
type Options = [];

/*
 * Solid 2.0 splits effects into a tracked compute function and an untracked
 * effect function: `createEffect(compute, effect)`. The single-argument 1.x
 * form types as `never` via a deprecated overload — which produces no compile
 * error on a bare statement call — and only throws at runtime in dev mode.
 * This rule is the build-time hard stop.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require the two-argument `createEffect(compute, effect)` form used by Solid 2.0.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-single-arg-create-effect.md",
    },
    schema: [],
    messages: {
      singleArgEffect:
        "In Solid 2.0, createEffect takes separate compute and effect functions: `createEffect(() => signal(), (value) => doWork(value))`. For a derived value use `createMemo`; for a one-shot side effect, just call the function directly.",
      singleArgRenderEffect:
        "In Solid 2.0, createRenderEffect takes separate compute and effect functions: `createRenderEffect(() => signal(), (value) => doWork(value))`.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));

    return {
      ImportDeclaration: handleImportDeclaration,
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.arguments.length !== 1) return;
        if (matchImport("createEffect", node.callee.name)) {
          context.report({ node, messageId: "singleArgEffect" });
        } else if (matchImport("createRenderEffect", node.callee.name)) {
          context.report({ node, messageId: "singleArgRenderEffect" });
        }
      },
    };
  },
});
