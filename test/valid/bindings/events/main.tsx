// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

import "./style.css";

function App() {
  const [pos, setPos] = createSignal({ x: 0, y: 0 });

  function handleMouseMove(event) {
    setPos({
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <div onMouseMove={handleMouseMove}>
      The mouse position is {pos().x} x {pos().y}
    </div>
  );
}

render(() => <App />, document.getElementById("app"));
