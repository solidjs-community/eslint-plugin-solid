# Changelog

## 0.16.0

The complete Solid 2.0 lint surface: version-aware rules, new `v2` / `v2-strict` configs, and a
full set of 2.0-specific rules, all vetted against the official Solid 2.0 templates (which lint
clean with zero errors and zero warnings under the `v2` config).

### Features

- **`settings.solid.version`.** Rules can now read the targeted Solid major version from ESLint
  settings (`settings: { solid: { version: 2 } }`). Unset means the permissive dual-version
  behavior from 0.15. The new configs preset it; any custom config can opt in with one line.
- **New `v2` config** (`eslint-plugin-solid/configs/v2`, also `solid.configs.v2`): what the
  official Solid 2.0 templates ship. Sets the version setting, switches existing rules to strict
  2.0 semantics, and enables the new 2.0 rules — errors are reserved for near-certain bugs,
  heuristics stay warnings.
- **New `v2-strict` config** (`eslint-plugin-solid/configs/v2-strict`): everything in `v2` plus
  the plugin's strongest opinions (see below).
- **New rule `solid/removed-api`** (error in `v2`): flags removed/renamed 1.x APIs with
  autofixes where mechanical (`onMount`→`onSettled`, `batch`→`flush`, `mergeProps`→`merge`,
  `unwrap`→`snapshot`, `equalFn`→`isEqual`, `getListener`→`getObserver`,
  `classList={{...}}`→`class={{...}}`, `"solid-js/web"`→`"@solidjs/web"`,
  `"solid-js/store"`→`"solid-js"`) and prescriptive migration messages otherwise
  (`createResource`, `on`, `Suspense`→`Loading`, `Index`→`<For keyed={false}>`, `produce`, etc.).
  Lists verified against the Solid 2.0 RC source.
- **New rule `solid/no-single-arg-create-effect`** (error in `v2`): Solid 2.0 requires the split
  `createEffect(compute, effect)` form. The single-argument 1.x form produces no TS compile error
  on a bare statement call and only throws at runtime in dev mode; this rule is the build-time
  hard stop for the most commonly reproduced AI mistake.
- **New rule `solid/no-accessor-as-prop`** (error in `v2`): `<div title={count} />` silently
  renders a stringified function. Fires on any expression that statically resolves to a function
  in a value-typed DOM attribute, with a message that states the fix (`count` → `count()`).
  Event handlers, `ref`, `children`, namespaced attributes, components, and custom elements are
  exempt.
- **New rule `solid/prefer-structured-class`** (warning in `v2`, error in `v2-strict`): nudges
  manually-built class strings (concatenation with conditionals, conditional template literals,
  `.join(" ")`) toward the structured array/object `ClassValue` forms that Solid 2.0 accepts
  natively. Static strings and plain interpolation are untouched.
- **New rule `solid/no-module-scope-reactive-primitive`** (error in `v2-strict` only): reactive
  state at module scope is shared across SSR requests. `createRoot`-wrapped module state is the
  deliberate escape hatch and is not flagged.
- **New rule `solid/prefer-onSettled-for-side-effects`** (warning in `v2-strict` only): flags
  side-effectful setup (timers, global listeners, observers) in component bodies, where it also
  runs during SSR; suggests `onSettled`. Never flags `onCleanup` itself.
- **New rule `solid/no-restated-default-options`** (error in `v2-strict` only, autofixable):
  removes restated defaults like `<For keyed={true}>` and `<Show keyed={false}>`.
