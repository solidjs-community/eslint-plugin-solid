// @ts-nocheck
import { createSignal, createContext, useContext } from "solid-js";

const CounterContext = createContext();

export function CounterProvider(props) {
  // eslint-disable-next-line solid/reactivity
  const [count, setCount] = createSignal(props.count || 0),
    store = [
      count,
      {
        increment() {
          setCount((c) => c + 1);
        },
        decrement() {
          setCount((c) => c - 1);
        },
      },
    ];
  return <CounterContext.Provider value={store}>{props.children}</CounterContext.Provider>;
}

export function useCounter() {
  return useContext(CounterContext);
}
