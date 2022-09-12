// @ts-nocheck
import { splitProps } from "solid-js";

export default function Greeting(props) {
  const [local, others] = splitProps(props, ["greeting", "name"]);
  return (
    <h3 {...others}>
      {local.greeting} {local.name}
    </h3>
  );
}
