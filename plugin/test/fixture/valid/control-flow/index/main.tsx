// @ts-nocheck
import { render } from "solid-js/web";
import { createSignal, Index } from "solid-js";

function App() {
  const [cats] = createSignal([
    { id: "J---aiyznGQ", name: "Keyboard Cat" },
    { id: "z_AbfPXTKms", name: "Maru" },
    { id: "OUtn3pvWmpg", name: "Henri The Existential Cat" },
  ]);

  return (
    <ul>
      <Index each={cats()}>
        {(cat, i) => (
          <li>
            <a target="_blank" href={`https://www.youtube.com/watch?v=${cat().id}`}>
              {i + 1}: {cat().name}
            </a>
          </li>
        )}
      </Index>
    </ul>
  );
}

render(() => <App />, document.getElementById("app"));
