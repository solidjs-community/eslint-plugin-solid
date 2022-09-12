// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

import Greeting from "./greeting";

function App() {
  const [name, setName] = createSignal();

  return (
    <>
      <Greeting greeting="Hello" />
      <Greeting name="Jeremy" />
      <Greeting name={name()} />
      <button onClick={() => setName("Jarod")}>Set Name</button>
    </>
  );
}

render(() => <App />, document.getElementById("app"));
