/**
 * File overview here, scroll to bottom.
 * @link https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/reactivity.md
 */

import { TSESTree as T, TSESLint, ESLintUtils, ASTUtils } from "@typescript-eslint/utils";
import {
  findParent,
  findInScope,
  isPropsByName,
  FunctionNode,
  isFunctionNode,
  ProgramOrFunctionNode,
  isProgramOrFunctionNode,
  trackImports,
  isDOMElementName,
  ignoreTransparentWrappers,
} from "../utils";

const { findVariable, getFunctionHeadLocation } = ASTUtils;
const createRule = ESLintUtils.RuleCreator.withoutDocs;

type Scope = TSESLint.Scope.Scope;
type Variable = TSESLint.Scope.Variable;
type Reference = TSESLint.Scope.Reference;

interface ReactiveVariable {
  /**
   * The reactive variable references we're concerned with (i.e. not init).
   * References are removed after they are analyzed.
   */
  references: Array<Reference>;
  /**
   * The function node in which the reactive variable was declared, or for a
   * derived signal (function), the deepest function node that declares a
   * referenced signal.
   */
  declarationScope: ProgramOrFunctionNode;
  /**
   * The reactive variable. Not used directly, only needed for identification
   * in pushUniqueDerivedSignal.
   */
  variable: Variable;
}

interface TrackedScope {
  /**
   * The root node, usually a function or JSX expression container, to allow
   * reactive variables under.
   */
  node: T.Node;
  /**
   * The reactive variable should be one of these types:
   * - "function": synchronous function or signal variable
   * - "called-function": synchronous or asynchronous function like a timer or
   *   event handler that isn't really a tracked scope but allows reactivity
   * - "expression": some value containing reactivity somewhere
   */
  expect: "function" | "called-function" | "expression";
}

class ScopeStackItem {
  /** the node for the current scope, or program if global scope */
  node: ProgramOrFunctionNode;
  /**
   * nodes whose descendants in the current scope are allowed to be reactive.
   * JSXExpressionContainers can be any expression containing reactivity, while
   * function nodes/identifiers are typically arguments to solid-js primitives
   * and should match a tracked scope exactly.
   */
  trackedScopes: Array<TrackedScope> = [];
  /** nameless functions with reactivity, should exactly match a tracked scope */
  unnamedDerivedSignals = new Set<FunctionNode>();
  /** switched to true by time of :exit if JSX is detected in the current scope */
  hasJSX = false;

  constructor(node: ProgramOrFunctionNode) {
    this.node = node;
  }
}

class ScopeStack extends Array<ScopeStackItem> {
  currentScope = () => this[this.length - 1];
  parentScope = () => this[this.length - 2];

  /** Add references to a signal, memo, derived signal, etc. */
  pushSignal(
    variable: Variable,
    declarationScope: ProgramOrFunctionNode = this.currentScope().node
  ) {
    this.signals.push({
      references: variable.references.filter((reference) => !reference.init),
      variable,
      declarationScope,
    });
  }

  /**
   * Add references to a signal, merging with existing references if the
   * variable is the same. Derived signals are special; they don't use the
   * declaration scope of the function, but rather the minimum declaration scope
   * of any signals they contain.
   */
  pushUniqueSignal(variable: Variable, declarationScope: ProgramOrFunctionNode) {
    const foundSignal = this.signals.find((s) => s.variable === variable);
    if (!foundSignal) {
      this.pushSignal(variable, declarationScope);
    } else {
      foundSignal.declarationScope = this.findDeepestDeclarationScope(
        foundSignal.declarationScope,
        declarationScope
      );
    }
  }

  /** Add references to a props or store. */
  pushProps(
    variable: Variable,
    declarationScope: ProgramOrFunctionNode = this.currentScope().node
  ) {
    this.props.push({
      references: variable.references.filter((reference) => !reference.init),
      variable,
      declarationScope,
    });
  }

  /** Function callbacks that run synchronously and don't create a new scope. */
  syncCallbacks = new Set<FunctionNode>();

  /**
   * Iterate through and remove the signal references in the current scope.
   * That way, the next Scope up can safely check for references in its scope.
   */
  *consumeSignalReferencesInScope() {
    yield* this.consumeReferencesInScope(this.signals);
    this.signals = this.signals.filter((variable) => variable.references.length !== 0);
  }

  /** Iterate through and remove the props references in the current scope. */
  *consumePropsReferencesInScope() {
    yield* this.consumeReferencesInScope(this.props);
    this.props = this.props.filter((variable) => variable.references.length !== 0);
  }

  private *consumeReferencesInScope(
    variables: Array<ReactiveVariable>
  ): Iterable<{ reference: Reference; declarationScope: ProgramOrFunctionNode }> {
    for (const variable of variables) {
      const { references } = variable;
      const inScope: Array<Reference> = [],
        notInScope: Array<Reference> = [];
      references.forEach((reference) => {
        if (this.isReferenceInCurrentScope(reference)) {
          inScope.push(reference);
        } else {
          notInScope.push(reference);
        }
      });
      yield* inScope.map((reference) => ({
        reference,
        declarationScope: variable.declarationScope,
      }));
      // I don't think this is needed! Just a perf optimization
      variable.references = notInScope;
    }
  }

