import { run } from "../ruleTester";
import rule from "../../src/rules/jsx-no-undef";

// The bulk of the testing of this rule is done in eslint-plugin-react,
// so we just test the custom directives part of it here.
export const cases = run("jsx-no-undef", rule, {
  valid: [
    `let X; let el = <div use:X={{}} />;`,
    `(X => <div use:X={{}} />)()`,
    `let X; let el = <div use:X />`,
    `let X, el = <div use:X />`,
    `let Component, X = <Component use:X />`,
    {
      code: `let el = <div use:X />`,
      options: [{ allowGlobals: true }],
      globals: { X: "readonly" },
    },
    {
      code: `let el = <div use:X />`,
      options: [{ allowGlobals: true }],
      globals: { X: "readonly" },
    },
  ],
  invalid: [
    {
      code: `let el = <Component />;`,
      errors: [{ messageId: "undefined", data: { identifier: "Component" } }],
    },
    // custom directives
    {
      code: `let el = <div use:X />;`,
      errors: [{ messageId: "customDirectiveUndefined", data: { identifier: "X" } }],
    },
    {
      code: `let el = <div use:X={{}} />;`,
      errors: [{ messageId: "customDirectiveUndefined", data: { identifier: "X" } }],
    },
    {
      code: `let el = <div use:X />;`,
      globals: { X: true },
      errors: [{ messageId: "customDirectiveUndefined", data: { identifier: "X" } }],
    },
    {
      code: `let el = <div use:X />;`,
      errors: [{ messageId: "customDirectiveUndefined", data: { identifier: "X" } }],
      options: [{ allowGlobals: true }],
    },
    // auto imports
    {
      code: `let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `import { For } from "solid-js";\nlet el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `let el = <Show when={item}>{item => item.name}</Show>`,
      errors: [{ messageId: "autoImport", data: { imports: "'Show'", source: "solid-js" } }],
      output: `import { Show } from "solid-js";\nlet el = <Show when={item}>{item => item.name}</Show>`,
    },
    {
      code: `
render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
)`,
      errors: [
        { messageId: "autoImport", data: { imports: "'Switch' and 'Match'", source: "solid-js" } },
      ],
      output: `import { Switch, Match } from "solid-js";

render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
)`,
    },
    {
      code: `
import X from "x";
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import { For } from "solid-js";\nimport X from "x";
let el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `
import { Show } from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import { Show, For } from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `
import { For, Switch } from "solid-js";
render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
)`,
      errors: [{ messageId: "autoImport", data: { imports: "'Match'", source: "solid-js" } }],
      output: `
import { For, Switch, Match } from "solid-js";
render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
)`,
    },
    {
      code: `
import X from "x";
import { Show } from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import X from "x";
import { Show, For } from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `
import X from "x";
import Solid from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import X from "x";
import Solid, { For } from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `
import X from "x";
import "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import X from "x";
import { For } from "solid-js";
let el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `
// attached comment
import X from "x";
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import { For } from "solid-js";
// attached comment
import X from "x";
let el = <For each={items}>{item => item.name}</For>`,
    },
    {
      code: `
import X from "x"; // attached comment
let el = <For each={items}>{item => item.name}</For>`,
      errors: [{ messageId: "autoImport", data: { imports: "'For'", source: "solid-js" } }],
      output: `
import { For } from "solid-js";
import X from "x"; // attached comment
let el = <For each={items}>{item => item.name}</For>`,
    },
  ],
});
