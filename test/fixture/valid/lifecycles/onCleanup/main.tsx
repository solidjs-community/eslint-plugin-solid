// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, onCleanup } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);

  const timer = setInterval(() => setCount(count() + 1), 1000);
  onCleanup(() => clearInterval(timer));

  return <div>Count: {count()}</div>;
}

render(() => <Counter />, document.getElementById("app"));
