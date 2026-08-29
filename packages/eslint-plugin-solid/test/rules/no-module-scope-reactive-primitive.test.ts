import { run } from "../ruleTester.js";
import rule from "../../src/rules/no-module-scope-reactive-primitive.js";

export const cases = run("no-module-scope-reactive-primitive", rule, {
  valid: [
    // inside a component
    `import { createSignal } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  return <div>{count()}</div>;
}`,
    // inside any function (custom primitives, providers)
    `import { createStore } from "solid-js";
export function createTodos() {
  const [todos, setTodos] = createStore([]);
  return [todos, setTodos];
}`,
    // createRoot is the deliberate escape hatch: the primitive is inside its callback
    `import { createRoot, createSignal } from "solid-js";
const counter = createRoot(() => createSignal(0));`,
  ],
  invalid: [
    {
      code: `import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);`,
      errors: [{ messageId: "moduleScopePrimitive", data: { name: "createSignal" } }],
    },
    {
      code: `import { createStore } from "solid-js";
export const [state, setState] = createStore({ user: null });`,
      errors: [{ messageId: "moduleScopePrimitive", data: { name: "createStore" } }],
    },
    {
      code: `import { createMemo } from "solid-js";
const doubled = createMemo(() => count() * 2);`,
      errors: [{ messageId: "moduleScopePrimitive", data: { name: "createMemo" } }],
    },
    {
      code: `import { createEffect } from "solid-js";
createEffect(count, (c) => console.log(c));`,
      errors: [{ messageId: "moduleScopePrimitive", data: { name: "createEffect" } }],
    },
  ],
});
