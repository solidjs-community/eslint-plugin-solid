import type { TSESTree as T, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { FunctionNode, ProgramOrFunctionNode } from "../../utils";



export interface ReactivityPluginApi {
  /**
   * Mark a node as a function in which reactive variables may be polled (not tracked). Can be
   * async.
   */
  calledFunction(node: T.Node): void;
  /**
   * Mark a node as a tracked scope, like `createEffect`'s callback or a JSXExpressionContainer.
   */
  trackedScope(node: T.Node): void;
  /**
   * Mark a node as a function that will be synchronously called in the current scope, like
   * Array#map callbacks.
   */
  syncCallback(node: FunctionNode): void;

  /**
   * Alter the error message within a scope to provide additional details.
   */
  provideErrorContext(node: T.Node, errorMessage: string): void;

  /**
   * Mark that a node evaluates to a signal (or memo, etc.). Short for `.reactive(node, (path ?? '') + '()')`
   */
  signal(node: T.Node, path?: string): void;

  /**
   * Mark that a node evaluates to a store or props. Short for `.reactive(node, (path ?? '') + '.**')`
   */
  store(node: T.Node, path?: string, options?: { mutable?: boolean }): void;

  /**
   * Mark that a node is reactive in some way--either a signal-like or a store-like, or something
   * more specialized.
   * @param path a string with a special pattern, akin to a "type" for reactivity. Composed of the
   * following segments:
   *   - `()`: when called
   *   - `[0]`: when the first element is accessed
   *   - `[]`: when any element is accessed
   *   - `.foo`: when the 'foo' property is accessed
   *   - `.*`: when any direct property is accessed
   *   - `.**`: when any direct or nested property is accessed
   * @example
   * if (isCall(node, "createSignal")) {
   *   reactive(node, '[0]()');
   * } else if (isCall(node, "createMemo")) {
   *   reactive(node, '()');
   * } else if (isCall(node, "splitProps")) {
   *   reactive(node, '[].**');
   * } else if (isCall(node, "createResource")) {
   *   reactive(node, '()');
   *   reactive(node, '.loading');
   *   reactive(node, '.error');
   * }
   */
  reactive(node: T.Node, path: string): void;

  /**
   * Convenience method for checking if a node is a call expression. If `primitive` is provided,
   * checks that the callee is a Solid import with that name (or one of that name), handling aliases.
   */
  isCall(
    node: T.Node,
    primitive?: string | Array<string> | RegExp,
    module?: string | RegExp
  ): node is T.CallExpression;
}

export interface ReactivityPlugin {
  package: string;
  create: (api: ReactivityPluginApi) => TSESLint.RuleListener;
}

// Defeats type widening
export function plugin(p: ReactivityPlugin): ReactivityPlugin {
  return p;
}

// ===========================
