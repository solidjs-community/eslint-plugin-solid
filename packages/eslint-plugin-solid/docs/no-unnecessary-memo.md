<!-- doc-gen HEADER -->
# solid/no-unnecessary-memo
Disallow `createMemo` around a fresh object, array, or JSX value that is read in only one place.
This rule is **off** by default.

[View source](../src/rules/no-unnecessary-memo.ts) · [View tests](../test/rules/no-unnecessary-memo.test.ts)
<!-- end-doc-gen -->

A memo earns its place in two ways: it shares one computation between several readers, and its equality check stops an update from propagating when the value did not change. A memo whose function returns a fresh object, array, or JSX value never compares equal to its previous value, so the equality check never helps. If that memo is also read in exactly one place, nothing shares it either. The reader would track the same sources on its own, so the memo only adds a node, an allocation, and an extra propagation step.

```jsx
// ✗ A new object on every run, read once
const style = createMemo(() => ({ color: props.color }));
return <div style={style()} />;

// ✓ A plain function does the same work with one less node
const style = () => ({ color: props.color });
return <div style={style()} />;

// ✓ Or inline it
return <div style={{ color: props.color }} />;
```

A memo is only reported when the single read is known to run once per update of one computation:

- an expression in an attribute or child of a native element, with only native elements and fragments between it and the memo's scope, or
- the function passed to `createMemo`, or the compute half of `createEffect(compute, effect)` / `createRenderEffect(compute, effect)`, created directly in the memo's scope.

Everything else is left alone. Props and children of a component are getters, and the child may read them any number of times. Nested callbacks (`<For>` children, event handlers, `.map`) and loops can run the read many times. A read in the component body is untracked. A memo with options (which can set `equals`), an async or generator memo, an exported memo, and a memo whose accessor is passed along uncalled are also skipped.

"Fresh" means the function always returns an object literal, an array literal, or JSX: an expression body, a ternary whose branches are all fresh, or a block body that ends in a return and whose every return is fresh. Values that may compare equal, such as primitives, property reads, and calls, are never reported.

An editor suggestion replaces `createMemo(fn)` with `fn`.

This rule is enabled as a warning in the `v2` config.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div style={style()} />;
}

import { createMemo } from "solid-js";
function Box(props) {
  const classes = createMemo(() => [props.size, { active: props.active }]);
  return (
    <ul>
      <li class={classes()} />
    </ul>
  );
}

import { createMemo } from "solid-js";
function Box(props) {
  const label = createMemo(() => <b>{props.label}</b>);
  return <div>{label()}</div>;
}

import { createMemo } from "solid-js";
function Box(props) {
  const content = createMemo(() => (props.open ? <Open /> : <Closed />));
  return <section>{content()}</section>;
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => {
    if (props.big) return { "font-size": "2em" };
    return { "font-size": "1em" };
  });
  return <p style={style()}>text</p>;
}

import { createMemo } from "solid-js";
function Box(props) {
  const pos = createMemo(() => ({ x: props.x, y: props.y }));
  return <div>{pos().x}</div>;
}

import { createMemo } from "solid-js";
function useArea(props) {
  const size = createMemo(() => ({ w: props.w, h: props.h }));
  return createMemo(() => size().w + 1);
}

import { createMemo, createEffect } from "solid-js";
function useLog(props) {
  const payload = createMemo(() => ({ id: props.id, name: props.name }));
  createEffect(
    () => payload(),
    (p) => log(p)
  );
}

import { createMemo as memo } from "solid-js";
function Box(props) {
  const style = memo(function () {
    return { color: props.color };
  });
  return <div style={style()} />;
}

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return (
    <div style={style()}>
      <span style={style()} />
    </div>
  );
}

import { createMemo } from "solid-js";
function Total(props) {
  const total = createMemo(() => props.a + props.b);
  return <div>{total()}</div>;
}

import { createMemo } from "solid-js";
function Item(props) {
  const item = createMemo(() => props.items[props.index]);
  return <div>{item().name}</div>;
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => {
    if (props.color) return { color: props.color };
  });
  return <div style={style()} />;
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <Child style={style()} />;
}

import { createMemo } from "solid-js";
function Box(props) {
  const content = createMemo(() => <b>{props.label}</b>);
  return <Card>{content()}</Card>;
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return (
    <Card>
      <div style={style()} />
    </Card>
  );
}

import { createMemo } from "solid-js";
function List(props) {
  const style = createMemo(() => ({ color: props.color }));
  return (
    <For each={props.items}>{(item) => <li style={style()}>{item}</li>}</For>
  );
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div>{props.show && <span style={style()} />}</div>;
}

import { createMemo } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  return <button onClick={() => send(data())} />;
}

import { createMemo } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  const snapshot = data();
  return <div />;
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <Child style={style} />;
}

import { createMemo } from "solid-js";
export const config = createMemo(() => ({ debug: true }));

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }), {
    equals: shallowEqual,
  });
  return <div style={style()} />;
}

import { createMemo } from "solid-js";
function User(props) {
  const user = createMemo(async () => ({ ...(await fetchUser(props.id)) }));
  return <div>{user().name}</div>;
}

import { createMemo, createEffect } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  createEffect(() => log(data()));
}

import { createMemo, createEffect } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  for (const key of keys)
    createEffect(
      () => data()[key],
      (v) => log(v)
    );
}

import { createMemo } from "my-lib";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div style={style()} />;
}

import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => [props.a, props.b]);
  return <>{style()}</>;
}

import { createMemo } from "solid-js";
function useArea(props) {
  const size = createMemo(() => ({ w: props.w, h: props.h }));
  return createMemo(() => size().w * size().h);
}

```
<!-- end-doc-gen -->
