import { run } from "../ruleTester";
import rule from "../../src/rules/no-store-mutation-outside-setter";

export const cases = run("no-store-mutation-outside-setter", rule, {
  valid: [
    `import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
setStore((draft) => {
  draft.count++;
});
console.log(store.count);`,
    // a shadowing parameter is the draft, not the read proxy
    `import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
setStore((store) => {
  store.count = 5;
});`,
    // snapshots are plain data and free to mutate
    `import { createStore, snapshot } from "solid-js";
const [store, setStore] = createStore({ items: [] });
const copy = snapshot(store);
copy.items.push(1);`,
    // non-mutating methods read through the proxy
    `import { createStore } from "solid-js";
const [store, setStore] = createStore({ items: [] });
const doubled = store.items.map((n) => n * 2);
setStore((draft) => (draft.items = doubled));`,
    // plain objects are not stores
    `const obj = { count: 0 };
obj.count++;
delete obj.count;`,
  ],
  invalid: [
    {
      code: `import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
store.count = 5;`,
      errors: [{ messageId: "mutateStore" }],
    },
    {
      code: `import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
store.count++;`,
      errors: [{ messageId: "mutateStore" }],
    },
    {
      code: `import { createStore } from "solid-js";
const [store, setStore] = createStore({ items: [] });
store.items.push(item);`,
      errors: [{ messageId: "mutateStore" }],
    },
    {
      code: `import { createStore } from "solid-js";
const [store, setStore] = createStore({ user: { name: "a" } });
delete store.user.name;`,
      errors: [{ messageId: "mutateStore" }],
    },
    {
      code: `import { createStore } from "solid-js";
const [store, setStore] = createStore({ nested: { deep: { value: 0 } } });
store.nested.deep.value = 1;`,
      errors: [{ messageId: "mutateStore" }],
    },
    // mutating the read proxy is wrong even inside the setter — use the draft
    {
      code: `import { createStore } from "solid-js";
const [store, setStore] = createStore({ count: 0 });
setStore(() => {
  store.count = 5;
});`,
      errors: [{ messageId: "mutateStore" }],
    },
    {
      code: `import { createProjection } from "solid-js";
const selected = createProjection((draft) => {
  draft[selectedId()] = true;
});
selected.other = true;`,
      errors: [{ messageId: "mutateProjection" }],
    },
  ],
});
