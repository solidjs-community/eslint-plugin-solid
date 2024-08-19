// @ts-nocheck
import { render } from "solid-js/web";
import Info from "./info";

const pkg = {
  name: "solid-js",
  version: 1,
  speed: "⚡️",
  website: "https://solidjs.com",
};

function App() {
  return <Info {...pkg} />;
}

render(() => <App />, document.getElementById("app"));
