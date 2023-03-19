import { TSESTree as T, TSESLint, ESLintUtils } from "@typescript-eslint/utils";
import { appendImports, insertImports, removeSpecifier } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

// Below: create maps of imports and types to designated import source.
// We could mess with `Object.keys(require("solid-js"))` to generate this, but requiring it from
// node activates the "node" export condition, which doesn't necessarily match what users will
// receive i.e. through bundlers. Instead, we're manually listing all of the public exports that
// should be imported from "solid-js", etc.
// ==============

type Source = "solid-js" | "solid-js/web" | "solid-js/store";

// Set up map of imports to module
const primitiveMap = new Map<string, Source>();
for (const primitive of [
  "createSignal",
  "createEffect",
  "createMemo",
  "createResource",
  "onMount",
  "onCleanup",
  "onError",
  "untrack",
  "batch",
  "on",
  "createRoot",
  "getOwner",
  "runWithOwner",
  "mergeProps",
  "splitProps",
  "useTransition",
  "observable",
  "from",
  "mapArray",
  "indexArray",
  "createContext",
  "useContext",
  "children",
  "lazy",
  "createUniqueId",
  "createDeferred",
  "createRenderEffect",
  "createComputed",
  "createReaction",
  "createSelector",
  "DEV",
  "For",
  "Show",
  "Switch",
  "Match",
  "Index",
  "ErrorBoundary",
  "Suspense",
  "SuspenseList",
]) {
  primitiveMap.set(primitive, "solid-js");
}
for (const primitive of [
  "Portal",
  "render",
  "hydrate",
  "renderToString",
  "renderToStream",
  "isServer",
  "renderToStringAsync",
  "generateHydrationScript",
  "HydrationScript",
  "Dynamic",
]) {
  primitiveMap.set(primitive, "solid-js/web");
}
for (const primitive of [
  "createStore",
  "produce",
  "reconcile",
  "unwrap",
  "createMutable",
  "modifyMutable",
]) {
  primitiveMap.set(primitive, "solid-js/store");
}

// Set up map of type imports to module
const typeMap = new Map<string, Source>();
for (const type of [
  "Signal",
  "Accessor",
  "Setter",
  "Resource",
  "ResourceActions",
  "ResourceOptions",
  "ResourceReturn",
  "ResourceFetcher",
  "InitializedResourceReturn",
  "Component",
  "VoidProps",
  "VoidComponent",
  "ParentProps",
  "ParentComponent",
  "FlowProps",
  "FlowComponent",
  "ValidComponent",
  "ComponentProps",
  "Ref",
  "MergeProps",
  "SplitPrips",
  "Context",
  "JSX",
  "ResolvedChildren",
  "MatchProps",
]) {
  typeMap.set(type, "solid-js");
}
for (const type of [/* "JSX", */ "MountableElement"]) {
  typeMap.set(type, "solid-js/web");
}
for (const type of ["StoreNode", "Store", "SetStoreFunction"]) {
  typeMap.set(type, "solid-js/store");
}

const sourceRegex = /^solid-js(?:\/web|\/store)?$/;
const isSource = (source: string): source is Source => sourceRegex.test(source);

export default createRule({
  meta: {
    type: "suggestion",
    docs: {
      recommended: "warn",
      description:
        'Enforce consistent imports from "solid-js", "solid-js/web", and "solid-js/store".',
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/imports.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      "prefer-source": 'Prefer importing {{name}} from "{{source}}".',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!isSource(source)) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier") {
            const isType = specifier.importKind === "type" || node.importKind === "type";
            const map = isType ? typeMap : primitiveMap;
            const correctSource = map.get(specifier.imported.name);
            if (correctSource != null && correctSource !== source) {
              context.report({
                node: specifier,
                messageId: "prefer-source",
                data: {
                  name: specifier.imported.name,
                  source: correctSource,
                },
                fix(fixer) {
                  const sourceCode = context.getSourceCode();
                  const program: T.Program = sourceCode.ast;
                  const correctDeclaration = program.body.find(
                    (node) =>
                      node.type === "ImportDeclaration" && node.source.value === correctSource
                  ) as T.ImportDeclaration | undefined;

                  if (correctDeclaration) {
                    return [
                      removeSpecifier(fixer, sourceCode, specifier),
                      appendImports(fixer, sourceCode, correctDeclaration, [
                        sourceCode.getText(specifier),
                      ]),
                    ].filter(Boolean) as Array<TSESLint.RuleFix>;
                  }

                  const firstSolidDeclaration = program.body.find(
                    (node) => node.type === "ImportDeclaration" && isSource(node.source.value)
                  ) as T.ImportDeclaration | undefined;
                  return [
                    removeSpecifier(fixer, sourceCode, specifier),
                    insertImports(
                      fixer,
                      sourceCode,
                      correctSource,
                      [sourceCode.getText(specifier)],
                      firstSolidDeclaration,
                      isType
                    ),
                  ];
                },
              });
            }
          }
        }
      },
    };
  },
});
