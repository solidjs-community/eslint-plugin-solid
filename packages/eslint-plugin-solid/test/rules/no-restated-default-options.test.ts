import { run } from "../ruleTester";
import rule from "../../src/rules/no-restated-default-options";

// The global vitest setup mocks trackImports with bare name matching, so these
// cases behave identically with or without the mock. The import-gating cases
// (foreign libraries excluded, Solid aliases resolved) live in
// no-restated-default-options.imports.test.ts, which restores the real
// implementation — and which scripts/docs.mts doesn't import, since it can't
// load files that use vitest APIs.
export const cases = run("no-restated-default-options", rule, {
  valid: [
    // non-default values are meaningful
    `import { For } from "solid-js";
    let el = <For each={items()} keyed={false}>{(item) => <div />}</For>;`,
    `import { Show } from "solid-js";
    let el = <Show when={user()} keyed>{(u) => <div />}</Show>;`,
    `import { For } from "solid-js";
    let el = <For each={items()} keyed={rowKey}>{(item) => <div />}</For>;`,
    // no keyed prop at all
    `import { For } from "solid-js";
    let el = <For each={items()}>{(item) => <div />}</For>;`,
    `import { Show } from "solid-js";
    let el = <Show when={user()}><div /></Show>;`,
    // unknown components are left alone
    `let el = <Grid keyed={true} />;`,
  ],
  invalid: [
    {
      code: `import { For } from "solid-js";
      let el = <For each={items()} keyed={true}>{(item) => <div />}</For>;`,
      errors: [
        { messageId: "restatedDefault", data: { prop: "keyed", value: "true", component: "For" } },
      ],
      output: `import { For } from "solid-js";
      let el = <For each={items()} >{(item) => <div />}</For>;`,
    },
    {
      code: `import { For } from "solid-js";
      let el = <For each={items()} keyed>{(item) => <div />}</For>;`,
      errors: [
        { messageId: "restatedDefault", data: { prop: "keyed", value: "true", component: "For" } },
      ],
      output: `import { For } from "solid-js";
      let el = <For each={items()} >{(item) => <div />}</For>;`,
    },
    {
      code: `import { Show } from "solid-js";
      let el = <Show when={user()} keyed={false}><div /></Show>;`,
      errors: [
        {
          messageId: "restatedDefault",
          data: { prop: "keyed", value: "false", component: "Show" },
        },
      ],
      output: `import { Show } from "solid-js";
      let el = <Show when={user()} ><div /></Show>;`,
    },
    {
      code: `import { Match } from "solid-js";
      let el = <Match when={cond()} keyed={false}><div /></Match>;`,
      errors: [
        {
          messageId: "restatedDefault",
          data: { prop: "keyed", value: "false", component: "Match" },
        },
      ],
      output: `import { Match } from "solid-js";
      let el = <Match when={cond()} ><div /></Match>;`,
    },
  ],
});
