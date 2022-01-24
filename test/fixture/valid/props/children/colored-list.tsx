// @ts-nocheck
import { createEffect, children } from "solid-js";

export default function ColoredList(props) {
  const c = children(() => props.children);
  createEffect(() => c().forEach((item) => (item.style.color = props.color)));
  return <>{c()}</>;
}
