import type { TSESLint } from "@typescript-eslint/utils";
import type { TSESTree as T } from "@typescript-eslint/utils";
import { createRule, findVariable } from "../compat";
import { jsxGetProp } from "../utils";

// Mechanical renames: same semantics, new name. Verified against the Solid 2.0
// RC source (packages/solid/src/index.ts).
const RENAMED = new Map<string, string>([
  ["equalFn", "isEqual"],
  ["getListener", "getObserver"],
]);

// Renames whose replacement behaves differently. `eslint --fix` must not apply
// them unattended (#249), so the rename is offered as a suggestion and the
// message names the difference.
const RENAMED_CHANGED = new Map<string, [replacement: string, difference: string]>([
  [
    "batch",
    [
      "flush",
      "`flush(fn)` runs `fn` and then drains synchronously; it throws in dev inside an action body and warns inside effect callbacks",
    ],
  ],
  [
    "onMount",
    [
      "onSettled",
      "`onSettled` runs after the tree settles, and its return value is treated as a cleanup, so a callback that returns a non-function value is an error in dev",
    ],
  ],
  [
    "mergeProps",
    [
      "merge",
      "an explicit `undefined` in a later source now overrides an earlier value instead of falling through",
    ],
  ],
  [
    "unwrap",
    [
      "snapshot",
      "`snapshot` returns a copy, not the live underlying object, so identity checks and later store writes are not reflected",
    ],
  ],
]);

// Removed APIs whose replacement requires a structural rewrite; the message is
// prescriptive but no autofix is offered. `createDeferred` (restored in rc.16)
// and `from` (restored in solidjs/solid#4218) still exist in 2.0, so they are
// deliberately absent.
const REMOVED = new Map<string, string>([
  [
    "createResource",
    "Async derivation is built into Solid 2.0 computations. Use an async `createMemo(async () => ...)` and read it where needed",
  ],
  [
    "createComputed",
    "Use `createMemo` for derived values or the two-argument `createEffect(compute, effect)` for side effects",
  ],
  ["createSelector", "Use `createProjection` to derive per-key reactive state"],
  [
    "on",
    "Explicit dependencies are built in: use the two-argument `createEffect(compute, effect)` form, where `compute` reads the dependencies",
  ],
  [
    "onError",
    "Use `<Errored>` for error UI, or the `error` option of `createEffect(compute, { effect, error })` to handle errors programmatically",
  ],
  [
    "catchError",
    "Use `<Errored>` for error UI, or the `error` option of `createEffect(compute, { effect, error })` to handle errors programmatically",
  ],
  [
    "resetErrorBoundaries",
    "Error boundaries heal automatically in Solid 2.0 when their sources update",
  ],
  [
    "startTransition",
    "Transitions are built in. Read pending state with `isPending(...)` and previous values with `latest(...)`",
  ],
  [
    "useTransition",
    "Transitions are built in. Read pending state with `isPending(...)` and previous values with `latest(...)`",
  ],
  [
    "observable",
    "To consume an Observable or async iterable, adapt it with `from`; to publish a signal, push values out from a `createEffect`",
  ],
  ["indexArray", "Use `mapArray`, which handles index-mode mapping in Solid 2.0"],
  [
    "splitProps",
    'Use `omit` from "solid-js" to exclude props, and pass the original props object along',
  ],
  [
    "renderToStringAsync",
    "`renderToString` awaits async content in Solid 2.0; use it (or `renderToStream`) instead",
  ],
  ["createMutable", "Use `createStore`; store setters mutate directly in Solid 2.0"],
  ["modifyMutable", "Use `createStore`; store setters mutate directly in Solid 2.0"],
  [
    "produce",
    "Store setters receive a mutable draft by default in Solid 2.0; mutate directly in the setter",
  ],
  // Components
  ["Index", "Use `<For keyed={false}>`, which passes item accessors like `<Index>` did"],
  ["ErrorBoundary", "Use `<Errored>` to render a fallback when a child throws"],
  ["Suspense", "Use `<Loading>` to render a fallback while content is pending"],
  [
    "SuspenseList",
    "Use `<Reveal>` to coordinate the reveal order of sibling `<Loading>` boundaries",
  ],
]);

// Exports that moved from "solid-js/store" into core "solid-js". The import
// fix is safe, but `createStore`'s setter and `reconcile` changed shape, so
// their message says so (#249).
const STORE_MOVED = new Set(["createStore", "reconcile", "Store", "StoreNode"]);
const STORE_CHANGED = new Map<string, string>([
  [
    "createStore",
    "The setter now takes a single function that mutates a draft (`setStore(s => { s.user.name = v })`); 1.x path and object-merge setter calls no longer work",
  ],
  ["reconcile", "Its signature is now `reconcile(value, key)`; the 1.x options object is gone"],
]);

