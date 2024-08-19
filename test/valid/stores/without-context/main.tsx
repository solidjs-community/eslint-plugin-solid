// @ts-nocheck
import { render } from "solid-js/web";
import counter from "./counter";

function Counter() {
  const { count, doubleCount, increment } = counter;

  return (
    <button type="button" onClick={increment}>
      {count()} {doubleCount()}
    </button>
  );
}

render(() => <Counter />, document.getElementById("app"));
