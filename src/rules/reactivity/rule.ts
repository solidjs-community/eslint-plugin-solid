import { TSESLint, TSESTree as T } from "@typescript-eslint/utils";
import { ProgramOrFunctionNode, FunctionNode, trackImports, isFunctionNode } from "../../utils";
import { ReactivityScope, VirtualReference } from "./analyze";
import type { ExprPath, ReactivityPlugin, ReactivityPluginApi } from "./pluginApi";

type MessageIds =
  | "noWrite"
  | "untrackedReactive"
  | "expectedFunctionGotExpression"
  | "badSignal"
  | "badUnnamedDerivedSignal"
  | "shouldDestructure"
  | "shouldAssign"
  | "noAsyncTrackedScope";

const rule: TSESLint.RuleModule<MessageIds, []> = {
  meta: {
    type: "problem",
    docs: {
      recommended: "warn",
      description:
        "Enforce that reactive expressions (props, signals, memos, etc.) are only used in tracked scopes; otherwise, they won't update the view as expected.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/reactivity.md",
    },
    schema: [],
    messages: {
      noWrite: "The reactive variable '{{name}}' should not be reassigned or altered directly.",
      untrackedReactive:
        "The reactive variable '{{name}}' should be used within JSX, a tracked scope (like createEffect), or inside an event handler function.",
      expectedFunctionGotExpression:
        "The reactive variable '{{name}}' should be wrapped in a function for reactivity. This includes event handler bindings on native elements, which are not reactive like other JSX props.",
      badSignal:
        "The reactive variable '{{name}}' should be called as a function when used in {{where}}.",
      badUnnamedDerivedSignal:
        "This function should be passed to a tracked scope (like createEffect) or an event handler because it contains reactivity.",
      shouldDestructure:
        "For proper analysis, array destructuring should be used to capture the {{nth}}result of this function call.",
      shouldAssign:
        "For proper analysis, a variable should be used to capture the result of this function call.",
      noAsyncTrackedScope:
        "This tracked scope should not be async. Solid's reactivity only tracks synchronously.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    const { handleImportDeclaration, matchImport, matchLocalToModule } = trackImports(/^/);

    const root = new ReactivityScope(sourceCode.ast, null);
    const syncCallbacks = new Set<FunctionNode>();
    const undistributedReferences: Array<VirtualReference> = [];

    let currentScope = root;

    function onFunctionEnter(node: FunctionNode) {
      // if (syncCallbacks.has(node)) {
      //   // Ignore sync callbacks like Array#forEach and certain Solid primitives
      //   return;
      // }
      const childScope = new ReactivityScope(node, currentScope);
      currentScope.childScopes.push(childScope);
      currentScope = childScope;
    }

    function onJSX() {
      currentScope.hasJSX = true;
    }

    function onFunctionExit() {
      currentScope = currentScope.parentScope!;
    }

    function stripSyncCallbacks(root: ReactivityScope) {
      for (const scope of root.walk()) {
        if (scope.childScopes.length > 0) {
          // Though we're about to walk these childNodes, hit them now to avoid iterator
          // invalidation. If a child scope is a sync callback, merge its data into this scope and
          // remove it from the tree.
          const addedChildScopes: Array<ReactivityScope> = [];
          scope.childScopes = scope.childScopes.filter((childScope) => {
            if (isFunctionNode(childScope.node) && syncCallbacks.has(childScope.node)) {
              addedChildScopes.push(...childScope.childScopes);
              scope.trackedScopes.push(...childScope.trackedScopes);
              scope.references.push(...childScope.references);
              scope.hasJSX = scope.hasJSX || childScope.hasJSX;
              return false;
            }
            return true;
          });
          scope.childScopes.push(...addedChildScopes);
        }
      }
    }

    function getReferences(node: T.Expression, path: ExprPath) {
      if (node.parent?.type === "VariableDeclarator" && node.parent.init === node) {
        
      }
    }

    function distributeReferences(root: ReactivityScope, references: Array<VirtualReference>) {
      references.forEach((ref) => {
        const range =
          "range" in ref.reference ? ref.reference.range : ref.reference.identifier.range;
        const scope = root.deepestScopeContaining(range)!;
        scope.references.push(ref);
      });
    }


    const pluginApi: ReactivityPluginApi = {
      calledFunction(node) {
        currentScope.trackedScopes.push({ node, expect: "called-function" });
      },
      trackedScope(node) {
        currentScope.trackedScopes.push({ node, expect: "tracked-scope" });
      },
      syncCallback(node) {
        syncCallbacks.add(node);
      },
      provideErrorContext(node) {
        currentScope.errorContexts.push(node);
      },
      signal(node, path) {

        const references = []; // TODO generate virtual signal references
        undistributedReferences.push(...references);
      },
      store(node, path, options) {
        const references = []; // TODO generate virtual store references
        undistributedReferences.push(...references);
      },
      reactive(node, path) {
        const references = []; // TODO generate virtual reactive references
        undistributedReferences.push(...references);
      },
      isCall(node, primitive): node is T.CallExpression {
        return (
          node.type === "CallExpression" &&
          (!primitive || (node.callee.type === "Identifier" && node.callee.name === primitive))
        );
      },
    };
    const visitors: Array<ReturnType<ReactivityPlugin["create"]>> = [];

    return {
      /* Function enter/exit */
      FunctionExpression: onFunctionEnter,
      ArrowFunctionExpression: onFunctionEnter,
      FunctionDeclaration: onFunctionEnter,
      "FunctionExpression:exit": onFunctionExit,
      "ArrowFunctionExpression:exit": onFunctionExit,
      "FunctionDeclaration:exit": onFunctionExit,

      /* Detect JSX for adding props */
      JSXElement: onJSX,
      JSXFragment: onJSX,

      ImportDeclaration: handleImportDeclaration,

      "*"(node: T.Node) {
        // eslint-disable-next-line
        // @ts-ignore
        visitors.forEach((visitor) => visitor[node.type]?.(node));
      },

      "Program:exit"() {
        stripSyncCallbacks(root);
        distributeReferences(root, undistributedReferences);
        analyze(root);
      },
    };
  },
};
