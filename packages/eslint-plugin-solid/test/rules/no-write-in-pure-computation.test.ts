import { run } from "../ruleTester";
import rule from "../../src/rules/no-write-in-pure-computation";

export const cases = run("no-write-in-pure-computation", rule, {
  valid: [
    // the effect half is the sanctioned place for writes
    `import { createSignal, createEffect } from "solid-js";
const [count, setCount] = createSignal(0);
const [double, setDouble] = createSignal(0);
createEffect(() => count(), (value) => setDouble(value * 2));`,
    // event handlers and other deferred functions write outside the computation
    `import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0);
const handler = createMemo(() => () => setCount(count() + 1));`,
    `import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
setCount(5);`,
    // reads inside a memo are what memos are for
    `import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);`,
    // functions that aren't tuple setters are not writes
    `import { createMemo } from "solid-js";
const result = createMemo(() => transform(input()));`,
    // `ownedWrite: true` opts a signal into owned-scope writes; core skips its
    // dev guard for these, and its error message steers users to the option
    `import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, { ownedWrite: true });
const value = createMemo(() => {
  setCache(compute());
  return cache();
});`,
    `import { createSignal, createEffect } from "solid-js";
const [last, setLast] = createSignal("", { name: "last", ownedWrite: true });
createEffect(() => {
  setLast(query());
  return query();
}, (value) => console.log(value));`,
    // the opt-in resolves through one level of const indirection
    `import { createSignal, createMemo } from "solid-js";
const opts = { ownedWrite: true };
const [cache, setCache] = createSignal(0, opts);
const value = createMemo(() => {
  setCache(compute());
  return cache();
});`,
    // options we can't read statically may contain the opt-in; stay quiet
    `import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, signalOptions);
const value = createMemo(() => {
  setCache(compute());
  return cache();
});`,
    // a later property write makes the literal read inconclusive; stay quiet
    `import { createSignal, createMemo } from "solid-js";
const opts = { name: "cache" };
opts.ownedWrite = true;
const [cache, setCache] = createSignal(0, opts);
const value = createMemo(() => {
  setCache(compute());
  return cache();
});`,
    `import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, { ...baseOptions });
const value = createMemo(() => {
  setCache(compute());
  return cache();
});`,
    // writes in a component belong in callbacks — all exempt via the
    // nearest-enclosing-function discipline, no name-listing needed
    `import { createSignal, onSettled, createTrackedEffect } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  onSettled(() => setCount(1));
  createTrackedEffect(() => setCount(count() + 1));
  const onClick = () => setCount(count() + 1);
  return <button onClick={onClick}>{count()}</button>;
}`,
    // effect halves inside components are imperative scopes
    `import { createSignal, createEffect } from "solid-js";
function Tracker() {
  const [pos, setPos] = createSignal(0);
  const [log, setLog] = createSignal("");
  createEffect(() => pos(), (value) => setLog(String(value)));
  return <div>{log()}</div>;
}`,
    // lowercase helpers and data callbacks that contain JSX aren't components
    `import { createSignal } from "solid-js";
const [flag, setFlag] = createSignal(false);
function renderReset() {
  setFlag(false);
  return <div />;
}`,
    `import { createSignal } from "solid-js";
const [n, setN] = createSignal(0);
const rows = items.map((item) => {
  setN(item.id);
  return <li>{item.name}</li>;
});`,
    // ownedWrite signals may be written during setup too
    `import { createSignal } from "solid-js";
function Widget() {
  const [cache, setCache] = createSignal(0, { ownedWrite: true });
  setCache(1);
  return <div>{cache()}</div>;
}`,
    // functions without JSX are not components; a custom primitive's writes
    // are its own business (and un-provable here anyway)
    `import { createSignal } from "solid-js";
function useCounter() {
  const [count, setCount] = createSignal(0);
  setCount(1);
  return count;
}`,
  ],
  invalid: [
    {
      code: `import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0);
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
    {
      code: `import { createSignal, createEffect } from "solid-js";
const [log, setLog] = createSignal("");
createEffect(() => {
  setLog(query());
  return query();
}, (value) => console.log(value));`,
      errors: [{ messageId: "writeInCompute" }],
    },
    {
      code: `import { createSignal, createRenderEffect } from "solid-js";
const [size, setSize] = createSignal(0);
createRenderEffect(() => {
  setSize(width());
  return width();
}, (value) => update(value));`,
      errors: [{ messageId: "writeInCompute" }],
    },
    // store setters are writes too
    {
      code: `import { createStore, createMemo } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
const bad = createMemo(() => {
  setStore((draft) => draft.count++);
  return store.count;
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
    // an options literal without the opt-in doesn't exempt anything
    {
      code: `import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0, { name: "count" });
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
    // ...including through const indirection
    {
      code: `import { createSignal, createMemo } from "solid-js";
const opts = { name: "count" };
const [count, setCount] = createSignal(0, opts);
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
    {
      code: `import { createSignal, createMemo } from "solid-js";
const [count, setCount] = createSignal(0, { ownedWrite: false });
const bad = createMemo(() => {
  setCount(count() + 1);
  return count();
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
    // ownedWrite is a SignalOptions flag; core has no such exemption for store setters
    {
      code: `import { createStore, createMemo } from "solid-js";
const [store, setStore] = createStore({ count: 0 }, { ownedWrite: true });
const bad = createMemo(() => {
  setStore((draft) => draft.count++);
  return store.count;
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
    // setup-scope writes in component bodies throw in 2.0 dev
    {
      code: `import { createSignal } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  setCount(1);
  return <div>{count()}</div>;
}`,
      errors: [{ messageId: "writeInComponent" }],
    },
    // arrow components and module-level signals are the same hazard
    {
      code: `import { createSignal } from "solid-js";
const [theme, setTheme] = createSignal("dark");
const Header = () => {
  setTheme("light");
  return <header>{theme()}</header>;
};`,
      errors: [{ messageId: "writeInComponent" }],
    },
    // conditional writes still run during setup
    {
      code: `import { createSignal, createStore } from "solid-js";
function App(props) {
  const [store, setStore] = createStore({ ready: false });
  if (props.eager) setStore((draft) => { draft.ready = true; });
  return <div>{String(store.ready)}</div>;
}`,
      errors: [{ messageId: "writeInComponent" }],
    },
  ],
});
