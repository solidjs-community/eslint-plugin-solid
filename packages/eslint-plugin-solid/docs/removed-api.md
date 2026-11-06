<!-- doc-gen HEADER -->
# solid/removed-api
Disallow Solid 1.x APIs that were removed or renamed in Solid 2.0, with migration guidance.
This rule is **off** by default.

[View source](../src/rules/removed-api.ts) · [View tests](../test/rules/removed-api.test.ts)
<!-- end-doc-gen -->

This rule flags Solid 1.x APIs that were removed or renamed in Solid 2.0. Mechanical renames (`equalFn` → `isEqual`, `getListener` → `getObserver`) are auto-fixed, including all references. Renames whose replacement behaves differently (`onMount` → `onSettled`, `batch` → `flush`, `mergeProps` → `merge`, `unwrap` → `snapshot`) are not auto-fixed: the message names the difference, and the rename is offered as an editor suggestion to apply after checking each call site. APIs whose replacement requires a structural rewrite (`createResource`, `on`, `Suspense`, `produce`, etc.) get a prescriptive message describing the 2.0 way instead.

It also handles the module moves: `"solid-js/store"` exports now live in core `"solid-js"` (the message for `createStore` and `reconcile` also notes that the store setter and `reconcile`'s signature changed), `"solid-js/web"` became the `"@solidjs/web"` package, and the `classList` prop was removed in favor of `class`, which accepts the same object form natively.

This rule is enabled as an error in the `v2` and `v2-strict` configs. It is not intended for Solid 1.x projects.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
import { onMount } from "solid-js";
onMount(() => console.log("hi"));
// after eslint --fix:
import { onSettled } from "solid-js";
onSettled(() => console.log("hi"));

import { batch } from "solid-js";
batch(() => update());
// after eslint --fix:
import { flush } from "solid-js";
flush(() => update());

import { mergeProps } from "solid-js";
const props2 = mergeProps({ a: 1 }, props);
// after eslint --fix:
import { merge } from "solid-js";
const props2 = merge({ a: 1 }, props);

import { onMount as om } from "solid-js";
om(() => {});
// after eslint --fix:
import { onSettled as om } from "solid-js";
om(() => {});

import { createResource } from "solid-js";

import { createDeferred, createResource, from, observable } from "solid-js";

import { on, useTransition } from "solid-js";

import { Index, Suspense, ErrorBoundary } from "solid-js";

import { onError, catchError, ErrorBoundary, SuspenseList } from "solid-js";

import { renderToStringAsync } from "@solidjs/web";

import { renderToStringAsync } from "solid-js/web";
// after eslint --fix:
import { renderToStringAsync } from "@solidjs/web";

import { render } from "solid-js/web";
// after eslint --fix:
import { render } from "@solidjs/web";

import { createStore } from "solid-js/store";
// after eslint --fix:
import { createStore } from "solid-js";

import { createStore, produce } from "solid-js/store";

let el = <div classList={{ active: isActive() }} />;
// after eslint --fix:
let el = <div class={{ active: isActive() }} />;

let el = <div class="btn" classList={{ active: isActive() }} />;

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createSignal, createMemo, createEffect } from "solid-js";

import { merge, omit, flush, snapshot, isEqual, onSettled } from "solid-js";

import {
  For,
  Repeat,
  Show,
  Switch,
  Match,
  Errored,
  Loading,
  Reveal,
} from "solid-js";

import { createStore, reconcile } from "solid-js";

import { render, Portal, Dynamic } from "@solidjs/web";

import { something } from "somewhere/else";

import { createDeferred, from } from "solid-js";

import { createDeferred as defer, from as fromSource } from "solid-js";

let el = <div class={{ active: true }} />;

let el = <div class="btn" />;

```
<!-- end-doc-gen -->
