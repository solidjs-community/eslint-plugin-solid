<!-- doc-gen HEADER -->
# solid/no-write-in-pure-computation
Disallow writing signals or stores inside `createMemo` or the compute half of `createEffect`, which must be pure.
This rule is **off** by default.

[View source](../src/rules/no-write-in-pure-computation.ts) · [View tests](../test/rules/no-write-in-pure-computation.test.ts)
<!-- end-doc-gen -->

`createMemo` callbacks and the compute half of `createEffect(compute, effect)` are pure tracked computations: writing other reactive state from inside them creates update cycles, and Solid 2.0 throws on it in dev mode. The usual intent — deriving one piece of state from another — has a first-class answer that doesn't need a write at all.

```js
// ✗ Deriving state by writing a signal from a computation
const bad = createMemo(() => {
  setDouble(count() * 2);
  return count();
});

// ✓ Derive it — no second signal needed
const double = createMemo(() => count() * 2);
```

```js
// ✗ The compute half is tracked and must be pure
createEffect(() => {
  setLog(query()); // write during tracking
  return query();
}, (value) => console.log(value));

// ✓ Writes belong in the effect half
createEffect(() => query(), (value) => setLog(value));
```

Only setter calls whose nearest enclosing function *is* the computation are flagged. A setter inside a nested function — say, an event handler the memo returns — runs later, outside the computation, and is fine. Setters are recognized by resolving to the second element of a `createSignal`, `createStore`, or `createOptimistic` destructure.

Signals created with the `ownedWrite: true` option are exempt: that option is core's own opt-in for intentional owned-scope writes (its runtime error message suggests it), so the linter honors it rather than contradicting it. If the options argument isn't a statically readable object literal, the rule stays quiet. The opt-in applies to signals only — store setters have no such exemption in core.

This rule is enabled as an error in the `v2` and `v2-strict` configs.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0);
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});

import { createSignal, createEffect } from "solid-js";
const [log, setLog] = createSignal("");
createEffect(
  () => {
    setLog(query());
    return query();
  },
  (value) => console.log(value)
);

import { createSignal, createRenderEffect } from "solid-js";
const [size, setSize] = createSignal(0);
createRenderEffect(
  () => {
    setSize(width());
    return width();
  },
  (value) => update(value)
);

import { createStore, createMemo } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
const bad = createMemo(() => {
  setStore((draft) => draft.count++);
  return store.count;
});

import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0, { name: "count" });
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});

import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0, { ownedWrite: false });
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});

import { createStore, createMemo } from "solid-js";
const [store, setStore] = createStore({ count: 0 }, { ownedWrite: true });
const bad = createMemo(() => {
  setStore((draft) => draft.count++);
  return store.count;
});

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createSignal, createEffect } from "solid-js";
const [count, setCount] = createSignal(0);
const [double, setDouble] = createSignal(0);
createEffect(
  () => count(),
  (value) => setDouble(value * 2)
);

import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0);
const handler = createMemo(() => () => setCount(count() + 1));

import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
setCount(5);

import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);

import { createMemo } from "solid-js";
const result = createMemo(() => transform(input()));

import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, { ownedWrite: true });
const value = createMemo(() => {
  setCache(compute());
  return cache();
});

import { createSignal, createEffect } from "solid-js";
const [last, setLast] = createSignal("", { name: "last", ownedWrite: true });
createEffect(
  () => {
    setLast(query());
    return query();
  },
  (value) => console.log(value)
);

import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, signalOptions);
const value = createMemo(() => {
  setCache(compute());
  return cache();
});

import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, { ...baseOptions });
const value = createMemo(() => {
  setCache(compute());
  return cache();
});

```
<!-- end-doc-gen -->
