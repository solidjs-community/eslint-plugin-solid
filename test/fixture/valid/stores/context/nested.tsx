// @ts-nocheck
import { useCounter } from "./counter";

export default function Nested() {
  const [count, { increment, decrement }] = useCounter();
  return (
    <>
      <div>{count()}</div>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </>
  );
}
