// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, createEffect, untrack } from "solid-js";

const App = () => {
  const [a, setA] = createSignal(1);
  const [b, setB] = createSignal(1);

  createEffect(() => {
    console.log(a(), untrack(b));
  });

  return (
    <>
      <button onClick={() => setA(a() + 1)}>Increment A</button>
      <button onClick={() => setB(b() + 1)}>Increment B</button>
    </>
  );
};

render(App, document.getElementById("app"));
