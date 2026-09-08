import { run } from "../ruleTester";
import rule from "../../src/rules/no-unused-signal";

export const cases = run("no-unused-signal", rule, {
  valid: [
    `import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
console.log(count());
setCount(1);`,
    // passing either half along counts as a use
    `import { createSignal } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  return <Child value={count} onIncrement={setCount} />;
}`,
    // exported signals can be read or written by other modules
    `import { createSignal } from "solid-js";
export const [theme, setTheme] = createSignal("light");`,
    // the whole tuple is the handle; nothing to prove here
    `import { createSignal } from "solid-js";
const tuple = createSignal(0);
use(tuple);`,
    // imports from unknown modules aren't Solid's primitives unless
    // registered via settings.solid.moduleSources (#183)
    `import { createSignal } from "my-solid-renderer";
const [count, setCount] = createSignal(0);
console.log(count());`,
    // stores and optimistic tuples get the same conclusive treatment
    `import { createStore } from "solid-js";
const [store, setStore] = createStore({ n: 0 });
console.log(store.n);
setStore((draft) => draft.n++);`,
    `import { createOptimistic } from "solid-js";
const [likes, setLikes] = createOptimistic(0);
console.log(likes());
setLikes(1);`,
  ],
  invalid: [
    {
      code: `import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
console.log(count());`,
      errors: [
        {
          messageId: "neverWritten",
          suggestions: [
            {
              messageId: "replaceWithAccessor",
              output: `import { createSignal } from "solid-js";
const count = () => 0;
console.log(count());`,
            },
          ],
        },
      ],
    },
    {
      code: `import { createSignal } from "solid-js";
const [count] = createSignal(0);
console.log(count());`,
      errors: [
        {
          messageId: "neverWritten",
          suggestions: [
            {
              messageId: "replaceWithAccessor",
              output: `import { createSignal } from "solid-js";
const count = () => 0;
console.log(count());`,
            },
          ],
        },
      ],
    },
    // non-literal initializer: report without a suggestion
    {
      code: `import { createSignal } from "solid-js";
const [items, setItems] = createSignal([]);
console.log(items());`,
      errors: [{ messageId: "neverWritten" }],
    },
    {
      code: `import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
setCount(5);`,
      errors: [{ messageId: "neverRead" }],
    },
    {
      code: `import { createSignal } from "solid-js";
const [, setCount] = createSignal(0);
setCount(5);`,
      errors: [{ messageId: "neverRead" }],
    },
    // a never-written store is a plain object with extra steps; no accessor
    // rewrite suggestion, since a store proxy isn't accessor-shaped
    {
      code: `import { createStore } from "solid-js";
const [config] = createStore({ theme: "dark" });
console.log(config.theme);`,
      errors: [{ messageId: "neverWritten" }],
    },
    {
      code: `import { createStore } from "solid-js";
const [state, setState] = createStore({ n: 0 });
setState((draft) => draft.n++);`,
      errors: [{ messageId: "neverRead" }],
    },
    {
      code: `import { createOptimistic } from "solid-js";
const [likes, setLikes] = createOptimistic(0);
console.log(likes());`,
      errors: [
        {
          messageId: "neverWritten",
        },
      ],
    },
    // settings.solid.moduleSources registers custom renderers/re-export
    // wrappers as Solid primitive sources (#183)
    {
      code: `import { createSignal } from "my-solid-renderer";
const [count, setCount] = createSignal(0);
console.log(count());`,
      settings: { solid: { moduleSources: ["my-solid-renderer"] } },
      errors: [
        {
          messageId: "neverWritten",
          suggestions: [
            {
              messageId: "replaceWithAccessor",
              output: `import { createSignal } from "my-solid-renderer";
const count = () => 0;
console.log(count());`,
            },
          ],
        },
      ],
    },
  ],
});
