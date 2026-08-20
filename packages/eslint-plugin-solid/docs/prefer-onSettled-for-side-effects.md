<!-- doc-gen HEADER -->
# solid/prefer-onSettled-for-side-effects
Enforce running side-effectful setup (timers, global listeners, observers) inside `onSettled` instead of the component body.
This rule is **off** by default.

[View source](../src/rules/prefer-onSettled-for-side-effects.ts) · [View tests](../test/rules/prefer-onSettled-for-side-effects.test.ts)
<!-- end-doc-gen -->

Side-effectful setup in a component body — timers, global event listeners, observers — runs during component setup: on the server during SSR, and on the client before the DOM has settled. `onSettled` (the 2.0 equivalent of `onMount`) runs client-side at the right time and can return a cleanup function.

`onCleanup` itself is never flagged. It is legitimate and lower-overhead than an `onSettled` return-cleanup; a paired `onCleanup` is a symptom of setup work that belongs in `onSettled`, not the offense. The rule triggers only on a short list of recognized side-effectful calls (`setInterval`/`setTimeout`, `window`/`document` `addEventListener`, `new *Observer`) made directly in a component body — the same calls inside `onSettled`, effects, or event handlers are fine.

This rule is a warning in the `v2-strict` config only.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
function Timer() {
  const timer = setInterval(tick, 1000);
  return <div />;
}

import { onCleanup } from "solid-js";
function App() {
  window.addEventListener("resize", onResize);
  onCleanup(() => window.removeEventListener("resize", onResize));
  return <div />;
}

const App = () => {
  const observer = new ResizeObserver(callback);
  return <div />;
};

const Widget = () => {
  document.addEventListener("keydown", onKey);
  return <div />;
};

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { onSettled } from "solid-js";
function Timer() {
  onSettled(() => {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  });
  return <div />;
}

function App() {
  const start = () => setInterval(tick, 1000);
  return <button onClick={start} />;
}

function schedulePoll() {
  setInterval(poll, 5000);
}

import { onCleanup } from "solid-js";
function App() {
  onCleanup(() => subscription.dispose());
  return <div />;
}

function App() {
  let el;
  el.addEventListener("click", handler);
  return <div />;
}

```
<!-- end-doc-gen -->
