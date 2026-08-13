# Changelog

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