// Includes "@solidjs/web" so 1.x APIs that survived a mechanical source
// rewrite (e.g. renderToStringAsync) are still reported as removed.
const SOLID_SOURCE_REGEX = /^(?:solid-js(?:\/web|\/store)?|@solidjs\/web)$/;

type MessageIds =
  | "renamed"
  | "renamedChanged"
  | "applyRename"
  | "removed"
  | "webMoved"
  | "storeMoved"
  | "storeChanged"
  | "classList";
type Options = [];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Solid 1.x APIs that were removed or renamed in Solid 2.0, with migration guidance.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/removed-api.md",
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [],
    messages: {
      renamed: "'{{name}}' was renamed to '{{replacement}}' in Solid 2.0.",
      renamedChanged:
        "'{{name}}' was replaced by '{{replacement}}' in Solid 2.0, which behaves differently: {{difference}}. Check each call site before renaming.",
      applyRename: "Rename '{{name}}' to '{{replacement}}'.",
      removed: "'{{name}}' was removed in Solid 2.0. {{guidance}}.",
      webMoved: 'The "solid-js/web" module is now the "@solidjs/web" package in Solid 2.0.',
      storeMoved:
        'The "solid-js/store" module no longer exists in Solid 2.0; \'{{name}}\' is exported from "solid-js".',
      storeChanged:
        'The "solid-js/store" module no longer exists in Solid 2.0; \'{{name}}\' is exported from "solid-js". {{guidance}}.',
      classList:
        "The `classList` prop was removed in Solid 2.0; `class` accepts the same object form directly.",
    },
  },
  defaultOptions: [],
  create(context) {
    /** Rename the import specifier and, when it isn't aliased, all its references. */
    const renameFix = (
      fixer: TSESLint.RuleFixer,
      specifier: T.ImportSpecifier,
      replacement: string
    ): Array<TSESLint.RuleFix> => {
      const fixes: Array<TSESLint.RuleFix> = [];
      const aliased = specifier.local.range[0] !== specifier.imported.range[0];
      fixes.push(fixer.replaceText(specifier.imported, replacement));
      if (!aliased) {
        const variable = findVariable(context, specifier.local);
        if (variable) {
          for (const reference of variable.references) {
            if (reference.identifier !== specifier.local) {
              fixes.push(fixer.replaceText(reference.identifier, replacement));
            }
          }
        }
      }
      return fixes;
    };

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!SOLID_SOURCE_REGEX.test(source)) return;

        if (source === "solid-js/web") {
          context.report({
            node: node.source,
            messageId: "webMoved",
            fix: (fixer) =>
              fixer.replaceText(
                node.source,
                node.source.raw.replace("solid-js/web", "@solidjs/web")
              ),
          });
        }

        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const importedName =
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value;

          const replacement = RENAMED.get(importedName);
          if (replacement) {
            context.report({
              node: specifier,
              messageId: "renamed",
              data: { name: importedName, replacement },
              fix: (fixer) => renameFix(fixer, specifier, replacement),
            });
            continue;
          }

          const changed = RENAMED_CHANGED.get(importedName);
          if (changed) {
            const [changedReplacement, difference] = changed;
            const data = { name: importedName, replacement: changedReplacement, difference };
            context.report({
              node: specifier,
              messageId: "renamedChanged",
              data,
              suggest: [
                {
                  messageId: "applyRename",
                  data,
                  fix: (fixer) => renameFix(fixer, specifier, changedReplacement),
                },
              ],
            });
            continue;
          }

          const guidance = REMOVED.get(importedName);
          if (guidance) {
            context.report({
              node: specifier,
              messageId: "removed",
              data: { name: importedName, guidance },
            });
            continue;
          }

          if (source === "solid-js/store" && STORE_MOVED.has(importedName)) {
            const storeGuidance = STORE_CHANGED.get(importedName);
            context.report({
              node: specifier,
              messageId: storeGuidance ? "storeChanged" : "storeMoved",
              data: { name: importedName, guidance: storeGuidance },
              // Only offer the source rewrite when every specifier in this
              // declaration survives the move; otherwise the fix would create
              // a broken import of a removed API from "solid-js".
              fix: node.specifiers.every(
                (s) =>
                  s.type === "ImportSpecifier" &&
                  STORE_MOVED.has(
                    s.imported.type === "Identifier" ? s.imported.name : s.imported.value
                  )
              )
                ? (fixer) =>
                    fixer.replaceText(
                      node.source,
                      node.source.raw.replace("solid-js/store", "solid-js")
                    )
                : undefined,
            });
          }
        }
      },
      JSXAttribute(node) {
        if (node.name.type === "JSXIdentifier" && node.name.name === "classList") {
          const element = node.parent as T.JSXOpeningElement;
          const hasClass = !!jsxGetProp(element.attributes, "class");
          context.report({
            node: node.name,
            messageId: "classList",
            // If a `class` prop already exists the two must be merged by hand.
            fix: hasClass ? undefined : (fixer) => fixer.replaceText(node.name, "class"),
          });
        }
      },
    };
  },
});
