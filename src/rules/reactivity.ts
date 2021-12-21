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
 * Find all tracked scopes in a function, and then traverse the enclosing function, skipping those scopes,
 * looking for reactive expressions and reporting them.
 *
 * Consider the following code:
 * ```
 * function Component() {
 *   const [signal, setSignal] = createSignal();
 *   const innerFn = () => signal(); // ok
 *   signal(); // not ok
 *   innerFn(); // not ok
 *   return <div>{signal()}{innerFn()}</div>; // ok
 * }
 * ```
 * It's not okay to access signals in the same scope they're declared in, but it's okay to
 * use them one or more nested functions down. However, that makes the nested functions act
 * like signals.
 */

import type { Rule, Scope } from "eslint";
import { findVariable, getInnermostScope } from "eslint-utils";
import esquery from "esquery";
import {
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  JSXExpressionContainer,
  Node,
  Program,
  ReturnStatement,
  VariableDeclaration,
  VariableDeclarator,
} from "estree-jsx";
import { isReturningJSX } from "../utils/ast";

const isCalledWithFunction = (node: CallExpression, arg: number): boolean => {
  return node.arguments.length > arg && node.arguments[arg].type.includes("FunctionExpression");
};

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce that reactive expressions (props, signals, memos, etc.) are only used in tracked scopes.",
      url: "https://github.com/joshwilsonvu/eslint-plugin-solid/blob/main/docs/reactivity.md",
    },
    fixable: "code",
    schema: [],
    messages: {},
  },
  create(context): Rule.RuleListener {
    // a rule is created for every source file, so it's reasonable to create a cache here
    // const isReactiveCache: Set<Rule.Node> = new Set();

    const sourceCode = context.getSourceCode();
    const isProps = (node: Identifier) => {
      const variable = findVariable(context.getScope(), node);
      if (variable) {
        console.log("DEFINITIONS", variable.defs);
        const def = variable.defs[variable.defs.length - 1];
        if (
          def &&
          def.type === "Parameter" &&
          def.node.params.length === 1 &&
          isReturningJSX(def.node)
        ) {
          return true;
        }
      }

      return false;
    };

    const trackedScopes = new Set<Node>();
    const components = new Set<
      FunctionExpression | ArrowFunctionExpression | FunctionDeclaration
    >();
    const signalLikes = new Set<Scope.Variable | CallExpression>();
    const propsLikes = new Set<Scope.Variable | CallExpression>();

    return {
      /* Tracking scopes: */
      JSXExpressionContainer(node: Node) {
        trackedScopes.add(node);
      },
      CallExpression(node: CallExpression) {
        // createEffect, createMemo fn arg
        if (node.callee.type !== "Identifier") {
          return; // nothing to do for member expression calls
        }
        if (
          ["createEffect", "createMemo"].includes(node.callee.name) &&
          isCalledWithFunction(node, 0)
        ) {
          trackedScopes.add(node.arguments[0]);
        } else if (
          node.callee.name === "createResource" &&
          node.arguments.length > 0 &&
          !node.arguments[0].type.includes("FunctionExpression")
        ) {
          // createResource optional `source` first argument may be a signal
          trackedScopes.add(node.arguments[0]);
        }
      },

      /* Reactive expressions: */
      VariableDeclarator(node: VariableDeclarator) {
        if (!node.init) {
          return;
        }
        const getFirstDestructuredVar = (id: Node): Scope.Variable | null => {
          if (id.type === "ArrayPattern" && id.elements[0]?.type === "Identifier") {
            return findVariable(context.getScope(), id.elements[0].name);
          }
          return null;
        };
        const getReturnedVar = (id: Node): Scope.Variable | null => {
          if (id.type === "Identifier") {
            return findVariable(context.getScope(), id.name);
          }
          return null;
        };

        // Mark return values of certain functions as reactive
        if (node.init.type === "CallExpression" && node.init.callee.type === "Identifier") {
          const { callee } = node.init;
          if (callee.name === "createSignal" || callee.name === "useTransition") {
            const signal = getFirstDestructuredVar(node.id);
            if (signal) {
              signalLikes.add(signal);
            }
          } else if (callee.name === "createMemo") {
            const memo = getReturnedVar(node.id);
            if (memo) {
              signalLikes.add(memo); // memos act like signals
            } else {
              signalLikes.add(node.init); // can be tracked as a node instead of an expression
            }
          } else if (callee.name === "createStore") {
            const store = getFirstDestructuredVar(node.id);
            if (store) {
              propsLikes.add(store); // stores act like props
            }
          }
        }
      },
    };
  },
};

export default rule;
