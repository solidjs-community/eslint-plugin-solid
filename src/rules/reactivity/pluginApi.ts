import type { TSESTree as T, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { FunctionNode, ProgramOrFunctionNode } from "../../utils";

type PathSegment = `[${number}]`;
export type ExprPath = PathSegment; // PathSegment | `${PathSegment}${Path}`;

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
   * Mark that a node evaluates to a signal (or memo, etc.).
   */
  signal(node: T.Node, path?: ExprPath): void;

  /**
   * Mark that a node evaluates to a store or props.
   */
  store(node: T.Node, path?: ExprPath, options?: { mutable?: boolean }): void;

  /**
   * Mark that a node is reactive in some way--either a signal-like or a store-like.
   */
  reactive(node: T.Node, path?: ExprPath): void;

  /**
   * Convenience method for checking if a node is a call expression. If `primitive` is provided,
   * checks that the callee is a Solid import with that name (or one of that name), handling aliases.
   */
  isCall(node: T.Node, primitive?: string | Array<string>): node is T.CallExpression;
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

class Reactivity implements ReactivityPluginApi {
  trackedScope(node: T.Node): void {
    throw new Error("Method not implemented.");
  }
  calledFunction(node: T.Node): void {
    throw new Error("Method not implemented.");
  }
  trackedFunction(node: T.Node): void {
    throw new Error("Method not implemented.");
  }
  trackedExpression(node: T.Node): void {
    throw new Error("Method not implemented.");
  }
  syncCallback(node: T.Node): void {
    throw new Error("Method not implemented.");
  }
  provideErrorContext(node: T.Node, errorMessage: string): void {
    throw new Error("Method not implemented.");
  }
  signal(node: T.Node, path?: `[${number}]` | undefined): void {
    throw new Error("Method not implemented.");
  }
  store(node: T.Node, path?: `[${number}]` | undefined): void {
    throw new Error("Method not implemented.");
  }
  reactive(node: T.Node, path?: `[${number}]` | undefined): void {
    throw new Error("Method not implemented.");
  }
  isCall(node: T.Node, primitive?: string | string[] | undefined): node is T.CallExpression {
    throw new Error("Method not implemented.");
  }
}
