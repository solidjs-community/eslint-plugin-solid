import { createSignal as fooBar } from "solid-js";

const [signal] = fooBar(5);
console.log(signal());
