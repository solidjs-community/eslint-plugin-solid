import { run } from "../ruleTester.js";
import rule from "../../src/rules/no-accessor-as-prop.js";

export const cases = run("no-accessor-as-prop", rule, {
  valid: [
    // called accessors are values
    `import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <div title={count()} />;`,
    `import { createMemo } from "solid-js";
const label = createMemo(() => "hi");
let el = <input value={label()} />;`,
    // event handlers and refs legitimately take functions
    `import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
let el = <button onClick={() => setCount(count() + 1)} ref={register} />;`,
    // components may accept function props; only DOM elements are checked
    `import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <Counter value={count} />;`,
    // custom elements are skipped
    `import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <my-element value={count} />;`,
    // unresolvable identifiers are left alone
    `let el = <div title={title} />;`,
    // non-accessor values
    `let el = <div title={"hello"} tabindex={0} />;`,
  ],
  invalid: [
    {
      code: `import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <div title={count} />;`,
      errors: [
        {
          messageId: "accessorAsProp",
          data: { attribute: "title", name: "count" },
          suggestions: [
            {
              messageId: "accessorAsProp",
              data: { attribute: "title", name: "count" },
              output: `import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <div title={count()} />;`,
            },
          ],
        },
      ],
    },
    {
      code: `import { createMemo } from "solid-js";
const label = createMemo(() => "hi");
let el = <input value={label} />;`,
      errors: [
        {
          messageId: "accessorAsProp",
          data: { attribute: "value", name: "label" },
          suggestions: [
            {
              messageId: "accessorAsProp",
              data: { attribute: "value", name: "label" },
              output: `import { createMemo } from "solid-js";
const label = createMemo(() => "hi");
let el = <input value={label()} />;`,
            },
          ],
        },
      ],
    },
    {
      // plain functions are wrong in value-typed attributes too
      code: `const getTitle = () => "hello";
let el = <div title={getTitle} />;`,
      errors: [
        {
          messageId: "functionAsProp",
          data: { attribute: "title" },
          suggestions: [
            {
              messageId: "functionAsProp",
              data: { attribute: "title" },
              output: `const getTitle = () => "hello";
let el = <div title={getTitle()} />;`,
            },
          ],
        },
      ],
    },
    {
      // inline arrow function
      code: `let el = <div title={() => "hello"} />;`,
      errors: [{ messageId: "functionAsProp", data: { attribute: "title" } }],
    },
  ],
});
