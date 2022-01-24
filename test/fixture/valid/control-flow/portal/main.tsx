// @ts-nocheck
import { render, Portal } from "solid-js/web";

function App() {
  return (
    <div class="app-container">
      <p>Just some text inside a div that has a restricted size.</p>
      <Portal>
        <div class="popup">
          <h1>Popup</h1>
          <p>Some text you might need for something or other.</p>
        </div>
      </Portal>
    </div>
  );
}

render(() => <App />, document.getElementById("app"));
