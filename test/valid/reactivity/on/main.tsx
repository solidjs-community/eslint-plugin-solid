// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, createEffect, on } from "solid-js";

const App = () => {
  const [a, setA] = createSignal(1);
  const [b, setB] = createSignal(1);
  const [c, setC] = createSignal(1);

  createEffect(
    on(
      a,
      (a) => {
        console.log(a, b());
      },
      { defer: true }
    )
  );

  return (
    <>
      <button onClick={() => setA(a() + 1)}>Increment A</button>
      <button on:click={() => setB(b() + 1)}>Increment B</button>
      <button on-click={() => setC(c() + 1)}>Increment C</button>
      <button onClick={async () => setA(a() + 1)}>Async Increment A</button>
      <button on:click={async () => setB(b() + 1)}>Async Increment B</button>
      <button on-click={async () => setC(c() + 1)}>Async Increment C</button>
    </>
  );
};

render(App, document.getElementById("app"));
