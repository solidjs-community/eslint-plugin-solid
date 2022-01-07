/**
 * File overview here, scroll to bottom.
 * @link https://github.com/joshwilsonvu/eslint-plugin-solid/blob/main/docs/reactivity.md
 */

import { TSESTree as T, TSESLint, ASTUtils } from "@typescript-eslint/experimental-utils";
import {
  findParent,
  findInFunction,
  isPropsByName,
  FunctionNode,
  isFunctionNode,
  ProgramOrFunctionNode,
} from "../utils";

const { findVariable, getFunctionHeadLocation } = ASTUtils;

type Scope = TSESLint.Scope.Scope;
type Variable = TSESLint.Scope.Variable;

interface ReactiveVariable {
  /** The reactive variable. */
  variable: Variable;
  /**
   * The function node in which the reactive variable was declared, or for a derived signal (function),
   * the deepest function node that declares a referenced signal.
   */
  declarationScope: ProgramOrFunctionNode;
}
const ReactiveVariable = (variable: Variable, declarationScope: ProgramOrFunctionNode) => ({
  variable,
  declarationScope,
});

interface TrackedScope {
  node: T.Node;
  expect: "function" | "expression";
}
const TrackedScope = (node: T.Node, expect: "function" | "expression"): TrackedScope => ({
  node,
  expect,
});
const matchTrackedScope = (trackedScope: TrackedScope, node: T.Node): boolean => {
  switch (trackedScope.expect) {
    case "function":
      return node === trackedScope.node;
    case "expression":
      return Boolean(findInFunction(node, (node) => node === trackedScope.node));
  }
};

interface FunctionStackItem {
  /** the node for the current function, or program if global scope */
  node: ProgramOrFunctionNode;
  /**
   * nodes whose descendants in the current function are allowed to be reactive. JSXExpressionContainers
   * can be any expression containing reactivity, while function nodes/identifiers are typically arguments
   * to solid-js primitives and should match a tracked scope exactly.
   */
  trackedScopes: Array<TrackedScope>;
  /** variable references to be treated as signals, memos, derived signals, etc. */
  signals: Array<ReactiveVariable>;
  /** variables references to be treated as props (or stores) */
  props: Array<ReactiveVariable>;
  /** nameless functions with reactivity, should exactly match a tracked scope */
  unnamedDerivedSignals?: Set<FunctionNode>;
  /** switched to true by time of :exit if JSX is detected in the current function */
  hasJSX: boolean;
}

const isDescendantNotInNestedFunction = (child: T.Node, parent: T.Node | T.Program) =>
  findParent(child, (n) => n === parent || isFunctionNode(n)) === parent;

const getNthDestructuredVar = (id: T.Node, n: number, scope: Scope): Variable | null => {
  if (id?.type === "ArrayPattern") {
    const el = id.elements[n];
    if (el?.type === "Identifier") {
      return findVariable(scope, el.name);
    }
  }
  return null;
};
const getReturnedVar = (id: T.Node, scope: Scope): Variable | null => {
  if (id.type === "Identifier") {
    return findVariable(scope, id.name);
  }
  return null;
};

type MessageIds =
  | "noWrite"
  | "untrackedReactive"
  | "badSignal"
  | "badProps"
  | "badUnnamedDerivedSignal"
  | "shouldDestructure"
  | "shouldAssign";

