<!-- doc-gen HEADER -->
# solid/no-module-scope-reactive-primitive
Disallow reactive primitives at module scope, where state is shared across SSR requests.
This rule is **off** by default.

[View source](../src/rules/no-module-scope-reactive-primitive.ts) · [View tests](../test/rules/no-module-scope-reactive-primitive.test.ts)
<!-- end-doc-gen -->

Reactive state created at module scope is shared across every request when server rendering, leaking one user's state into another's response. This is a valid pattern in client-only apps — which is why this rule lives only in the `v2-strict` config.

Create reactive state inside a component or provider instead. If module-level state is intentional (a client-only global store), wrap it in `createRoot`, which both documents the intent and gives the state an owner; the rule does not flag primitives created inside any function, including `createRoot` callbacks.

This rule is enabled as an error in the `v2-strict` config only.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);

import { createStore } from "solid-js";
export const [state, setState] = createStore({ user: null });

import { createMemo } from "solid-js";
const doubled = createMemo(() => count() * 2);

import { createEffect } from "solid-js";
createEffect(count, (c) => console.log(c));

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createSignal } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  return <div>{count()}</div>;
}

import { createStore } from "solid-js";
export function createTodos() {
  const [todos, setTodos] = createStore([]);
  return [todos, setTodos];
}

import { createRoot, createSignal } from "solid-js";
const counter = createRoot(() => createSignal(0));

```
<!-- end-doc-gen -->
