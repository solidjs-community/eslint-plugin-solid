// @ts-nocheck
import { render } from "solid-js/web";
import { lazy } from "solid-js";

const Greeting = lazy(() => import("./greeting"));

function App() {
  return (
    <>
      <h1>Welcome</h1>
      <Greeting name="Jake" />
    </>
  );
}

render(() => <App />, document.getElementById("app"));
