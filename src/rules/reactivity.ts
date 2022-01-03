/**
 * @fileoverview This rule is by far the most complex and the most important. What we need to do is ensure that all
 * usages of reactive data (that's props, signals, stores, memos, resources, results of mergeProps/splitProps, isPending)
 * are done in tracked scopes (that's component bodies, JSX attributes, effects, memos, transitions). This needs to account
 * for exceptions (on, untrack) and make sure getters are called, not passed by value alone, except where they are object
 * getters and the calling is done implicitly.
 * This doesn't forbid destructuring props, the most common mistake with Solid's reactivity, but it does forbid using
 * the destructured props. TODO: another rule could catch this sooner.
 * By definition this will involve some scope analysis, which ESLint provides. That means analysis must be done on exiting
 * nodes/code paths rather than entering. We can't find all expressions in tracked scopes and check if they are reactive,
 * because not all of those expressions need to be reactive. Instead, we find reactive expressions and iterate through their
 * usages to ensure they are used in tracked scopes.
 *
 * > Tracking scopes are functions that are passed to computations like createEffect or JSX expressions.
 * > All callback/render function children of control flow are non-tracking. This allows for nesting state creation, and better isolates reactions.
 * > Solid's compiler uses a simple heuristic for reactive wrapping and lazy evaluation of JSX expressions.
 * >   Does it contain a function call, a property access, or JSX?
 *
 * ********************************************************************************************************
 *
 * Okay, here's the architecture. Similar to how eslint-plugin-react iterates through all the components in a file, we'll
 * first find all the props (first & only argument in function containing JSX), signals, stores, memos, resources, results
 * of mergeProps/splitProps, and isPending. All of these nodes will be added to a big list. Then, we'll forEach all of the
 * usages (calls, property accesses, destructuring) of each of these values with ESLint's scope analysis, add any inline
 * functions containing one of these to the list, and grab their scopes with eslint-utils.getInnermostScope(). Using a
 * WeakMap for caching, we'll calculate if the scope is a tracking scope, and warn if a reactive value is used in a
 * non-tracked scope.
 *
 * Consider the following code:
 * ```
 * function Component() {
 *   const [signal, setSignal] = createSignal();
 *   const innerFn = () => signal(); // ok
 *   signal(); // not ok
 *   innerFn(); // not ok
 *   (() => {
 *     signal();
 *   })(); // not ok, enclosing function becomes reactive
 *   return <div>{signal()}{innerFn()}</div>; // ok
 * }
 *
 * let c = () => {
 *   const [signal] = createSignal();
 *   const d = () => {
 *     const e = () => {  <-- e becomes a signal
 *       signal();
 *     }
 *   }  <-- d never uses it
 *   d();  <-- this is fine
 * };
 *
 * ```
 * It's not okay to access signals in the same scope they're declared in, but it's okay to
 * use them one or more nested functions down. However, that makes the nested functions act
 * like signals.
 *
 * When we go into a nested function scope, it becomes okay to use reactive expressions outside
 * of tracked scopes, but the function becomes reactive. When we step out of a function scope,
 * we can discard all the information within the function as long as it's been processed. This means
 * we can do a nice little stack-based machine.
 */

import { Rule, RuleTester, Scope } from "eslint";
import { findVariable, getFunctionHeadLocation, getFunctionNameWithKind } from "eslint-utils";
import {
  Expression,
  CallExpression,
  Identifier,
  Node,
  Program,
  VariableDeclarator,
  Pattern,
  AssignmentExpression,
  MemberExpression,
} from "estree-jsx";
import {
  findParent,
  findParentInFunction,
  isPropsByName,
  FunctionNode,
  isFunctionNode,
  ProgramOrFunctionNode,
  isProgramOrFunctionNode,
} from "../utils";

interface ReactiveVariable {
  /** The reactive variable. */
  variable: Scope.Variable;
  /**
   * The function node in which the reactive variable was declared, or for a derived signal (function),
   * the deepest function node that declares a referenced signal. */
  declarationScope: ProgramOrFunctionNode;
}
const ReactiveVariable = (variable: Scope.Variable, declarationScope: ProgramOrFunctionNode) => ({
  variable,
  declarationScope,
});

// interface ReactiveReference {
//   /** The reference to a reactive variable. */
//   reference: Scope.Reference;
//   /**
//    * The function node in which the reactive variable was declared, or for a derived signal (function),
//    * the deepest function node that contains . */
//   declarationScope: ProgramOrFunctionNode;
// }

interface FunctionStackItem {
  /** the node for the current function, or program if global scope */
  node: ProgramOrFunctionNode;
  /** nodes whose descendants in the current function are allowed to be reactive */
  trackedScopes: Array<Node>;
  /** variable references to be treated as signals, memos, derived signals, etc. */
  signals: Array<ReactiveVariable>;
  /** variables references to be treated as props (or stores) */
  props: Array<ReactiveVariable>;
  /** switched to true by time of :exit if JSX is detected in the current function */
  hasJSX: boolean;
}

