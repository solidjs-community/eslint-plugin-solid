// @ts-nocheck
import { render } from "solid-js/web";
import Nested from "./nested";
import { CounterProvider } from "./counter";

function App() {
  return (
    <>
      <h1>Welcome to Counter App</h1>
      <Nested />
    </>
  );
}

render(
  () => (
    <CounterProvider count={1}>
      <App />
    </CounterProvider>
  ),
  document.getElementById("app")
);
