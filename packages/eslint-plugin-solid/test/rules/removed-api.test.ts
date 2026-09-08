import { run } from "../ruleTester";
import rule from "../../src/rules/removed-api";

export const cases = run("removed-api", rule, {
  valid: [
    `import { createSignal, createMemo, createEffect } from "solid-js";`,
    `import { merge, omit, flush, snapshot, isEqual, onSettled } from "solid-js";`,
    `import { For, Repeat, Show, Switch, Match, Errored, Loading, Reveal } from "solid-js";`,
    `import { createStore, reconcile } from "solid-js";`,
    `import { render, Portal, Dynamic } from "@solidjs/web";`,
    `import { something } from "somewhere/else";`,
    `let el = <div class={{ active: true }} />;`,
    `let el = <div class="btn" />;`,
  ],
  invalid: [
    // mechanical renames with reference rewriting
    {
      code: `import { onMount } from "solid-js";
onMount(() => console.log("hi"));`,
      errors: [{ messageId: "renamed", data: { name: "onMount", replacement: "onSettled" } }],
      output: `import { onSettled } from "solid-js";
onSettled(() => console.log("hi"));`,
    },
    {
      code: `import { batch } from "solid-js";
batch(() => update());`,
      errors: [{ messageId: "renamed", data: { name: "batch", replacement: "flush" } }],
      output: `import { flush } from "solid-js";
flush(() => update());`,
    },
    {
      code: `import { mergeProps } from "solid-js";
const props2 = mergeProps({ a: 1 }, props);`,
      errors: [{ messageId: "renamed", data: { name: "mergeProps", replacement: "merge" } }],
      output: `import { merge } from "solid-js";
const props2 = merge({ a: 1 }, props);`,
    },
    // aliased import: only the imported name changes
    {
      code: `import { onMount as om } from "solid-js";
om(() => {});`,
      errors: [{ messageId: "renamed", data: { name: "onMount", replacement: "onSettled" } }],
      output: `import { onSettled as om } from "solid-js";
om(() => {});`,
    },
    // removed APIs: prescriptive message, no fix
    {
      code: `import { createResource } from "solid-js";`,
      errors: [{ messageId: "removed" }],
    },
    {
      code: `import { on, useTransition } from "solid-js";`,
      errors: [{ messageId: "removed" }, { messageId: "removed" }],
    },
    {
      code: `import { Index, Suspense, ErrorBoundary } from "solid-js";`,
      errors: [{ messageId: "removed" }, { messageId: "removed" }, { messageId: "removed" }],
    },
    // removed APIs are reported from "@solidjs/web" too, so a mechanical
    // source rewrite doesn't hide them (#222)
    {
      code: `import { renderToStringAsync } from "@solidjs/web";`,
      errors: [{ messageId: "removed" }],
    },
    {
      code: `import { renderToStringAsync } from "solid-js/web";`,
      errors: [{ messageId: "removed" }, { messageId: "webMoved" }],
      output: `import { renderToStringAsync } from "@solidjs/web";`,
    },
    // module moves
    {
      code: `import { render } from "solid-js/web";`,
      errors: [{ messageId: "webMoved" }],
      output: `import { render } from "@solidjs/web";`,
    },
    {
      code: `import { createStore } from "solid-js/store";`,
      errors: [{ messageId: "storeMoved", data: { name: "createStore" } }],
      output: `import { createStore } from "solid-js";`,
    },
    {
      code: `import { createStore, produce } from "solid-js/store";`,
      errors: [
        { messageId: "storeMoved", data: { name: "createStore" } },
        { messageId: "removed" },
      ],
    },
    // classList -> class
    {
      code: `let el = <div classList={{ active: isActive() }} />;`,
      errors: [{ messageId: "classList" }],
      output: `let el = <div class={{ active: isActive() }} />;`,
    },
    {
      // can't autofix when a `class` prop already exists
      code: `let el = <div class="btn" classList={{ active: isActive() }} />;`,
      errors: [{ messageId: "classList" }],
    },
  ],
});
