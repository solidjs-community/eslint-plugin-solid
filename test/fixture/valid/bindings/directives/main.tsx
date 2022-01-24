// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, Show } from "solid-js";
import clickOutside from "./click-outside";
import "./style.css";

function App() {
  const [show, setShow] = createSignal(false);

  return (
    <Show when={show()} fallback={<button onClick={() => setShow(true)}>Open Modal</button>}>
      <div class="modal" use:clickOutside={() => setShow(false)}>
        Some Modal
      </div>
    </Show>
  );
}

render(() => <App />, document.getElementById("app"));
