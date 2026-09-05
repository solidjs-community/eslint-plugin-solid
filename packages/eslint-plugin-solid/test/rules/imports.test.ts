import { run, tsOnly } from "../ruleTester";
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
      [tsOnly]: true,
    },
    // Solid 2.0 mode: store/core exports moved into "solid-js" and web moved
    // to "@solidjs/web"; legacy subpaths are solid/removed-api's territory.
    {
      code: `import { createSignal, createStore, reconcile, merge } from "solid-js";`,
      settings: { solid: { version: 2 } },
    },
    {
      code: `import { render, Portal, Dynamic, isServer } from "@solidjs/web";`,
      settings: { solid: { version: 2 } },
    },
    {
      code: `import type { JSX } from "@solidjs/web";`,
      settings: { solid: { version: 2 } },
      [tsOnly]: true,
    },
    {
      // legacy subpaths are ignored here (removed-api reports them)
      code: `import { createStore } from "solid-js/store";`,
      settings: { solid: { version: 2 } },
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
      [tsOnly]: true,
    },
    {
      code: `import { createSignal } from "solid-js/web";
import "solid-js";`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "createSignal", source: "solid-js" },
        },
      ],
      output: `
import { createSignal } from "solid-js";`,
    },
    {
      code: `import { createSignal } from "solid-js/web";
import {} from "solid-js";`,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "createSignal", source: "solid-js" },
        },
      ],
      output: `
import { createSignal } from "solid-js";`,
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
    // Solid 2.0: web exports live in "@solidjs/web", not core
    {
      code: `import type { JSX } from "solid-js";`,
      settings: { solid: { version: 2 } },
      [tsOnly]: true,
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "JSX", source: "@solidjs/web" },
        },
      ],
      output: `import type { JSX } from "@solidjs/web";
`,
    },
    {
      code: `import { render } from "solid-js";`,
      settings: { solid: { version: 2 } },
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "render", source: "@solidjs/web" },
        },
      ],
      output: `import { render } from "@solidjs/web";
`,
    },
    {
      code: `import { createSignal } from "@solidjs/web";`,
      settings: { solid: { version: 2 } },
      errors: [
        {
          messageId: "prefer-source",
          data: { name: "createSignal", source: "solid-js" },
        },
      ],
      output: `import { createSignal } from "solid-js";
`,
    },
  ],
});
