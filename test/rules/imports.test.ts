import { run } from "../ruleTester";
import rule from "../../src/rules/imports";

export const cases = run("imports", rule, {
  valid: [
    `import { createSignal, mergeProps as merge } from "solid-js";`,
    `import { createSignal, mergeProps as merge } from 'solid-js';`,
    `import { render, hydrate } from "solid-js/web";`,
    `import { createStore, produce } from "solid-js/store";`,
    `import { createSignal } from "solid-js";
    import { render } from "solid-js/web";
    import { something } from "somewhere/else";
    import { createStore } from "solid-js/store";`,
    `import * as Solid from "solid-js"; Solid.render();`,
    {
      code: `import type { Component, JSX } from "solid-js";
import type { Store } from "solid-js/store";`,
      parser: require.resolve("@typescript-eslint/parser"),
    },
  ],
  invalid: [
    {
      code: `import { createEffect } from "solid-js/web";`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "createEffect", source: "solid-js" },
        },
      ],
      output: `import { createEffect } from "solid-js";
`,
    },
    {
      code: `import { createEffect } from "solid-js/web";
import { createSignal } from "solid-js";`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "createEffect", source: "solid-js" },
        },
      ],
      output: `
import { createSignal, createEffect } from "solid-js";`,
    },

    {
      code: `import type { Component } from "solid-js/store";
import { createSignal } from "solid-js";
console.log('hi');`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "Component", source: "solid-js" },
        },
      ],
      output: `
import { createSignal, Component } from "solid-js";
console.log('hi');`,
      parser: require.resolve("@typescript-eslint/parser"),
    },
    // Two-part fix, output here is first pass...
    {
      code: `import { createEffect } from "solid-js/web";
import { render } from "solid-js";`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "createEffect", source: "solid-js" },
        },
        {
          messageId: "prefer-source",
          data: { name: "render", source: "solid-js/web" },
        },
      ],
      output: `
import { render, createEffect } from "solid-js";`,
    },
    // ...and output here is second pass
    {
      code: `
import { render, createEffect } from "solid-js";`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "render", source: "solid-js/web" },
        },
      ],
      output: `
import { render } from "solid-js/web";
import {  createEffect } from "solid-js";`,
    },
  ],
});
