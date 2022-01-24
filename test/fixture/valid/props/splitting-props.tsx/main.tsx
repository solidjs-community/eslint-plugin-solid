// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

import Greeting from "./greeting";

function App() {
  const [name, setName] = createSignal("Jakob");

  return (
    <>
      <Greeting greeting="Yo" name={name()} style={{ color: "teal" }} />
      <button onClick={() => setName("Jarod")}>Set Name</button>
    </>
  );
}

render(() => <App />, document.getElementById("app"));
