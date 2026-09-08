import { vi } from "vitest";

// The global vitest setup mocks trackImports so most rule tests can skip
// import boilerplate. These cases exercise the real import gating — foreign
// createStores excluded, Solid aliases resolved — so restore it here. This
// file is intentionally not named `<rule>.test.ts`: scripts/docs.mts imports
// test files by that name to build docs and cannot load files using vitest
// APIs.
vi.unmock("../../src/utils");

import { run } from "../ruleTester";
import rule from "../../src/rules/no-store-mutation-outside-setter";

export const cases = run("no-store-mutation-outside-setter", rule, {
  valid: [
    // not Solid's createStore
    `import { createStore } from "another-library";
const [store, setStore] = createStore({ count: 0 });
store.count = 5;`,
    `const createStore = (init) => [init, () => {}];
const [store, setStore] = createStore({ count: 0 });
store.count++;`,
  ],
  invalid: [
    {
      code: `import { createStore as makeStore } from "solid-js";
const [store, setStore] = makeStore({ count: 0 });
store.count = 5;`,
      errors: [{ messageId: "mutateStore" }],
    },
    // createStore is importable from "solid-js/store" for compatibility
    {
      code: `import { createStore } from "solid-js/store";
const [store, setStore] = createStore({ items: [] });
store.items.push(1);`,
      errors: [{ messageId: "mutateStore" }],
    },
  ],
});
