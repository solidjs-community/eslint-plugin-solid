// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, createEffect } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);
  createEffect(() => {
    console.log("The count is now", count());
  });

  return <button onClick={() => setCount(count() + 1)}>Click Me</button>;
}

render(() => <Counter />, document.getElementById("app"));
