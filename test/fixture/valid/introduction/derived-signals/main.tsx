// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);
  const doubleCount = () => count() * 2;

  setInterval(() => setCount(count() + 1), 1000);

  return <div>Count: {doubleCount()}</div>;
}

render(() => <Counter />, document.getElementById("app"));
