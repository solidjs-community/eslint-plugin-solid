// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, For } from "solid-js";

import ColoredList from "./colored-list";

function App() {
  const [color, setColor] = createSignal("purple");

  return (
    <>
      <ColoredList color={color()}>
        <For each={["Most", "Interesting", "Thing"]}>{(item) => <div>{item}</div>}</For>
      </ColoredList>
      <button onClick={() => setColor("teal")}>Set Color</button>
    </>
  );
}

render(() => <App />, document.getElementById("app"));
