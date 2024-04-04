// @ts-nocheck
import { createSignal } from "solid-js";
import { render } from "solid-js/web";

function App() {
  const [a] = createSignal("a" as string);

  return <div>{a()}</div>;
}

render(() => <App />, document.getElementById("app"));
