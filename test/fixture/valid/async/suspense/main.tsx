// @ts-nocheck
import { render } from "solid-js/web";
import { lazy, Suspense } from "solid-js";

const Greeting = lazy(async () => {
  // simulate delay
  await new Promise((r) => setTimeout(r, 1000));
  return import("./greeting");
});

function App() {
  return (
    <>
      <h1>Welcome</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <Greeting name="Jake" />
      </Suspense>
    </>
  );
}

render(() => <App />, document.getElementById("app"));