  /** Returns the function node deepest in the tree. Assumes a === b, a is inside b, or b is inside a. */
  private findDeepestDeclarationScope = (
    a: ProgramOrFunctionNode,
    b: ProgramOrFunctionNode
  ): ProgramOrFunctionNode => {
    if (a === b) return a;
    for (let i = this.length - 1; i >= 0; i -= 1) {
      const { node } = this[i];
      if (a === node || b === node) {
        return node;
      }
    }
    throw new Error("This should never happen");
  };

  /**
   * Returns true if the reference is in the current scope, handling sync
   * callbacks. Must be called on the :exit pass only.
   */
  private isReferenceInCurrentScope(reference: Reference) {
    let parentFunction = findParent(reference.identifier, isProgramOrFunctionNode);
    while (isFunctionNode(parentFunction) && this.syncCallbacks.has(parentFunction)) {
      parentFunction = findParent(parentFunction, isProgramOrFunctionNode);
    }
    return parentFunction === this.currentScope().node;
  }

  /** variable references to be treated as signals, memos, derived signals, etc. */
  private signals: Array<ReactiveVariable> = [];
  /** variables references to be treated as props (or stores) */
  private props: Array<ReactiveVariable> = [];
}

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

export default createRule({
  meta: {
    type: "problem",
    docs: {
      recommended: "warn",
      description:
        "Enforce that reactivity (props, signals, memos, etc.) is properly used, so changes in those values will be tracked and update the view as expected.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/reactivity.md",
    },
    schema: [],
    messages: {
      noWrite: "The reactive variable '{{name}}' should not be reassigned or altered directly.",
      untrackedReactive:
        "The reactive variable '{{name}}' should be used within JSX, a tracked scope (like createEffect), or inside an event handler function, or else changes will be ignored.",
      expectedFunctionGotExpression:
        "The reactive variable '{{name}}' should be wrapped in a function for reactivity. This includes event handler bindings on native elements, which are not reactive like other JSX props.",
      badSignal:
        "The reactive variable '{{name}}' should be called as a function when used in {{where}}.",
      badUnnamedDerivedSignal:
        "This function should be passed to a tracked scope (like createEffect) or an event handler because it contains reactivity, or else changes will be ignored.",
      shouldDestructure:
        "For proper analysis, array destructuring should be used to capture the {{nth}}result of this function call.",
      shouldAssign:
        "For proper analysis, a variable should be used to capture the result of this function call.",
      noAsyncTrackedScope:
        "This tracked scope should not be async. Solid's reactivity only tracks synchronously.",
    },
  },
  defaultOptions: [] as const,
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
    const scopeStack = new ScopeStack();
    const { currentScope, parentScope } = scopeStack;

    /** Tracks imports from 'solid-js', handling aliases. */
    const { matchImport, handleImportDeclaration } = trackImports();

    /** Workaround for #61 */
    const markPropsOnCondition = (node: FunctionNode, cb: (props: T.Identifier) => boolean) => {
      if (
        node.params.length === 1 &&
        node.params[0].type === "Identifier" &&
        node.parent?.type !== "JSXExpressionContainer" && // "render props" aren't components
        node.parent?.type !== "TemplateLiteral" && // inline functions in tagged template literals aren't components
        cb(node.params[0])
      ) {
        // This function is a component, consider its parameter a props
        const propsParam = findVariable(context.getScope(), node.params[0]);
        if (propsParam) {
          scopeStack.pushProps(propsParam, node);
        }
      }
    };

    /** Populates the function stack. */
    const onFunctionEnter = (node: ProgramOrFunctionNode) => {
      if (isFunctionNode(node)) {
        markPropsOnCondition(node, (props) => isPropsByName(props.name));
        if (scopeStack.syncCallbacks.has(node)) {
          // Ignore sync callbacks like Array#forEach and certain Solid primitives
          return;
        }
      }
      scopeStack.push(new ScopeStackItem(node));
    };

    /** Returns whether a node falls under a tracked scope in the current function scope */
    const matchTrackedScope = (trackedScope: TrackedScope, node: T.Node): boolean => {
      switch (trackedScope.expect) {
        case "function":
        case "called-function":
          return node === trackedScope.node;
        case "expression":
          return Boolean(
            findInScope(node, currentScope().node, (node) => node === trackedScope.node)
          );
      }
    };

    /** Inspects a specific reference of a reactive variable for correct handling. */
    const handleTrackedScopes = (
      identifier: T.Identifier,
      declarationScope: ProgramOrFunctionNode
    ) => {
      const currentScopeNode = currentScope().node;
      // Check if the call falls outside any tracked scopes in the current scope
      if (
        !currentScope().trackedScopes.find((trackedScope) =>
          matchTrackedScope(trackedScope, identifier)
        )
      ) {
        const matchedExpression = currentScope().trackedScopes.find((trackedScope) =>
          matchTrackedScope({ ...trackedScope, expect: "expression" }, identifier)
        );
        if (declarationScope === currentScopeNode) {
          // If the reactivity is not contained in a tracked scope, and any of
          // the reactive variables were declared in the current scope, then we
          // report them. When the reference is to an object in a
          // MemberExpression (props/store) or a function call (signal), report
          // that, otherwise the identifier.
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
            messageId: matchedExpression ? "expectedFunctionGotExpression" : "untrackedReactive",
            data: {
              name: parentMemberExpression
                ? sourceCode.getText(parentMemberExpression)
                : identifier.name,
            },
          });
        } else {
          // If all of the reactive variables were declared above the current
          // function scope, then the entire function becomes reactive with the
          // deepest declaration scope of the reactive variables it contains.
          // Let the next onFunctionExit up handle it.
          if (!parentScope() || !isFunctionNode(currentScopeNode)) {
            throw new Error("this shouldn't happen!");
          }

          // If the current function doesn't have an associated variable, that's
          // fine, it's being used inline (i.e. anonymous arrow function). For
          // this to be okay, the arrow function has to be the same node as one
          // of the tracked scopes, as we can't easily find references.
          const pushUnnamedDerivedSignal = () =>
            (parentScope().unnamedDerivedSignals ??= new Set()).add(currentScopeNode);

          if (currentScopeNode.type === "FunctionDeclaration") {
            // get variable representing function, function node only defines one variable
            const functionVariable: Variable | undefined =
              sourceCode.scopeManager?.getDeclaredVariables(currentScopeNode)?.[0];
            if (functionVariable) {
              scopeStack.pushUniqueSignal(
                functionVariable,
                declarationScope // use declaration scope of a signal contained in this function
              );
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentScopeNode.parent?.type === "VariableDeclarator") {
            const declarator = currentScopeNode.parent;
            // for nameless or arrow function expressions, use the declared variable it's assigned to
            const functionVariable = sourceCode.scopeManager?.getDeclaredVariables(declarator)?.[0];
            if (functionVariable) {
              // use declaration scope of a signal contained in this scope, not the function itself
              scopeStack.pushUniqueSignal(functionVariable, declarationScope);
            } else {
              pushUnnamedDerivedSignal();
            }
          } else if (currentScopeNode.parent?.type === "Property") {
            // todo make this a unique props or something--for now, just ignore (unsafe)
          } else {
            pushUnnamedDerivedSignal();
          }
        }
      }
    };

    /** Performs all analysis and reporting. */
    const onFunctionExit = (currentScopeNode: ProgramOrFunctionNode) => {
      // If this function is a component, add its props as a reactive variable
      if (isFunctionNode(currentScopeNode)) {
        markPropsOnCondition(
          currentScopeNode,
          (props) =>
            !isPropsByName(props.name) && // already added in markPropsOnEnter
            currentScope().hasJSX &&
            // begins with lowercase === not component
            (currentScopeNode.type !== "FunctionDeclaration" ||
              !currentScopeNode.id?.name?.match(/^[a-z]/))
        );
      }

      // Ignore sync callbacks like Array#forEach and certain Solid primitives.
      // In this case only, currentScopeNode !== currentScope().node, but we're
      // returning early so it doesn't matter.
      if (isFunctionNode(currentScopeNode) && scopeStack.syncCallbacks.has(currentScopeNode)) {
        return;
      }

      // Iterate through all usages of (derived) signals in the current scope
      for (const { reference, declarationScope } of scopeStack.consumeSignalReferencesInScope()) {
        const identifier = reference.identifier;
        if (reference.isWrite()) {
          // don't allow reassigning signals
          context.report({
            node: identifier,
            messageId: "noWrite",
            data: {
              name: identifier.name,
            },
          });
        } else if (identifier.type === "Identifier") {
          const reportBadSignal = (where: string) =>
            context.report({
              node: identifier,
              messageId: "badSignal",
              data: { name: identifier.name, where },
            });
          if (
            // This allows both calling a signal and calling a function with a signal.
            identifier.parent?.type === "CallExpression" ||
            // Also allow the case where we pass an array of signals, such as in a custom hook
            (identifier.parent?.type === "ArrayExpression" &&
              identifier.parent.parent?.type === "CallExpression")
          ) {
            // This signal is getting called properly, analyze it.
            handleTrackedScopes(identifier, declarationScope);
          } else if (identifier.parent?.type === "TemplateLiteral") {
            reportBadSignal("template literals");
          } else if (
            identifier.parent?.type === "BinaryExpression" &&
            [
              "<",
              "<=",
              ">",
              ">=",
              "<<",
              ">>",
              ">>>",
              "+",
              "-",
              "*",
              "/",
              "%",
              "**",
              "|",
              "^",
              "&",
              "in",
            ].includes(identifier.parent.operator)
          ) {
            // We're in an arithmetic/comparison expression where using an uncalled signal wouldn't make sense
            reportBadSignal("arithmetic or comparisons");
          } else if (
            identifier.parent?.type === "UnaryExpression" &&
            ["-", "+", "~"].includes(identifier.parent.operator)
          ) {
            // We're in a unary expression where using an uncalled signal wouldn't make sense
            reportBadSignal("unary expressions");
          } else if (
            identifier.parent?.type === "MemberExpression" &&
            identifier.parent.computed &&
            identifier.parent.property === identifier
          ) {
            // We're using an uncalled signal to index an object or array, which doesn't make sense
            reportBadSignal("property accesses");
          } else if (
            identifier.parent?.type === "JSXExpressionContainer" &&
            !currentScope().trackedScopes.find(
              (trackedScope) =>
                trackedScope.node === identifier &&
                (trackedScope.expect === "function" || trackedScope.expect === "called-function")
            )
          ) {
            // If the signal is in a JSXExpressionContainer that's also marked as a "function" or "called-function" tracked scope,
            // let it be.
            const elementOrAttribute = identifier.parent.parent;
            if (
              // The signal is not being called and is being used as a props.children, where calling
              // the signal was the likely intent.
              elementOrAttribute?.type === "JSXElement" ||
              // We can't say for sure about user components, but we know for a fact that a signal
              // should not be passed to a non-event handler DOM element attribute without calling it.
              (elementOrAttribute?.type === "JSXAttribute" &&
                elementOrAttribute.parent?.type === "JSXOpeningElement" &&
                elementOrAttribute.parent.name.type === "JSXIdentifier" &&
                isDOMElementName(elementOrAttribute.parent.name.name))
            ) {
              reportBadSignal("JSX");
            }
          }
        }
        // The signal is being read outside of a CallExpression. Since
        // there's a lot of possibilities here and they're generally fine,
        // do nothing.
      }

      // Do a similar thing with all usages of props in the current function
      for (const { reference, declarationScope } of scopeStack.consumePropsReferencesInScope()) {
        const identifier = reference.identifier;
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
          const { parent } = identifier;
          if (parent.parent?.type === "AssignmentExpression" && parent.parent.left === parent) {
            // don't allow writing to props or stores directly
            context.report({
              node: identifier,
              messageId: "noWrite",
              data: {
                name: identifier.name,
              },
            });
          } else if (
            parent.property.type === "Identifier" &&
            /^(?:initial|default|static)[A-Z]/.test(parent.property.name)
          ) {
            // We're using a prop with a name that starts with `initial` or
            // `default`, like `props.initialCount`. We'll refrain from warning
            // about untracked usages of these props, because the user has shown
            // that they understand the consequences of using a reactive
            // variable to initialize something else. Do nothing.
          } else {
            // The props are the object in a property read access, which
            // should be under a tracked scope.
            handleTrackedScopes(identifier, declarationScope);
          }
        } else if (
          identifier.parent?.type === "AssignmentExpression" ||
          identifier.parent?.type === "VariableDeclarator"
        ) {
          // There's no reason to allow `... = props`, it's usually destructuring, which breaks reactivity.
          context.report({
            node: identifier,
            messageId: "untrackedReactive",
            data: { name: identifier.name },
          });
        }
        // The props are being read, but not in a MemberExpression. Since
        // there's a lot of possibilities here and they're generally fine,
        // do nothing.
      }

      // If there are any unnamed derived signals, they must match a tracked
      // scope exactly. Usually anonymous arrow function args to createEffect,
      // createMemo, etc.
      const { unnamedDerivedSignals } = currentScope();
      if (unnamedDerivedSignals) {
        for (const node of unnamedDerivedSignals) {
          if (
            !currentScope().trackedScopes.find(
              (trackedScope) =>
                trackedScope.node === node &&
                (trackedScope.expect === "function" || trackedScope.expect === "called-function")
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
      scopeStack.pop();
    };

    /*
     * Sync array functions (forEach, map, reduce, reduceRight, flatMap),
     * store update fn params (ex. setState("todos", (t) => [...t.slice(0, i()),
     * ...t.slice(i() + 1)])), batch, onCleanup, and onError fn params, and
     * maybe a few others don't actually create a new scope. That is, any
     * signal/prop accesses in these functions act as if they happen in the
     * enclosing function. Note that this means whether or not the enclosing
     * function is a tracking scope applies to the fn param as well.
     *
     * Every time a sync callback is detected, we put that function node into a
     * syncCallbacks Set<FunctionNode>. The detections must happen on the entry pass
     * and when the function node has not yet been traversed. In onFunctionEnter, if
     * the function node is in syncCallbacks, we don't push it onto the
     * scopeStack. In onFunctionExit, if the function node is in syncCallbacks,
     * we don't pop scopeStack.
     */
    const checkForSyncCallbacks = (node: T.CallExpression) => {
      if (
        node.arguments.length === 1 &&
        isFunctionNode(node.arguments[0]) &&
        !node.arguments[0].async
      ) {
        if (
          node.callee.type === "Identifier" &&
          matchImport(["batch", "produce"], node.callee.name)
        ) {
          // These Solid APIs take callbacks that run in the current scope
          scopeStack.syncCallbacks.add(node.arguments[0]);
        } else if (
          node.callee.type === "MemberExpression" &&
          !node.callee.computed &&
          node.callee.object.type !== "ObjectExpression" &&
          /^(?:forEach|map|flatMap|reduce|reduceRight|find|findIndex|filter|every|some)$/.test(
            node.callee.property.name
          )
        ) {
          // These common array methods (or likely array methods) take synchronous callbacks
          scopeStack.syncCallbacks.add(node.arguments[0]);
        }
      }
      if (node.callee.type === "Identifier") {
        if (
          matchImport(["createSignal", "createStore"], node.callee.name) &&
          node.parent?.type === "VariableDeclarator"
        ) {
          // Allow using reactive variables in state setter if the current scope is tracked.
          // ex.  const [state, setState] = createStore({ ... });
          //      setState(() => ({ preferredName: state.firstName, lastName: "Milner" }));
          const setter = getNthDestructuredVar(node.parent.id, 1, context.getScope());
          if (setter) {
            for (const reference of setter.references) {
              const { identifier } = reference;
              if (
                !reference.init &&
                reference.isRead() &&
                identifier.parent?.type === "CallExpression"
              ) {
                for (const arg of identifier.parent.arguments) {
                  if (isFunctionNode(arg) && !arg.async) {
                    scopeStack.syncCallbacks.add(arg);
                  }
                }
              }
            }
          }
        } else if (matchImport(["mapArray", "indexArray"], node.callee.name)) {
          const arg1 = node.arguments[1];
          if (isFunctionNode(arg1)) {
            scopeStack.syncCallbacks.add(arg1);
          }
        }
      }
      // Handle IIFEs
      if (isFunctionNode(node.callee)) {
        scopeStack.syncCallbacks.add(node.callee);
      }
    };

    /** Checks VariableDeclarators, AssignmentExpressions, and CallExpressions for reactivity. */
    const checkForReactiveAssignment = (
      id: T.BindingName | T.AssignmentExpression["left"] | null,
      init: T.Node
    ) => {
      init = ignoreTransparentWrappers(init);

      // Mark return values of certain functions as reactive
      if (init.type === "CallExpression" && init.callee.type === "Identifier") {
        const { callee } = init;
        if (matchImport(["createSignal", "useTransition"], callee.name)) {
          const signal = id && getNthDestructuredVar(id, 0, context.getScope());
          if (signal) {
            scopeStack.pushSignal(signal, currentScope().node);
          } else {
            warnShouldDestructure(id ?? init, "first");
          }
        } else if (matchImport(["createMemo", "createSelector"], callee.name)) {
          const memo = id && getReturnedVar(id, context.getScope());
          // memos act like signals
          if (memo) {
            scopeStack.pushSignal(memo, currentScope().node);
          } else {
            warnShouldAssign(id ?? init);
          }
        } else if (matchImport("createStore", callee.name)) {
          const store = id && getNthDestructuredVar(id, 0, context.getScope());
          // stores act like props
          if (store) {
            scopeStack.pushProps(store, currentScope().node);
          } else {
            warnShouldDestructure(id ?? init, "first");
          }
        } else if (matchImport("mergeProps", callee.name)) {
          const merged = id && getReturnedVar(id, context.getScope());
          if (merged) {
            scopeStack.pushProps(merged, currentScope().node);
          } else {
            warnShouldAssign(id ?? init);
          }
        } else if (matchImport("splitProps", callee.name)) {
          // splitProps can return an unbounded array of props variables, though it's most often two
          if (id?.type === "ArrayPattern") {
            const vars = id.elements
              .map((_, i) => getNthDestructuredVar(id, i, context.getScope()))
              .filter(Boolean) as Array<Variable>;
            if (vars.length === 0) {
              warnShouldDestructure(id);
            } else {
              vars.forEach((variable) => {
                scopeStack.pushProps(variable, currentScope().node);
              });
            }
          } else {
            // if it's returned as an array, treat that as a props object
            const vars = id && getReturnedVar(id, context.getScope());
            if (vars) {
              scopeStack.pushProps(vars, currentScope().node);
            }
          }
        } else if (matchImport("createResource", callee.name)) {
          // createResource return value has reactive .loading and .error
          const resourceReturn = id && getNthDestructuredVar(id, 0, context.getScope());
          if (resourceReturn) {
            scopeStack.pushProps(resourceReturn, currentScope().node);
          }
        } else if (matchImport("createMutable", callee.name)) {
          const mutable = id && getReturnedVar(id, context.getScope());
          if (mutable) {
            scopeStack.pushProps(mutable, currentScope().node);
          }
        } else if (matchImport("mapArray", callee.name)) {
          const arg1 = init.arguments[1];
          if (
            isFunctionNode(arg1) &&
            arg1.params.length >= 2 &&
            arg1.params[1].type === "Identifier"
          ) {
            const indexSignal = findVariable(context.getScope(), arg1.params[1]);
            if (indexSignal) {
              scopeStack.pushSignal(indexSignal);
            }
          }
        } else if (matchImport("indexArray", callee.name)) {
          const arg1 = init.arguments[1];
          if (
            isFunctionNode(arg1) &&
            arg1.params.length >= 1 &&
            arg1.params[0].type === "Identifier"
          ) {
            const valueSignal = findVariable(context.getScope(), arg1.params[0]);
            if (valueSignal) {
              scopeStack.pushSignal(valueSignal);
            }
          }
        }
      }
    };

    const checkForTrackedScopes = (
      node:
        | T.JSXExpressionContainer
        | T.JSXSpreadAttribute
        | T.CallExpression
        | T.VariableDeclarator
        | T.AssignmentExpression
        | T.TaggedTemplateExpression
        | T.NewExpression
    ) => {
      const pushTrackedScope = (node: T.Node, expect: TrackedScope["expect"]) => {
        currentScope().trackedScopes.push({ node, expect });
        if (expect !== "called-function" && isFunctionNode(node) && node.async) {
          // From the docs: "[Solid's] approach only tracks synchronously. If you
          // have a setTimeout or use an async function in your Effect the code
          // that executes async after the fact won't be tracked."
          context.report({
            node,
            messageId: "noAsyncTrackedScope",
          });
        }
      };
      if (node.type === "JSXExpressionContainer") {
        if (
          node.parent?.type === "JSXAttribute" &&
          /^on[:A-Z]/.test(sourceCode.getText(node.parent.name)) &&
          node.parent.parent?.type === "JSXOpeningElement" &&
          node.parent.parent.name.type === "JSXIdentifier" &&
          isDOMElementName(node.parent.parent.name.name)
        ) {
          // Expect a function if the attribute is like onClick={} or on:click={}. From the docs:
          // Events are never rebound and the bindings are not reactive, as it is expensive to
          // attach and detach listeners. Since event handlers are called like any other function
          // each time an event fires, there is no need for reactivity; simply shortcut your handler
          // if desired.
          // What this means here is we actually do consider an event handler a tracked scope
          // expecting a function, i.e. it's okay to use changing props/signals in the body of the
          // function, even though the changes don't affect when the handler will run. This is what
          // "called-function" represents—not quite a tracked scope, but a place where it's okay to
          // read reactive values.
          pushTrackedScope(node.expression, "called-function");
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name.type === "JSXNamespacedName" &&
          node.parent.name.namespace.name === "use" &&
          isFunctionNode(node.expression)
        ) {
          // With a `use:` hook, assume that a function passed is a called function.
          pushTrackedScope(node.expression, "called-function");
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name.name === "value" &&
          node.parent.parent?.type === "JSXOpeningElement" &&
          ((node.parent.parent.name.type === "JSXIdentifier" &&
            node.parent.parent.name.name.endsWith("Provider")) ||
            (node.parent.parent.name.type === "JSXMemberExpression" &&
              node.parent.parent.name.property.name === "Provider"))
        ) {
          // From the docs: "The value passed to provider is passed to useContext as is. That means
          // wrapping as a reactive expression will not work. You should pass in Signals and Stores
          // directly instead of accessing them in the JSX."
          // For `<SomeContext.Provider value={}>` or `<SomeProvider value={}>`, do nothing, the
          // rule will warn later.
          // TODO: add some kind of "anti- tracked scope" that still warns but enhances the error
          // message if matched.
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name?.type === "JSXIdentifier" &&
          /^static[A-Z]/.test(node.parent.name.name) &&
          node.parent.parent?.type === "JSXOpeningElement" &&
          node.parent.parent.name.type === "JSXIdentifier" &&
          !isDOMElementName(node.parent.parent.name.name)
        ) {
          // A caller is passing a value to a prop prefixed with `static` in a component, i.e.
          // `<Box staticName={...} />`. Since we're considering these props as static in the component
          // we shouldn't allow passing reactive values to them, as this isn't just ignoring reactivity
          // like initial*/default*; this is disabling it altogether as a convention. Do nothing.
        } else if (
          node.parent?.type === "JSXAttribute" &&
          node.parent.name.name === "ref" &&
          isFunctionNode(node.expression)
        ) {
          // Callback/function refs are called when an element is created but before it is connected
          // to the DOM. This is semantically a "called function", so it's fine to read reactive
          // variables here.
          pushTrackedScope(node.expression, "called-function");
        } else if (node.parent?.type === "JSXElement" && isFunctionNode(node.expression)) {
          pushTrackedScope(node.expression, "function"); // functions inline in JSX containers will be tracked
        } else {
          pushTrackedScope(node.expression, "expression");
        }
      } else if (node.type === "JSXSpreadAttribute") {
        // allow <div {...props.nestedProps} />; {...props} is already ignored
        pushTrackedScope(node.argument, "expression");
      } else if (node.type === "NewExpression") {
        const {
          callee,
          arguments: { 0: arg0 },
        } = node;
        if (
          callee.type === "Identifier" &&
          arg0 &&
          // Observers from Standard Web APIs
          [
            "IntersectionObserver",
            "MutationObserver",
            "PerformanceObserver",
            "ReportingObserver",
            "ResizeObserver",
          ].includes(callee.name)
        ) {
          // Observers callbacks are NOT tracked scopes. However, they
          // don't need to react to updates to reactive variables; it's okay
          // to poll the current value. Consider them called-function tracked
          // scopes for our purposes.
          pushTrackedScope(arg0, "called-function");
        }
      } else if (node.type === "CallExpression") {
        if (node.callee.type === "Identifier") {
          const {
            callee,
            arguments: { 0: arg0, 1: arg1 },
          } = node;
          if (
            matchImport(
              [
                "createMemo",
                "children",
                "createEffect",
                "createRenderEffect",
                "createDeferred",
                "createComputed",
                "createSelector",
                "untrack",
                "mapArray",
                "indexArray",
                "observable",
              ],
              callee.name
            ) ||
            (matchImport("createResource", callee.name) && node.arguments.length >= 2)
          ) {
            // createEffect, createMemo, etc. fn arg, and createResource optional
            // `source` first argument may be a signal
            pushTrackedScope(arg0, "function");
          } else if (
            matchImport(["onMount", "onCleanup", "onError"], callee.name) ||
            [
              // Timers
              "setInterval",
              "setTimeout",
              "setImmediate",
              "requestAnimationFrame",
              "requestIdleCallback",
            ].includes(callee.name)
          ) {
            // on* and timers are NOT tracked scopes. However, they
            // don't need to react to updates to reactive variables; it's okay
            // to poll the current value. Consider them called-function tracked
            // scopes for our purposes.
            pushTrackedScope(arg0, "called-function");
          } else if (matchImport("on", callee.name)) {
            // on accepts a signal or an array of signals as its first argument,
            // and a tracking function as its second
            if (arg0) {
              if (arg0.type === "ArrayExpression") {
                arg0.elements.forEach((element) => {
                  if (element && element?.type !== "SpreadElement") {
                    pushTrackedScope(element, "function");
                  }
                });
              } else {
                pushTrackedScope(arg0, "function");
              }
            }
            if (arg1) {
              // Since dependencies are known, function can be async
              pushTrackedScope(arg1, "called-function");
            }
          } else if (matchImport("createStore", callee.name) && arg0?.type === "ObjectExpression") {
            for (const property of arg0.properties) {
              if (
                property.type === "Property" &&
                property.kind === "get" &&
                isFunctionNode(property.value)
              ) {
                pushTrackedScope(property.value, "function");
              }
            }
          } else if (matchImport("runWithOwner", callee.name)) {
            // runWithOwner(owner, fn) only creates a tracked scope if `owner =
            // getOwner()` runs in a tracked scope. If owner is a variable,
            // attempt to detect if it's a tracked scope or not, but if this
            // can't be done, assume it's a tracked scope.
            if (arg1) {
              let isTrackedScope = true;
              const owner = arg0.type === "Identifier" && findVariable(context.getScope(), arg0);
              if (owner) {
                const decl = owner.defs[0];
                if (
                  decl &&
                  decl.node.type === "VariableDeclarator" &&
                  decl.node.init?.type === "CallExpression" &&
                  decl.node.init.callee.type === "Identifier" &&
                  matchImport("getOwner", decl.node.init.callee.name)
                ) {
                  // Check if the function in which getOwner() is called is a tracked scope. If the scopeStack
                  // has moved on from that scope already, assume it's tracked, since that's less intrusive.
                  const ownerFunction = findParent(decl.node, isProgramOrFunctionNode);
                  const scopeStackIndex = scopeStack.findIndex(
                    ({ node }) => ownerFunction === node
                  );
                  if (
                    (scopeStackIndex >= 1 &&
                      !scopeStack[scopeStackIndex - 1].trackedScopes.some(
                        (trackedScope) =>
                          trackedScope.expect === "function" && trackedScope.node === ownerFunction
                      )) ||
                    scopeStackIndex === 0
                  ) {
                    isTrackedScope = false;
                  }
                }
              }
              if (isTrackedScope) {
                pushTrackedScope(arg1, "function");
              }
            }
          } else if (/^(?:use|create)[A-Z]/.test(callee.name)) {
            // Custom hooks parameters may or may not be tracking scopes, no way to know.
            // Assume all identifier/function arguments are tracked scopes, and use "called-function"
            // to allow async handlers (permissive). Assume non-resolvable args are reactive expressions.
            for (const arg of node.arguments) {
              if (isFunctionNode(arg)) {
                pushTrackedScope(arg, "called-function");
              } else if (
                arg.type === "Identifier" ||
                arg.type === "ObjectExpression" ||
                arg.type === "ArrayExpression"
              ) {
                pushTrackedScope(arg, "expression");
              }
            }
          }
        } else if (node.callee.type === "MemberExpression") {
          const { property } = node.callee;
          if (
            property.type === "Identifier" &&
            property.name === "addEventListener" &&
            node.arguments.length >= 2
          ) {
            // Like `on*` event handlers, mark all `addEventListener` listeners as called functions.
            pushTrackedScope(node.arguments[1], "called-function");
          } else if (property.type === "Identifier" && /^(?:use|create)[A-Z]/.test(property.name)) {
            // Handle custom hook parameters for property access custom hooks
            for (const arg of node.arguments) {
              if (isFunctionNode(arg)) {
                pushTrackedScope(arg, "called-function");
              } else if (
                arg.type === "Identifier" ||
                arg.type === "ObjectExpression" ||
                arg.type === "ArrayExpression"
              ) {
                pushTrackedScope(arg, "expression");
              }
            }
          }
        }
      } else if (node.type === "VariableDeclarator") {
        // Solid 1.3 createReactive (renamed createReaction?) returns a track
        // function, a tracked scope expecting a reactive function. All of the
        // track function's references where it's called push a tracked scope.
        if (node.init?.type === "CallExpression" && node.init.callee.type === "Identifier") {
          if (matchImport(["createReactive", "createReaction"], node.init.callee.name)) {
            const track = getReturnedVar(node.id, context.getScope());
            if (track) {
              for (const reference of track.references) {
                if (
                  !reference.init &&
                  reference.isReadOnly() &&
                  reference.identifier.parent?.type === "CallExpression" &&
                  reference.identifier.parent.callee === reference.identifier
                ) {
                  const arg0 = reference.identifier.parent.arguments[0];
                  arg0 && pushTrackedScope(arg0, "function");
                }
              }
            }
            if (isFunctionNode(node.init.arguments[0])) {
              pushTrackedScope(node.init.arguments[0], "called-function");
            }
          }
        }
      } else if (node.type === "AssignmentExpression") {
        if (
          node.left.type === "MemberExpression" &&
          node.left.property.type === "Identifier" &&
          isFunctionNode(node.right) &&
          /^on[a-z]+$/.test(node.left.property.name)
        ) {
          // To allow (questionable) code like the following example:
          //     ref.oninput = () = {
          //       if (!errors[ref.name]) return;
          //       ...
          //     }
          // where event handlers are manually attached to refs, detect these
          // scenarios and mark the right hand sides as tracked scopes expecting
          // functions.
          pushTrackedScope(node.right, "called-function");
        }
      } else if (node.type === "TaggedTemplateExpression") {
        for (const expression of node.quasi.expressions) {
          if (isFunctionNode(expression)) {
            // ex. css`color: ${props => props.color}`. Use "called-function" to allow async handlers (permissive)
            pushTrackedScope(expression, "called-function");

            // exception case: add a reactive variable within checkForTrackedScopes when a param is props
            for (const param of expression.params) {
              if (param.type === "Identifier" && isPropsByName(param.name)) {
                const variable = findVariable(context.getScope(), param);
                if (variable) scopeStack.pushProps(variable, currentScope().node);
              }
            }
          }
        }
      }
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      JSXExpressionContainer(node: T.JSXExpressionContainer) {
        checkForTrackedScopes(node);
      },
      JSXSpreadAttribute(node: T.JSXSpreadAttribute) {
        checkForTrackedScopes(node);
      },
      CallExpression(node: T.CallExpression) {
        checkForTrackedScopes(node);
        checkForSyncCallbacks(node);

        // ensure calls to reactive primitives use the results.
        const parent = node.parent && ignoreTransparentWrappers(node.parent, true);
        if (parent?.type !== "AssignmentExpression" && parent?.type !== "VariableDeclarator") {
          checkForReactiveAssignment(null, node);
        }
      },
      NewExpression(node: T.NewExpression) {
        checkForTrackedScopes(node);
      },
      VariableDeclarator(node: T.VariableDeclarator) {
        if (node.init) {
          checkForReactiveAssignment(node.id, node.init);
          checkForTrackedScopes(node);
        }
      },
      AssignmentExpression(node: T.AssignmentExpression) {
        if (node.left.type !== "MemberExpression") {
          checkForReactiveAssignment(node.left, node.right);
        }
        checkForTrackedScopes(node);
      },
      TaggedTemplateExpression(node: T.TaggedTemplateExpression) {
        checkForTrackedScopes(node);
      },
      "JSXElement > JSXExpressionContainer > :function"(node: T.Node) {
        if (
          isFunctionNode(node) &&
          node.parent?.type === "JSXExpressionContainer" &&
          node.parent.parent?.type === "JSXElement"
        ) {
          const element = node.parent.parent;

          if (element.openingElement.name.type === "JSXIdentifier") {
            const tagName = element.openingElement.name.name;
            if (
              matchImport("For", tagName) &&
              node.params.length === 2 &&
              node.params[1].type === "Identifier"
            ) {
              // Mark `index` in `<For>{(item, index) => <div /></For>` as a signal
              const index = findVariable(context.getScope(), node.params[1]);
              if (index) {
                scopeStack.pushSignal(index, currentScope().node);
              }
            } else if (
              matchImport("Index", tagName) &&
              node.params.length >= 1 &&
              node.params[0].type === "Identifier"
            ) {
              // Mark `item` in `<Index>{(item, index) => <div />}</Index>` as a signal
              const item = findVariable(context.getScope(), node.params[0]);
              if (item) {
                scopeStack.pushSignal(item, currentScope().node);
              }
            }
          }
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

      /* Detect JSX for adding props */
      JSXElement() {
        if (scopeStack.length) {
          currentScope().hasJSX = true;
        }
      },
      JSXFragment() {
        if (scopeStack.length) {
          currentScope().hasJSX = true;
        }
      },
    };
  },
});
