// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function Counter() {
  // eslint-disable-next-line no-unused-vars
  const [count, setCount] = createSignal(0);

  setTimeout(() => console.log(count()), 4500);

  return <div>Count: {count()}</div>;
}

render(() => <Counter />, document.getElementById("app"));
