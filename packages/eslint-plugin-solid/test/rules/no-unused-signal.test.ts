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
  ],
});