- **Version-2 behavior in existing rules** (active when `settings.solid.version` is 2):
  - `solid/no-unknown-namespaces` inverts its premise: namespaces are no longer reserved in 2.0,
    so any colon-name is a legal literal attribute — but the formerly-special prefixes `use:`,
    `attr:`, `bool:`, `on:`, and `oncapture:` are flagged as near-certain 1.x migration bugs with
    per-prefix guidance. `prop:` remains the only special namespace.
  - `solid/event-handlers` graduates from style to correctness: only camelCase `onClick` is an
    event handler in 2.0; a lowercase `onclick` with a function value is a listener that will
    never fire (autofixed to camelCase for known DOM events). Lowercase names with static string
    values are legitimate literal attributes and are no longer flagged. `onDoubleClick` (which
    lowercases to a nonexistent DOM event) is autofixed to `onDblClick`.
  - `solid/imports` requires the 2.0 export locations: store exports from core `"solid-js"`, web
    exports from `"@solidjs/web"`. The legacy `solid-js/store` / `solid-js/web` subpaths are
    `solid/removed-api`'s territory, avoiding double reports.
  - `solid/jsx-no-undef` auto-imports the 2.0 control-flow components (`For`, `Repeat`, `Show`,
    `Switch`, `Match`, `Errored`, `Loading`, `Reveal`); `Index` is no longer suggested.
  - `solid/reactivity` delegates its uncalled-signal-in-DOM-attribute case to
    `solid/no-accessor-as-prop` so a node never gets two reports.
  - `solid/no-react-deps` self-gates off (a dependency array in the second argument is already a
    type and runtime error in 2.0).
- **Template vetting.** A fixture test runs the `v2` config over sources copied from the official
  Solid 2.0 templates in CI, and `test/lint-templates.mjs` sweeps a local `solidjs/templates`
  checkout. All eleven `solid-v2/*` templates lint clean.

## 0.15.0

The revival release: Solid 2.0 support and a modernized toolchain.

### Breaking Changes

- **ESLint v9 and v10 only.** The `eslint` peer dependency range is now `^9.0.0 || ^10.0.0`.
  Support for ESLint v6–v8 has been dropped.
- **Flat config only.** The legacy eslintrc-style `plugin:solid/recommended` and
  `plugin:solid/typescript` configs have been removed, matching ESLint v10's removal of the
  eslintrc system. Use `eslint-plugin-solid/configs/recommended` /
  `eslint-plugin-solid/configs/typescript`, or the configs on the root export
  (`solid.configs.recommended` / `solid.configs.typescript`). The `configs["flat/recommended"]`
  and `configs["flat/typescript"]` names from 0.14.x still work as aliases.
- **Node.js 22+ required.** The `engines.node` field is now `>=22.0.0` (Node 20 reached
  end-of-life in April 2026).

### Features

- **Solid 2.0 API support in `solid/reactivity`.** The rule now recognizes, alongside the 1.x
  APIs: `createProjection`, `createOptimistic`, `createOptimisticStore`, `merge`, `omit`,
  `isPending`, `latest`, `resolve`, `deep`, `repeat`, `flush`, `action`, `onSettled`,
  `createTrackedEffect`, `createErrorBoundary`, `createLoadingBoundary`, `createRevealOrder`,
  function-form `createSignal(fn)` / `createStore(fn)`, split effects
  (`createEffect(compute, effect)`), async computations (e.g. `createMemo(async () => ...)`),
  and `<For>`'s `keyed` prop callback shapes. Imports from `@solidjs/signals` are recognized as
  Solid imports. Callsites whose meaning differs between 1.x and 2.0 are resolved permissively so
  that neither interpretation warns.
- **New `readAfterAwait` warning in `solid/reactivity`.** In async computations (async
  `createMemo`, function-form derived primitives), reactive reads placed after the first `await`
  or `yield` are not tracked—in 1.x they behave like reads in an event handler, and in 2.0 they
  can observe unpredictable mid-transition state. The rule now reports these reads specifically
  and suggests reading the value before the computation suspends. Reads inside the first `await`'s
  operands are still allowed, and a loop containing an `await` is treated as after-suspension for
  subsequent iterations.
- **`solid/imports` understands Solid 2.0 export locations.** `createStore`, `reconcile`, and
  store types imported from core `solid-js` (their 2.0 home) are no longer flagged.
- **Oxlint support.** The plugin runs under Oxlint's `jsPlugins` without modification; see the
  README for setup.

### Internal

- Removed the ESLint v6–v8 test matrix; tests run against typescript-eslint, Babel, and espree
  parsers on ESLint 10.
- Toolchain updated: pnpm 11, typescript-eslint 8.67, vitest 4, TypeScript 5.9; CI tests
  Node 22/24/26.
- CI publishing switched from a stored npm token to npm Trusted Publishing (OIDC).

## 0.14.5 and earlier

See the [GitHub releases](https://github.com/solidjs-community/eslint-plugin-solid/releases).
