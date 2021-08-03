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
 */

/* eslint-disable */

import type { Rule } from "eslint";
import esquery from "esquery";

const find = (
  node: Rule.Node,
  predicate: (node: Rule.Node) => boolean | Rule.Node
): Rule.Node | null => {
  let n = node;
  while (n) {
    const result = predicate(n);
    if (result === true) {
      return n;
    } else if (result && typeof result.type === "string") {
      return result; // could be n's sibling, child, parent, etc., depends on predicate
    }
    n = n.parent;
  }
  return null;
};
const findParent = (node: Rule.Node, predicate: (node: Rule.Node) => boolean | Rule.Node) =>
  find(node.parent, predicate);

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
