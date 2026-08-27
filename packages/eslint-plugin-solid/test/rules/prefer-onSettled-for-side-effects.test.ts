import { run } from "../ruleTester";
import rule from "../../src/rules/prefer-onSettled-for-side-effects";

export const cases = run("prefer-onSettled-for-side-effects", rule, {
  valid: [
    // setup inside onSettled is the goal state
    `import { onSettled } from "solid-js";
function Timer() {
  onSettled(() => {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  });
  return <div />;
}`,
    // inside an event handler is fine
    `function App() {
  const start = () => setInterval(tick, 1000);
  return <button onClick={start} />;
}`,
    // non-component functions are not flagged
    `function schedulePoll() {
  setInterval(poll, 5000);
}`,
    // onCleanup alone is never the offense
    `import { onCleanup } from "solid-js";
function App() {
  onCleanup(() => subscription.dispose());
  return <div />;
}`,
    // element listeners (non-global) are not flagged
    `function App() {
  let el;
  el.addEventListener("click", handler);
  return <div />;
}`,
  ],
  invalid: [
    {
      code: `function Timer() {
  const timer = setInterval(tick, 1000);
  return <div />;
}`,
      errors: [{ messageId: "sideEffectInBody" }],
    },
    {
      code: `import { onCleanup } from "solid-js";
function App() {
  window.addEventListener("resize", onResize);
  onCleanup(() => window.removeEventListener("resize", onResize));
  return <div />;
}`,
      errors: [{ messageId: "sideEffectInBody" }],
    },
    {
      code: `const App = () => {
  const observer = new ResizeObserver(callback);
  return <div />;
};`,
      errors: [{ messageId: "sideEffectInBody" }],
    },
    {
      code: `const Widget = () => {
  document.addEventListener("keydown", onKey);
  return <div />;
};`,
      errors: [{ messageId: "sideEffectInBody" }],
    },
  ],
});
