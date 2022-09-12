// @ts-nocheck
import { render } from "solid-js/web";
import { ErrorBoundary } from "solid-js";

const Broken = () => {
  throw new Error("Oh No");
  return <>Never Getting Here</>;
};

function App() {
  return (
    <>
      <div>Before</div>
      <ErrorBoundary fallback={(err) => err}>
        <Broken />
      </ErrorBoundary>
      <div>After</div>
    </>
  );
}

render(() => <App />, document.getElementById("app"));
