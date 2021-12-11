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
 */

/* eslint-disable */

import type { Rule } from "eslint";
import esquery from "esquery";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ensures that component props are evaluated lazily, not destructured, ",
    },
    messages: {},
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    // a rule is created for every source file, so it's reasonable to create a cache here
    // const isReactiveCache: Set<Rule.Node> = new Set();
    return {};
  },
};

export default rule;
