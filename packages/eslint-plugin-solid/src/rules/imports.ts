import { TSESTree as T, TSESLint, ESLintUtils } from "@typescript-eslint/utils";
import { appendImports, insertImports, isSolidV2, removeSpecifier } from "../utils";
import { getSourceCode } from "../compat";

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

// Solid 2.0 moved these exports into core "solid-js" (and removed the old locations in
// some cases). Don't flag them when imported from the source listed here, so the rule
// gives correct guidance for both Solid 1.x and 2.0 projects.
const alternateSourceMap = new Map<string, Source>([
  ["createStore", "solid-js"],
  ["reconcile", "solid-js"],
  ["Store", "solid-js"],
  ["StoreNode", "solid-js"],
  ["SetStoreFunction", "solid-js"],
]);

// ==============
// Solid 2.0: "solid-js/store" no longer exists (store exports live in core),
// and "solid-js/web" became the "@solidjs/web" package. When `settings.solid.
// version` is 2, the rule *requires* the 2.0 locations. Lists verified against
// the RC source (packages/solid/src/index.ts, packages/solid-web/src/index.ts).
type SourceV2 = "solid-js" | "@solidjs/web";

const primitiveMapV2 = new Map<string, SourceV2>();
for (const primitive of [
  // reactive primitives
  "createSignal",
  "createMemo",
  "createStore",
  "createEffect",
  "createRenderEffect",
  "createProjection",
  "createOptimistic",
  "createOptimisticStore",
  "createReaction",
  "createRoot",
  "createOwner",
  "createContext",
  "useContext",
  "children",
  "lazy",
  "createUniqueId",
  "createErrorBoundary",
  "createLoadingBoundary",
  "createRevealOrder",
  // lifecycle and utilities
  "onCleanup",
  "onSettled",
  "untrack",
  "flush",
  "merge",
  "omit",
  "mapArray",
  "repeat",
  "getOwner",
  "getObserver",
  "runWithOwner",
  "isEqual",
  "isPending",
  "latest",
  "action",
  "reconcile",
  "snapshot",
  "resolve",
  "refresh",
  "flatten",
  "deep",
  "affects",
  "storePath",
  "DEV",
  // control flow components
  "For",
  "Repeat",
  "Show",
  "Switch",
  "Match",
  "Errored",
  "Loading",
  "Reveal",
]) {
  primitiveMapV2.set(primitive, "solid-js");
}
for (const primitive of [
  "Portal",
  "Dynamic",
  "render",
  "hydrate",
  "isServer",
  "renderToString",
  "renderToStream",
  "renderToStringAsync",
  "generateHydrationScript",
  "HydrationScript",
]) {
  primitiveMapV2.set(primitive, "@solidjs/web");
}

const typeMapV2 = new Map<string, SourceV2>();
for (const type of [
  "Signal",
  "Accessor",
  "Setter",
  "Component",
  "Context",
  "ResolvedChildren",
  "Store",
  "StoreNode",
  "StoreSetter",
  "StoreOptions",
  "SignalOptions",
  "MemoOptions",
  "EffectOptions",
  "Owner",
]) {
  typeMapV2.set(type, "solid-js");
}
typeMapV2.set("JSX", "@solidjs/web");

const sourceRegex = /^solid-js(?:\/web|\/store)?$/;
const isSource = (source: string): source is Source => sourceRegex.test(source);

// The legacy "solid-js/store" and "solid-js/web" sources are deliberately
// excluded here: in v2 mode those modules no longer exist and solid/removed-api
// owns reporting/rewriting them, so this rule only polices specifier placement
// between the surviving modules.
const sourceRegexV2 = /^(?:solid-js|@solidjs\/web)$/;
const isSourceV2 = (source: string): source is Source | "@solidjs/web" =>
  sourceRegexV2.test(source);

export default createRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        'Enforce consistent imports from "solid-js", "solid-js/web", and "solid-js/store".',
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/imports.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      "prefer-source": 'Prefer importing {{name}} from "{{source}}".',
    },
  },
  defaultOptions: [],
  create(context) {
    const v2 = isSolidV2(context);
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (v2 ? !isSourceV2(source) : !isSource(source)) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier") {
            const isType = specifier.importKind === "type" || node.importKind === "type";
            const map = v2
              ? isType
                ? typeMapV2
                : primitiveMapV2
              : isType
              ? typeMap
              : primitiveMap;
            const importedName =
              specifier.imported.type === "Identifier"
                ? specifier.imported.name
                : specifier.imported.value;
            const correctSource = map.get(importedName);
            if (
              correctSource != null &&
              correctSource !== source &&
              (v2 || alternateSourceMap.get(importedName) !== source)
            ) {
              context.report({
                node: specifier,
                messageId: "prefer-source",
                data: {
                  name: importedName,
                  source: correctSource,
                },
                fix(fixer) {
                  const sourceCode = getSourceCode(context);
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
                    (node) =>
                      node.type === "ImportDeclaration" &&
                      (v2 ? isSourceV2(node.source.value) : isSource(node.source.value))
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
