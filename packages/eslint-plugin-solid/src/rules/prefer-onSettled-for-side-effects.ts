/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import {
  findParent,
  getFunctionName,
  isFunctionNode,
  isJSXElementOrFragment,
  type FunctionNode,
} from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "sideEffectInBody";
type Options = [];

const TIMER_CALLS = new Set(["setInterval", "setTimeout"]);
const OBSERVER_CONSTRUCTORS = new Set([
  "IntersectionObserver",
  "ResizeObserver",
  "MutationObserver",
  "PerformanceObserver",
]);
const LISTENER_TARGETS = new Set(["window", "document"]);

/** Does this function look like a component (PascalCase name or returns JSX)? */
const isComponentLike = (fn: FunctionNode): boolean => {
  const name = getFunctionName(fn);
  if (name && /^[A-Z]/.test(name)) return true;
  if (fn.type === "ArrowFunctionExpression" && isJSXElementOrFragment(fn.body)) return true;
  if (fn.body.type === "BlockStatement") {
    return fn.body.body.some(
      (statement) =>
        statement.type === "ReturnStatement" && isJSXElementOrFragment(statement.argument)
    );
  }
  return false;
};

/*
 * Side-effectful setup in a component body runs during setup — including on
 * the server during SSR, and before the DOM has settled. `onSettled` runs
 * client-side at the right time. `onCleanup` itself is never flagged: it is
 * legitimate and lower-overhead than an `onSettled` return-cleanup; a paired
 * `onCleanup` is a symptom of setup work that belongs in `onSettled`, not the
 * offense.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce running side-effectful setup (timers, global listeners, observers) inside `onSettled` instead of the component body.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/prefer-onSettled-for-side-effects.md",
    },
    schema: [],
    messages: {
      sideEffectInBody:
        "{{name}} in the component body runs during setup, including on the server during SSR. Move it into `onSettled(() => { ...; return cleanup; })` so it runs client-side once the DOM has settled.",
    },
  },
  defaultOptions: [],
  create(context) {
    const report = (node: T.Node, name: string) => {
      // Only flag calls made directly in a component body; the same call
      // inside onSettled, an effect, or an event handler is fine.
      const enclosingFunction = findParent(node, isFunctionNode);
      if (!enclosingFunction || !isComponentLike(enclosingFunction)) return;
      context.report({ node, messageId: "sideEffectInBody", data: { name } });
    };

    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type === "Identifier" && TIMER_CALLS.has(callee.name)) {
          report(node, `\`${callee.name}\``);
        } else if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.type === "Identifier" &&
          callee.property.name === "addEventListener" &&
          callee.object.type === "Identifier" &&
          LISTENER_TARGETS.has(callee.object.name)
        ) {
          report(node, `\`${callee.object.name}.addEventListener\``);
        }
      },
      NewExpression(node) {
        if (node.callee.type === "Identifier" && OBSERVER_CONSTRUCTORS.has(node.callee.name)) {
          report(node, `\`new ${node.callee.name}\``);
        }
      },
    };
  },
});