const rule: TSESLint.RuleModule<MessageIds, []> = {
  meta: {
    type: "problem",
    docs: {
      recommended: false, // TODO switch
      description:
        "Enforce that reactive expressions (props, signals, memos, etc.) are only used in tracked scopes; otherwise, they won't update the view as expected.",
      url: "https://github.com/joshwilsonvu/eslint-plugin-solid/blob/main/docs/reactivity.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      noWrite: "The reactive variable {{ name }} should not be reassigned or altered.",
      untrackedReactive: "The reactive variable {{ name }} should be used within a tracked scope.",
      badSignal: "This variable should be called as a function when used.",
      badProps:
        "This props or store should only be passed to functions or used for property access.",
      badUnnamedDerivedSignal: "This function should be passed to a tracked scope.",
      shouldDestructure:
        "Array destructuring should be used to capture the {{nth}}result of this function call.",
      shouldAssign: "A variable should be used to capture the result of this function call.",
    },
  },
  create(context) {
    const warnShouldDestructure = (node: T.Node, nth?: string) =>
      context.report({
        node,
        messageId: "shouldDestructure",
        data: nth ? { nth: nth + " " } : undefined,
      });
    const warnShouldAssign = (node: T.Node) => context.report({ node, messageId: "shouldAssign" });

    const sourceCode = context.getSourceCode();

    /** Represents the lexical function stack and relevant information for each function */
    const functionStack: Array<FunctionStackItem> = [];
    const currentFunction = () => functionStack[functionStack.length - 1];

    /** Populates the function stack. */
    const onFunctionEnter = (node: ProgramOrFunctionNode) => {
      functionStack.push({
        node,
        trackedScopes: [],
        signals: [],
        props: [],
        hasJSX: false,
      });
    };

    /** Returns the function node deepest in the tree. Assumes a === b, a is inside b, or b is inside a. */
    const findDeepestDeclarationScope = (
      a: ProgramOrFunctionNode,
      b: ProgramOrFunctionNode
    ): ProgramOrFunctionNode => {
      if (a === b) return a;
      for (let i = functionStack.length - 1; i >= 0; i -= 1) {
        const { node } = functionStack[i];
        if (a === node || b === node) {
          return node;
        }
      }
      throw new Error("This should never happen");
    };

    /** Inspects a specific reference of a reactive variable for correct handling. */
    const handleTrackedScopes = (
      identifier: T.Identifier,
      declarationScope: ProgramOrFunctionNode
    ) => {
      const currentFunctionNode = currentFunction().node;
      // Check if the call falls outside any tracked scopes in the current function
      if (
        !currentFunction().trackedScopes.some((trackedScope) =>
          matchTrackedScope(trackedScope, identifier)
        )
      ) {
        if (declarationScope === currentFunctionNode) {
          // If the reactivity is not contained in a tracked scope, and any of the reactive variables were
          // declared in the current function scope, then we report them. When the reference is to an object
          // in a MemberExpression (props/store) or a function call (signal), report that, otherwise the identifier.
          let parentMemberExpression: T.MemberExpression | null = null;
          if (identifier.parent?.type === "MemberExpression") {
            parentMemberExpression = identifier.parent;
            while (parentMemberExpression!.parent?.type === "MemberExpression") {
              parentMemberExpression = parentMemberExpression!.parent;
            }
          }
          const parentCallExpression =
            identifier.parent?.type === "CallExpression" ? identifier.parent : null;
          context.report({
            node: parentMemberExpression ?? parentCallExpression ?? identifier,
            messageId: "untrackedReactive",
            data: { name: identifier.name },
          });
        } else {
          // If all of the reactive variables were declared above the current function scope, then
          // the entire function becomes reactive with the deepest declaration scope of the reactive
          // variables it contains. Let the next onFunctionExit up handle it.
          const parentFunction = functionStack[functionStack.length - 2];
          if (!parentFunction || !isFunctionNode(currentFunctionNode)) {
            throw new Error("this shouldn't happen!");
          }

          // Add references to derived signal to signals list in parent function.
          // Derived signals are special; they don't use the declaration scope of the function, but rather
          // the minimum declaration scope of any signals they contain.
          const pushUniqueDerivedSignal = (reactiveVariable: ReactiveVariable) => {
            const signal = parentFunction.signals.find(
              (signal) => signal.variable === reactiveVariable.variable
            );
            if (!signal) {
              parentFunction.signals.push(reactiveVariable);
            } else {
              signal.declarationScope = findDeepestDeclarationScope(
                signal.declarationScope,
                reactiveVariable.declarationScope
              );
            }
          };
          // If the current function doesn't have an associated variable, that's fine, it's being
          // used inline (i.e. anonymous arrow function). For this to be okay, the arrow function
          // has to be the same node as one of the tracked scopes, as we can't easily find references.
          const pushUnnamedDerivedSignal = () =>
            (parentFunction.unnamedDerivedSignals ??= new Set()).add(currentFunctionNode);

          if (currentFunctionNode.type === "FunctionDeclaration") {
            // get variable representing function, function node only defines one variable
            const functionVariable: Variable | undefined =
              sourceCode.scopeManager?.getDeclaredVariables(currentFunctionNode)?.[0];
            if (functionVariable) {
              pushUniqueDerivedSignal(
                ReactiveVariable(
                  functionVariable,
                  declarationScope // use declaration scope of a signal contained in this function
                )
              );
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentFunctionNode.parent?.type === "VariableDeclarator") {
            const declarator = currentFunctionNode.parent;
            // for nameless or arrow function expressions, use the declared variable it's assigned to
            const functionVariable = sourceCode.scopeManager?.getDeclaredVariables(declarator)?.[0];
            if (functionVariable) {
              // use declaration scope of a signal contained in this function
              pushUniqueDerivedSignal(ReactiveVariable(functionVariable, declarationScope));
            } else {
              pushUnnamedDerivedSignal();
            }
          } else {
            pushUnnamedDerivedSignal();
          }
        }
      }
    };

    /** Check all the signals on the functionStack, depth-first. */
    function* iterateSignals(): Iterable<ReactiveVariable> {
      for (let i = functionStack.length - 1; i >= 0; i -= 1) {
        yield* functionStack[i].signals;
      }
    }
    /** Check all the props on the functionStack, depth-first. */
    function* iterateProps(): Iterable<ReactiveVariable> {
      for (let i = functionStack.length - 1; i >= 0; i -= 1) {
        yield* functionStack[i].props;
      }
    }

    /** Performs all analysis and reporting. */
    const onFunctionExit = () => {
      // If this function is a component, add its props as a reactive variable
      const currentFunctionNode = currentFunction().node;
      if (isFunctionNode(currentFunctionNode) && currentFunctionNode.params.length === 1) {
        const paramsNode = currentFunctionNode.params[0];
        if (
          paramsNode?.type === "Identifier" &&
          (currentFunction().hasJSX || isPropsByName(paramsNode.name))
        ) {
          // This function is a component, consider its parameter a props
          const propsParam = findVariable(context.getScope(), paramsNode);
          if (propsParam) {
            currentFunction().props.push(ReactiveVariable(propsParam, currentFunctionNode));
          }
        }
      }

      // Iterate through all usages of (derived) signals in the current function (this is O(signals * references * depth) but typically not large)
      for (const { variable, declarationScope } of iterateSignals()) {
        for (const reference of variable.references) {
          const identifier = reference.identifier;
          if (!reference.init && isDescendantNotInNestedFunction(identifier, currentFunctionNode)) {
            if (reference.isWrite()) {
              // don't allow reassigning signals
              context.report({
                node: identifier,
                messageId: "noWrite",
                data: {
                  name: identifier.name,
                },
              });
            } else if (
              identifier.type === "Identifier" &&
              // This allows both calling a signal and calling a function with a signal.
              (identifier.parent?.type === "CallExpression" ||
                // Also allow the rare case where we pass an array of signals to on()
                (identifier.parent?.type === "ArrayExpression" &&
                  identifier.parent.parent?.type === "CallExpression" &&
                  (identifier.parent.parent.callee as T.Identifier | undefined)?.name === "on"))
            ) {
              // This signal is getting called properly, analyze it.
              handleTrackedScopes(identifier, declarationScope);
            } else {
              // The signal is getting used in an unexpected way
              context.report({
                node: identifier,
                messageId: "badSignal",
              });
            }
          }
        }
      }

      // Do a similar thing with all usages of props in the current function
      for (const { variable, declarationScope } of iterateProps()) {
        for (const reference of variable.references) {
          const identifier = reference.identifier;
          if (!reference.init && isDescendantNotInNestedFunction(identifier, currentFunctionNode)) {
            if (reference.isWrite()) {
              // don't allow reassigning props or stores
              context.report({
                node: identifier,
                messageId: "noWrite",
                data: {
                  name: identifier.name,
                },
              });
            } else if (
              identifier.parent?.type === "MemberExpression" &&
              identifier.parent.object === identifier
            ) {
              if (identifier.parent.parent?.type === "AssignmentExpression") {
                // don't allow writing to props or stores directly
                context.report({
                  node: identifier,
                  messageId: "noWrite",
                  data: {
                    name: identifier.name,
                  },
                });
              } else {
                // The props are the object in a property read access, which should be under a tracked scope.
                handleTrackedScopes(identifier, declarationScope);
              }
            } else if (
              (identifier.parent?.type === "CallExpression" &&
                identifier.type !== "JSXIdentifier" &&
                identifier.parent.arguments.includes(identifier)) ||
              identifier.parent?.type === "JSXSpreadAttribute"
            ) {
              // The props are being passed to a function (mergeProps, splitProps, custom hook) or spread
              // into JSX (<div {...props} />), which are both generally fine. Do nothing.
            } else {
              // The props/store is being used in an unexpected way.
              context.report({
                node: identifier,
                messageId: "badProps",
              });
            }
          }
        }
      }

      // If there are any unnamed derived signals, they must match a tracked scope expecting a function exactly.
      // Usually anonymous arrow function args to createEffect, createMemo, etc.
      const { unnamedDerivedSignals } = currentFunction();
      if (unnamedDerivedSignals) {
        for (const node of unnamedDerivedSignals) {
          if (
            !currentFunction().trackedScopes.find(
              (trackedScope) => trackedScope.expect === "function" && trackedScope.node === node
            )
          ) {
            context.report({
              loc: getFunctionHeadLocation(node, sourceCode),
              messageId: "badUnnamedDerivedSignal",
            });
          }
        }
      }

      // Pop on exit
      functionStack.pop();
    };

    /** Checks VariableDeclarators, AssignmentExpressions, and CallExpressions for reactivity. */
    const checkForReactiveAssignment = (
      id: T.BindingName | T.AssignmentExpression["left"] | null,
      init: T.Expression
    ) => {
      const { node: currentFunctionNode } = currentFunction();
      // Mark return values of certain functions as reactive
      if (init.type === "CallExpression" && init.callee.type === "Identifier") {
        const { callee } = init;
        if (callee.name === "createSignal" || callee.name === "useTransition") {
          const signal = id && getNthDestructuredVar(id, 0, context.getScope());
          if (signal) {
            currentFunction().signals.push({
              variable: signal,
              declarationScope: currentFunctionNode,
            });
          } else {
            warnShouldDestructure(id ?? init, "first");
          }
        } else if (callee.name === "createMemo" || callee.name === "createSelector") {
          const memo = id && getReturnedVar(id, context.getScope());
          // memos act like signals
          if (memo) {
            currentFunction().signals.push(ReactiveVariable(memo, currentFunctionNode));
          } else {
            warnShouldAssign(id ?? init);
          }
        } else if (callee.name === "createStore") {
          const store = id && getNthDestructuredVar(id, 0, context.getScope());
          // stores act like props
          if (store) {
            currentFunction().props.push(ReactiveVariable(store, currentFunctionNode));
          } else {
            warnShouldDestructure(id ?? init, "first");
          }
        } else if (callee.name === "mergeProps") {
          const merged = id && getReturnedVar(id, context.getScope());
          if (merged) {
            currentFunction().props.push(ReactiveVariable(merged, currentFunctionNode));
          } else {
            warnShouldAssign(id ?? init);
          }
        } else if (callee.name === "splitProps") {
          // splitProps can return an unbounded array of props variables, though it's most often two
          if (id?.type === "ArrayPattern") {
            const vars = id.elements
              .map((_, i) => getNthDestructuredVar(id, i, context.getScope()))
              .filter(Boolean);
            if (vars.length === 0) {
              warnShouldDestructure(id);
            } else {
              currentFunction().props.push(
                ...vars.map((variable) => ReactiveVariable(variable!, currentFunctionNode))
              );
            }
          } else {
            // if it's returned as an array, treat that as a props object
            const vars = id && getReturnedVar(id, context.getScope());
            if (vars) {
              currentFunction().props.push(ReactiveVariable(vars, currentFunctionNode));
            }
          }
        } else if (callee.name === "createResource") {
          // createResource return value has .loading and .error that act like signals
          const resourceReturn = id && getNthDestructuredVar(id, 0, context.getScope());
          if (resourceReturn)
            currentFunction().props.push(ReactiveVariable(resourceReturn, currentFunctionNode));
        } else if (callee.name === "createMutable") {
          const mutable = id && getReturnedVar(id, context.getScope());
          if (mutable) {
            currentFunction().props.push(ReactiveVariable(mutable, currentFunctionNode));
          }
        }
      }
    };

    const checkForTrackedScopes = (node: T.Node) => {
      const { trackedScopes } = currentFunction();
      if (node.type === "JSXExpressionContainer") {
        trackedScopes.push(TrackedScope(node, "expression"));
      } else if (node.type === "CallExpression" && node.callee.type === "Identifier") {
        const callee = node.callee;
        const arg0 = node.arguments[0];
        if (
          [
            "createMemo",
            "children",
            "createEffect",
            "onMount",
            "createRenderEffect",
            "untrack",
            "batch",
            "createDeferred",
            "createComputed",
            "createSelector",
          ].includes(callee.name) ||
          (callee.name === "createResource" && node.arguments.length >= 2)
        ) {
          // createEffect, createMemo, etc. fn arg, and createResource optional
          // `source` first argument may be a signal
          trackedScopes.push(TrackedScope(arg0, "function"));
        } else if (callee.name === "createMutable" && arg0) {
          trackedScopes.push(TrackedScope(arg0, "expression"));
        } else if (callee.name === "on") {
          // on accepts a signal or an array of signals as its first argument,
          // and a tracking function as its second
          if (arg0) {
            if (arg0.type === "ArrayExpression") {
              arg0.elements.forEach((element) => {
                trackedScopes.push(TrackedScope(element, "function"));
              });
            } else {
              trackedScopes.push(TrackedScope(arg0, "function"));
            }
          }
          if (node.arguments[1]) {
            trackedScopes.push(TrackedScope(node.arguments[1], "function"));
          }
        }
      }
    };

    return {
      JSXExpressionContainer(node: T.JSXExpressionContainer) {
        checkForTrackedScopes(node);
      },
      CallExpression(node: T.CallExpression) {
        checkForTrackedScopes(node);

        // ensure calls to reactive primitives use the results.
        if (
          node.parent?.type !== "AssignmentExpression" &&
          node.parent?.type !== "VariableDeclarator"
        ) {
          checkForReactiveAssignment(null, node);
        }
      },

      VariableDeclarator(node: T.VariableDeclarator) {
        if (node.init) {
          checkForReactiveAssignment(node.id, node.init);
        }
      },
      AssignmentExpression(node: T.AssignmentExpression) {
        if (node.left.type !== "MemberExpression") {
          checkForReactiveAssignment(node.left, node.right);
        }
      },

      /* Function enter/exit */
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      FunctionDeclaration: onFunctionEnter,
      Program: onFunctionEnter,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      "FunctionDeclaration:exit": onFunctionExit,
      "Program:exit": onFunctionExit,
      JSXElement() {
        if (functionStack.length) {
          currentFunction().hasJSX = true;
        }
      },
      JSXFragment() {
        if (functionStack.length) {
          currentFunction().hasJSX = true;
        }
      },
    };
  },
};

export default rule;
