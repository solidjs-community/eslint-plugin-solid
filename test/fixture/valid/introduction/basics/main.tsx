// @ts-nocheck
import { render } from "solid-js/web";

function HelloWorld() {
  return <div>Hello Solid World!</div>;
}

render(() => <HelloWorld />, document.getElementById("app"));
