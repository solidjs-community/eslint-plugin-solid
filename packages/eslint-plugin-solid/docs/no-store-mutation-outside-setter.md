<!-- doc-gen HEADER -->
# solid/no-store-mutation-outside-setter
Disallow mutating a store's read proxy; store state changes only through the setter's mutable draft.
This rule is **off** by default.

[View source](../src/rules/no-store-mutation-outside-setter.ts) · [View tests](../test/rules/no-store-mutation-outside-setter.test.ts)
<!-- end-doc-gen -->

Store setters receive a mutable draft in Solid 2.0 (`produce` semantics by default), which makes mutating the read proxy directly look plausible — especially for code migrating from `createMutable`. It isn't: the read proxy is read-only, so the mutation throws in dev mode and silently fails to trigger updates otherwise.

```js
const [store, setStore] = createStore({ count: 0, items: [] });

// ✗ Mutating the read proxy
store.count++;
store.items.push(item);
delete store.stale;

// ✓ Mutating the draft inside the setter
setStore((draft) => {
  draft.count++;
  draft.items.push(item);
  delete draft.stale;
});
```

The rule resolves the mutated object back to its `createStore` destructure, so plain objects, `snapshot()` copies, and setter draft parameters (even ones shadowing the store's name) are never flagged. Mutating method calls are limited to the built-in mutating array methods (`push`, `splice`, `sort`, …).

Projections (`createProjection`) are read-only derived stores, so mutating one is flagged with guidance to derive the value inside the projection function instead.

This rule is enabled as an error in the `v2` and `v2-strict` configs.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
store.count = 5;

import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
store.count++;

import { createStore } from "solid-js";
const [store, setStore] = createStore({ items: [] });
store.items.push(item);

import { createStore } from "solid-js";
const [store, setStore] = createStore({ user: { name: "a" } });
delete store.user.name;

import { createStore } from "solid-js";
const [store, setStore] = createStore({ nested: { deep: { value: 0 } } });
store.nested.deep.value = 1;

import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
setStore(() => {
  store.count = 5;
});

import { createProjection } from "solid-js";
const selected = createProjection((draft) => {
  draft[selectedId()] = true;
});
selected.other = true;

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
setStore((draft) => {
  draft.count++;
});
console.log(store.count);

import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
setStore((store) => {
  store.count = 5;
});

import { createStore, snapshot } from "solid-js";
const [store, setStore] = createStore({ items: [] });
const copy = snapshot(store);
copy.items.push(1);

import { createStore } from "solid-js";
const [store, setStore] = createStore({ items: [] });
const doubled = store.items.map((n) => n * 2);
setStore((draft) => (draft.items = doubled));

const obj = { count: 0 };
obj.count++;
delete obj.count;

```
<!-- end-doc-gen -->
