import { run } from "../ruleTester";
import rule from "../../src/rules/no-unnecessary-memo";

export const cases = run("no-unnecessary-memo", rule, {
  valid: [
    // read in two places: the memo shares one computation
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div style={style()}><span style={style()} /></div>;
}`,
    // the result can compare equal, so the memo's equality check does work
    `import { createMemo } from "solid-js";
function Total(props) {
  const total = createMemo(() => props.a + props.b);
  return <div>{total()}</div>;
}`,
    `import { createMemo } from "solid-js";
function Item(props) {
  const item = createMemo(() => props.items[props.index]);
  return <div>{item().name}</div>;
}`,
    // a path that falls off the end returns undefined, which compares equal
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => {
    if (props.color) return { color: props.color };
  });
  return <div style={style()} />;
}`,
    // component props are getters the child may read many times
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <Child style={style()} />;
}`,
    // so are component children
    `import { createMemo } from "solid-js";
function Box(props) {
  const content = createMemo(() => <b>{props.label}</b>);
  return <Card>{content()}</Card>;
}`,
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <Card><div style={style()} /></Card>;
}`,
    // a nested callback can run many times
    `import { createMemo } from "solid-js";
function List(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <For each={props.items}>{(item) => <li style={style()}>{item}</li>}</For>;
}`,
    // the JSX inside a reactive expression is recreated when it re-runs
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div>{props.show && <span style={style()} />}</div>;
}`,
    // event handlers and refs are untracked reads
    `import { createMemo } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  return <button onClick={() => send(data())} />;
}`,
    // an untracked read in the body isn't a tracked reader
    `import { createMemo } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  const snapshot = data();
  return <div />;
}`,
    // the accessor escapes, so other readers are invisible
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <Child style={style} />;
}`,
    `import { createMemo } from "solid-js";
export const config = createMemo(() => ({ debug: true }));`,
    // options may carry a custom equals
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }), { equals: shallowEqual });
  return <div style={style()} />;
}`,
    // an async memo is the async boundary
    `import { createMemo } from "solid-js";
function User(props) {
  const user = createMemo(async () => ({ ...(await fetchUser(props.id)) }));
  return <div>{user().name}</div>;
}`,
    // single-arg createEffect has no pure compute half
    `import { createMemo, createEffect } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  createEffect(() => log(data()));
}`,
    // effects created in a loop are several readers
    `import { createMemo, createEffect } from "solid-js";
function Box(props) {
  const data = createMemo(() => ({ id: props.id }));
  for (const key of keys) createEffect(() => data()[key], (v) => log(v));
}`,
    // not Solid's createMemo
    `import { createMemo } from "my-lib";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div style={style()} />;
}`,
    // a fragment child is inserted by whoever renders it
    `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => [props.a, props.b]);
  return <>{style()}</>;
}`,
    // two reads inside one memo are still two reads (not worth proving equal)
    `import { createMemo } from "solid-js";
function useArea(props) {
  const size = createMemo(() => ({ w: props.w, h: props.h }));
  return createMemo(() => size().w * size().h);
}`,
  ],
  invalid: [
    {
      code: `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => ({ color: props.color }));
  return <div style={style()} />;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "object" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function Box(props) {
  const style = () => ({ color: props.color });
  return <div style={style()} />;
}`,
            },
          ],
        },
      ],
    },
    {
      code: `import { createMemo } from "solid-js";
function Box(props) {
  const classes = createMemo(() => [props.size, { active: props.active }]);
  return <ul><li class={classes()} /></ul>;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "array" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function Box(props) {
  const classes = () => [props.size, { active: props.active }];
  return <ul><li class={classes()} /></ul>;
}`,
            },
          ],
        },
      ],
    },
    {
      code: `import { createMemo } from "solid-js";
function Box(props) {
  const label = createMemo(() => <b>{props.label}</b>);
  return <div>{label()}</div>;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "JSX value" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function Box(props) {
  const label = () => <b>{props.label}</b>;
  return <div>{label()}</div>;
}`,
            },
          ],
        },
      ],
    },
    {
      code: `import { createMemo } from "solid-js";
function Box(props) {
  const content = createMemo(() => (props.open ? <Open /> : <Closed />));
  return <section>{content()}</section>;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "JSX value" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function Box(props) {
  const content = () => (props.open ? <Open /> : <Closed />);
  return <section>{content()}</section>;
}`,
            },
          ],
        },
      ],
    },
    // block bodies where every path returns a fresh value
    {
      code: `import { createMemo } from "solid-js";
function Box(props) {
  const style = createMemo(() => {
    if (props.big) return { "font-size": "2em" };
    return { "font-size": "1em" };
  });
  return <p style={style()}>text</p>;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "object" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function Box(props) {
  const style = () => {
    if (props.big) return { "font-size": "2em" };
    return { "font-size": "1em" };
  };
  return <p style={style()}>text</p>;
}`,
            },
          ],
        },
      ],
    },
    // a member read off the single call is still one read
    {
      code: `import { createMemo } from "solid-js";
function Box(props) {
  const pos = createMemo(() => ({ x: props.x, y: props.y }));
  return <div>{pos().x}</div>;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "object" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function Box(props) {
  const pos = () => ({ x: props.x, y: props.y });
  return <div>{pos().x}</div>;
}`,
            },
          ],
        },
      ],
    },
    // the single reader may be another memo or an effect's compute half
    {
      code: `import { createMemo } from "solid-js";
function useArea(props) {
  const size = createMemo(() => ({ w: props.w, h: props.h }));
  return createMemo(() => size().w + 1);
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "object" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo } from "solid-js";
function useArea(props) {
  const size = () => ({ w: props.w, h: props.h });
  return createMemo(() => size().w + 1);
}`,
            },
          ],
        },
      ],
    },
    {
      code: `import { createMemo, createEffect } from "solid-js";
function useLog(props) {
  const payload = createMemo(() => ({ id: props.id, name: props.name }));
  createEffect(() => payload(), (p) => log(p));
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "object" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo, createEffect } from "solid-js";
function useLog(props) {
  const payload = () => ({ id: props.id, name: props.name });
  createEffect(() => payload(), (p) => log(p));
}`,
            },
          ],
        },
      ],
    },
    // aliased imports and function expressions
    {
      code: `import { createMemo as memo } from "solid-js";
function Box(props) {
  const style = memo(function () {
    return { color: props.color };
  });
  return <div style={style()} />;
}`,
      errors: [
        {
          messageId: "unnecessaryMemo",
          data: { kind: "object" },
          suggestions: [
            {
              messageId: "useFunction",
              output: `import { createMemo as memo } from "solid-js";
function Box(props) {
  const style = function () {
    return { color: props.color };
  };
  return <div style={style()} />;
}`,
            },
          ],
        },
      ],
    },
  ],
});
