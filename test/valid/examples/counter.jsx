import { createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";

const CountingComponent = () => {
  const [count, setCount] = createSignal(0);
  const interval = setInterval(() => setCount((c) => c + 1), 1000);
  onCleanup(function cleanup() {
    clearInterval(interval + count());
  });
  return <div>Count value is {count()}</div>;
};

render(() => <CountingComponent />, document.getElementById("app"));