const isDescendantNotInNestedFunction = (child: Rule.Node, parent: Rule.Node | Program) =>
  findParent(child, (n) => n === parent || isFunctionNode(n)) === parent;

const getNthDestructuredVar = (
  id: Rule.Node,
  n: number,
  scope: Scope.Scope
): Scope.Variable | null => {
  if (id?.type === "ArrayPattern") {
    const el = id.elements[n];
    if (el?.type === "Identifier") {
      return findVariable(scope, el.name);
    }
  }
  return null;
};
const getReturnedVar = (id: Rule.Node, scope: Scope.Scope): Scope.Variable | null => {
  if (id.type === "Identifier") {
    return findVariable(scope, id.name);
  }
  return null;
};

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
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
      shouldDestructure:
        "Array destructuring should be used to capture the {{nth}}result of this function call.",
      shouldAssign: "A variable should be used to capture the result of this function call.",
      reactiveFunctionNeedsName:
        "This function should be given a name so it can be properly analyzed.",
    },
  },
  create(context): Rule.RuleListener {
    const warnShouldDestructure = (node: Omit<Rule.Node, "parent">, nth?: string) =>
      context.report({
        node: node as Rule.Node,
        messageId: "shouldDestructure",
        data: nth ? { nth: nth + " " } : undefined,
      });
    const warnShouldAssign = (node: Omit<Rule.Node, "parent">) =>
      context.report({ node: node as Rule.Node, messageId: "shouldAssign" });

    const sourceCode = context.getSourceCode();

    /** Represents the lexical function stack and relevant information for each function */
    const functionStack: Array<FunctionStackItem> = [];
    const currentFunction = () => functionStack[functionStack.length - 1];

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

    const checkForReactiveAssignment = (
      id: (Pattern & Rule.NodeParentExtension) | null,
      init: Rule.Node
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
        } else if (callee.name === "createMemo") {
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
          const split = id && getNthDestructuredVar(id, 0, context.getScope());
          const rest = id && getNthDestructuredVar(id, 1, context.getScope());
          if (split) currentFunction().props.push(ReactiveVariable(split, currentFunctionNode));
          if (rest) currentFunction().props.push(ReactiveVariable(rest, currentFunctionNode));
          if (!split && !rest) warnShouldDestructure(init, "first or second"); // can omit one or other but not both
        }
      }
    };

    /** Performs all analysis and reporting. */
    const onFunctionExit = () => {
      // If this function is a component, add its props as a reactive variable
      const { node: currentFunctionNode } = currentFunction();
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

      // Check all the signals on the functionStack
      function* iterateSignals(): Iterable<ReactiveVariable> {
        for (let i = functionStack.length - 1; i >= 0; i -= 1) {
          yield* functionStack[i].signals;
        }
      }

      function* iterateProps(): Iterable<ReactiveVariable> {
        for (let i = functionStack.length - 1; i >= 0; i -= 1) {
          yield* functionStack[i].props;
        }
      }

      const handleTrackedScopes = (
        reference: Scope.Reference,
        declarationScope: ProgramOrFunctionNode
      ) => {
        // Check if the call falls outside any tracked scopes in the current function
        if (
          !currentFunction().trackedScopes.some((trackedScope) =>
            findParentInFunction(
              reference.identifier as Identifier & Rule.NodeParentExtension,
              (node) => node === trackedScope
            )
          )
        ) {
          if (declarationScope === currentFunctionNode) {
            // If the reactivity is not contained in a tracked scope, and any of the reactive variables were
            // declared in the current function scope, then we report them. When the reference is to an object
            // in a MemberExpression (props/store) or a function call (signal), report that, otherwise the identifier.
            const identifier = reference.identifier as Identifier & Rule.NodeParentExtension;
            let parentMemberExpression: (MemberExpression & Rule.NodeParentExtension) | null = null;
            if (identifier.parent.type === "MemberExpression") {
              parentMemberExpression = identifier.parent;
              while (parentMemberExpression.parent.type === "MemberExpression") {
                parentMemberExpression = parentMemberExpression.parent;
              }
            }
            const parentCallExpression =
              identifier.parent.type === "CallExpression" ? identifier.parent : null;
            context.report({
              node: parentMemberExpression ?? parentCallExpression ?? identifier,
              messageId: "untrackedReactive",
              data: { name: identifier.name },
            });
          } else {
            // If any of the reactive variables were declared *above* the current function scope, then
            // the entire function becomes reactive with the deepest declaration scope of the reactive
            // variables it contains. Let the next onFunctionExit up handle it.
            const parentFunction = functionStack[functionStack.length - 2];
            if (!parentFunction) {
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
                return reactiveVariable;
              }
              signal.declarationScope = findDeepestDeclarationScope(
                signal.declarationScope,
                reactiveVariable.declarationScope
              );
              return signal;
            };
            // get variable representing function, function node only defines one variable
            let functionVariable: Scope.Variable | undefined =
              sourceCode.scopeManager.getDeclaredVariables(currentFunctionNode)[0];
            if (functionVariable) {
              pushUniqueDerivedSignal(
                ReactiveVariable(
                  functionVariable,
                  declarationScope // use declaration scope of a signal contained in this function
                )
              );
            } else if (currentFunctionNode.parent?.type === "VariableDeclarator") {
              const declarator = currentFunctionNode.parent as VariableDeclarator;
              // for nameless or arrow function expressions, use the declared variable it's assigned to
              functionVariable = sourceCode.scopeManager.getDeclaredVariables(declarator)[0];
              if (functionVariable) {
                // use declaration scope of a signal contained in this function
                pushUniqueDerivedSignal(ReactiveVariable(functionVariable, declarationScope));
              } else {
                if (isFunctionNode(currentFunctionNode)) {
                  // Nameless function! Can't analyze, warn.
                  context.report({
                    loc: getFunctionHeadLocation(currentFunctionNode, sourceCode),
                    messageId: "reactiveFunctionNeedsName",
                  });
                } else {
                  // At top level, no way to bubble up any further. SHOULDN'T HAPPEN
                  throw new Error("this shouldn't happen either");
                }
              }
            }
          }
        }
      };

      // Iterate through all usages of (derived) signals in the current function (this is O(signals * references * depth) but typically not large)
      for (const { variable, declarationScope } of iterateSignals()) {
        for (const reference of variable.references) {
          // this type cast is safe, see https://github.com/typescript-eslint/typescript-eslint/issues/1417
          const identifier = reference.identifier as Identifier & Rule.NodeParentExtension;
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
              identifier.parent?.type === "CallExpression" &&
              identifier.parent.callee === identifier
            ) {
              // This signal is getting called properly, analyze it.
              handleTrackedScopes(reference, declarationScope);
            } else {
              // The signal is getting used in an unexpected way
              context.report({
                node: reference.identifier,
                messageId: "badSignal",
              });
            }
          }
        }
      }

      // Do a similar thing with all usages of props in the current function
      for (const { variable, declarationScope } of iterateProps()) {
        for (const reference of variable.references) {
          // this type cast is safe, see https://github.com/typescript-eslint/typescript-eslint/issues/1417
          const identifier = reference.identifier as Identifier & Rule.NodeParentExtension;
          if (
            !reference.init &&
            isDescendantNotInNestedFunction(
              identifier as Identifier & Rule.NodeParentExtension,
              currentFunctionNode
            )
          ) {
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
                handleTrackedScopes(reference, declarationScope);
              }
            } else if (
              (identifier.parent?.type === "CallExpression" &&
                identifier.parent.arguments.includes(identifier)) ||
              (identifier.parent as Node | undefined)?.type === "JSXSpreadAttribute" ||
              identifier.parent?.type === "AssignmentExpression"
            ) {
              // The props are being passed to a function (mergeProps, splitProps, custom hook) or spread
              // into JSX (<div {...props} />), which are both generally fine. Do nothing.
            } else {
              // The props/store is being used in an unexpected way.
              context.report({
                node: reference.identifier,
                messageId: "badProps",
                data: {
                  memberExpression: reference.identifier.name,
                },
              });
            }
          }
        }
      }

      // Pop on exit
      functionStack.pop();
    };

    return {
      /* Tracking scopes: */
      JSXExpressionContainer(node: Rule.Node) {
        const { trackedScopes } = currentFunction();
        trackedScopes.push(node);
      },
      CallExpression(node: CallExpression & Rule.NodeParentExtension) {
        const { trackedScopes } = currentFunction();

        if (node.callee.type !== "Identifier") {
          return; // nothing to do for member expression calls
        }
        if (
          ["createEffect", "createMemo", "onMount", "createRenderEffect"].includes(node.callee.name)
        ) {
          // createEffect, createMemo fn arg
          trackedScopes.push(node.arguments[0]);
        } else if (
          node.callee.name === "createResource" &&
          node.arguments.length > 0 &&
          !isFunctionNode(node.arguments[0] as Expression & Rule.NodeParentExtension)
        ) {
          // createResource optional `source` first argument may be a signal
          trackedScopes.push(node.arguments[0]);
        }

        if (
          node.parent?.type !== "AssignmentExpression" &&
          node.parent?.type !== "VariableDeclarator"
        ) {
          // Ensure calls that produce reactive variables use the results.
          checkForReactiveAssignment(null, node);
        }
      },

      /* Reactive expressions: */
      VariableDeclarator(node: VariableDeclarator & Rule.NodeParentExtension) {
        if (node.init) {
          checkForReactiveAssignment(
            node.id as Pattern & Rule.NodeParentExtension,
            node.init as Rule.Node
          );
        }
      },
      AssignmentExpression(node: AssignmentExpression & Rule.NodeParentExtension) {
        if (node.left.type !== "MemberExpression" && node.right) {
          checkForReactiveAssignment(
            node.left as typeof node.left & Rule.NodeParentExtension,
            node.right as Expression & Rule.NodeParentExtension
          );
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
