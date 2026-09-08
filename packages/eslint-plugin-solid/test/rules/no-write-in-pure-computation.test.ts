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
    // options we can't read statically may contain the opt-in; stay quiet
    `import { createSignal, createMemo } from "solid-js";
const [cache, setCache] = createSignal(0, signalOptions);
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
  ],
});
