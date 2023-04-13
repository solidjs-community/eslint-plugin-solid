import { TSESLint, TSESTree as T, ESLintUtils, ASTUtils } from "@typescript-eslint/utils";
import invariant from "tiny-invariant";
import {
  ProgramOrFunctionNode,
  FunctionNode,
  trackImports,
  isFunctionNode,
  ignoreTransparentWrappers,
} from "../../utils";
import { ReactivityScope, VirtualReference } from "./analyze";
import type { ReactivityPlugin, ReactivityPluginApi } from "./pluginApi";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const { findVariable } = ASTUtils;

function parsePath(path: string): Array<string> | null {
  if (path) {
    const regex = /\(\)|\[\d*\]|\.(?:\w+|**?)/g;
    const matches = path.match(regex);
    // ensure the whole string is matched
    if (matches && matches.reduce((acc, match) => acc + match.length, 0) === path.length) {
      return matches;
    }
  }
  return null;
}

export default createRule({
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
      jsxReactiveVariable: "This variable should not be used as a JSX element.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.getSourceCode();

    const { matchImport, matchLocalToModule } = trackImports(sourceCode.ast);

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

    function VirtualReference(node: T.Node): VirtualReference {
      return { node, declarationScope: null };
    }

    /**
     * Given what's usually a CallExpression and a description of how the expression must be used
     * in order to be accessed reactively, return a list of virtual references for each place where
     * a reactive expression is accessed.
     * `path` is a array of segments parsed by `parsePath` according to `pluginApi`.
     */
    function getReferences(
      node: T.Node,
      path: string | null,
      allowMutable = false
    ): Array<VirtualReference> {
      node = ignoreTransparentWrappers(node, "up");
      const parsedPathOuter = path != null ? parsePath(path) : null;
      const eqCount = parsedPathOuter?.reduce((c, segment) => c + +(segment === '='), 0) ?? 0;
      if (eqCount > 1) {
        throw new Error(`'${path}' must have 0 or 1 '=' characters, has ${eqCount}`)
      }
      const hasEq = eqCount === 1;

      let declarationScope = hasEq ? null : context.getScope();

      function* recursiveGenerator(node: T.Node, parsedPath: Array<string> | null) {

      
      if (!parsedPath) {
        yield VirtualReference(node);
      } else if (node.parent?.type === "VariableDeclarator" && node.parent.init === node) {
        yield getReferences(node.parent.id);
      } else if (node.type === "Identifier") {

      }
        const { id } = node.parent;
        if (id.type === "Identifier") {
          const variable = findVariable(context.getScope(), id);
          if (variable) {
            for (const reference of variable.references) {
              if (reference.init) {
                // ignore
              } else if (reference.identifier.type === "JSXIdentifier") {
                context.report({ node: reference.identifier, messageId: "jsxReactiveVariable" });
              } else if (reference.isWrite()) {
                if (!allowMutable) {
                  context.report({ node: reference.identifier, messageId: "noWrite" });
                }
              } else {
                yield* getReferences(reference.identifier, parsedPath, allowMutable);
              }
            }
          }
        } else if (id.type === "ArrayPattern") {
          if (parsedPath[0] === "[]") {
            for (const el of id.elements) {
              if (!el) {
                // ignore
              } else if (el.type === "Identifier") {
                yield* getReferences(el, parsedPath.slice(1), allowMutable);
              } else if (el.type === "RestElement") {
                yield* getReferences(el.argument, parsedPath, allowMutable);
              }
            }
          } else {
          }
        }
      
      
      return Array.from(recursiveGenerator(node, parsePath(path)));
    }

    function distributeReferences(root: ReactivityScope, references: Array<VirtualReference>) {
      references.forEach((ref) => {
        const range = ref.node.range;
        const scope = root.deepestScopeContaining(range);
        invariant(scope != null);
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
      // signal(node, path) {
      //   const references = []; // TODO generate virtual signal references
      //   undistributedReferences.push(...references);
      // },
      // store(node, path, options) {
      //   const references = []; // TODO generate virtual store references
      //   undistributedReferences.push(...references);
      // },
      reactive(node, path) {
        const references = []; // TODO generate virtual reactive references
        undistributedReferences.push(...references);
      },
      getReferences(node, path) {
        return Array.from(getReferences(node, path));
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
});
