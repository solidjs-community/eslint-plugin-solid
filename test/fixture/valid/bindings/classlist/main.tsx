// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

import "./style.css";

function App() {
  const [current, setCurrent] = createSignal("foo");

  return (
    <>
      <button classList={{ selected: current() === "foo" }} onClick={() => setCurrent("foo")}>
        foo
      </button>
      <button classList={{ selected: current() === "bar" }} onClick={() => setCurrent("bar")}>
        bar
      </button>
      <button classList={{ selected: current() === "baz" }} onClick={() => setCurrent("baz")}>
        baz
      </button>
    </>
  );
}

render(() => <App />, document.getElementById("app"));
