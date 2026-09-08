<!-- doc-gen HEADER -->
# solid/no-write-in-pure-computation
Disallow writing signals or stores inside `createMemo`, the compute half of `createEffect`, or a component body, which are pure owned scopes.
This rule is **off** by default.

[View source](../src/rules/no-write-in-pure-computation.ts) · [View tests](../test/rules/no-write-in-pure-computation.test.ts)
<!-- end-doc-gen -->

`createMemo` callbacks, the compute half of `createEffect(compute, effect)`, and component bodies are pure owned scopes in Solid 2.0: writing other reactive state from inside them creates update cycles, and Solid 2.0 throws on it in dev mode (`REACTIVE_WRITE_IN_OWNED_SCOPE`). The usual intent — deriving one piece of state from another, or initializing state — has a first-class answer that doesn't need a write at all.

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

```jsx
// ✗ Setup-scope write: the component body runs once, as a pure owned scope
function Counter(props) {
  const [count, setCount] = createSignal(0);
  setCount(props.start); // throws in 2.0 dev
  return <div>{count()}</div>;
}

// ✓ Initialize with the right value
function Counter(props) {
  const [count, setCount] = createSignal(props.start);
  return <div>{count()}</div>;
}
```

Only setter calls whose nearest enclosing function *is* the pure scope are flagged. A setter inside a nested function — an event handler, an `onSettled` or `createTrackedEffect` callback, the effect half of `createEffect` — runs later, in an imperative scope, and is fine; this falls out of the function-boundary discipline without name-listing the sanctioned callbacks, which matches core exactly (those scopes carry the config flag core's write guard skips). Components are recognized the same way as in `no-destructure`: component-shaped functions (not lowercase-named, not render props or plain data callbacks) that contain JSX. Setters are recognized by resolving to the second element of a `createSignal`, `createStore`, or `createOptimistic` destructure.

Signals created with the `ownedWrite: true` option are exempt: that option is core's own opt-in for intentional owned-scope writes (its runtime error message suggests it), so the linter honors it rather than contradicting it. The options argument is read when it's an object literal, following one level of `const` indirection when the variable is provably untouched otherwise. Anything the rule can't read conclusively — a spread, a cast, a variable that's mutated or escapes — is assumed to opt in, so the rule only ever under-reports; it never contradicts core. The opt-in applies to signals only — store setters have no such exemption in core.

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
const opts = { name: "count" };
const [count, setCount] = createSignal(0, opts);
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

import { createSignal } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  setCount(1);
  return <div>{count()}</div>;
}

import { createSignal } from "solid-js";
const [theme, setTheme] = createSignal("dark");
const Header = () => {
  setTheme("light");
  return <header>{theme()}</header>;
};

import { createSignal, createStore } from "solid-js";
function App(props) {
  const [store, setStore] = createStore({ ready: false });
  if (props.eager)
    setStore((draft) => {
      draft.ready = true;
    });
  return <div>{String(store.ready)}</div>;
}

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
const opts = { ownedWrite: true };
const [cache, setCache] = createSignal(0, opts);
const value = createMemo(() => {
  setCache(compute());
  return cache();
});

import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, signalOptions);
const value = createMemo(() => {
  setCache(compute());
  return cache();
});

import { createSignal, createMemo } from "solid-js";
const opts = { name: "cache" };
opts.ownedWrite = true;
const [cache, setCache] = createSignal(0, opts);
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

import { createSignal, onSettled, createTrackedEffect } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  onSettled(() => setCount(1));
  createTrackedEffect(() => setCount(count() + 1));
  const onClick = () => setCount(count() + 1);
  return <button onClick={onClick}>{count()}</button>;
}

import { createSignal, createEffect } from "solid-js";
function Tracker() {
  const [pos, setPos] = createSignal(0);
  const [log, setLog] = createSignal("");
  createEffect(
    () => pos(),
    (value) => setLog(String(value))
  );
  return <div>{log()}</div>;
}

import { createSignal } from "solid-js";
const [flag, setFlag] = createSignal(false);
function renderReset() {
  setFlag(false);
  return <div />;
}

import { createSignal } from "solid-js";
const [n, setN] = createSignal(0);
const rows = items.map((item) => {
  setN(item.id);
  return <li>{item.name}</li>;
});

import { createSignal } from "solid-js";
function Widget() {
  const [cache, setCache] = createSignal(0, { ownedWrite: true });
  setCache(1);
  return <div>{cache()}</div>;
}

import { createSignal } from "solid-js";
function useCounter() {
  const [count, setCount] = createSignal(0);
  setCount(1);
  return count;
}

```
<!-- end-doc-gen -->
