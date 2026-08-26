import { vi } from "vitest";

// The global vitest setup mocks trackImports so most rule tests can skip
// import boilerplate. These cases exercise the real import gating — foreign
// libraries excluded, Solid aliases resolved — so restore it here. This file
// is intentionally not named `<rule>.test.ts`: scripts/docs.mts imports test
// files by that name to build docs and cannot load files using vitest APIs.
vi.unmock("../../src/utils");

import { run } from "../ruleTester";
import rule from "../../src/rules/no-restated-default-options";

export const cases = run("no-restated-default-options", rule, {
  valid: [
    // same-named components from other libraries have their own defaults
    `import { For } from "another-library";
    let el = <For each={items()} keyed={true}>{(item) => <div />}</For>;`,
    `import { Show } from "./show";
    let el = <Show when={user()} keyed={false}><div /></Show>;`,
    // no solid import at all: nothing to match
    `let el = <For each={items()} keyed={true}>{(item) => <div />}</For>;`,
  ],
  invalid: [
    // aliased Solid imports still resolve to their defaults
    {
      code: `import { For as List } from "solid-js";
      let el = <List each={items()} keyed={true}>{(item) => <div />}</List>;`,
      errors: [
        {
          messageId: "restatedDefault",
          data: { prop: "keyed", value: "true", component: "List" },
        },
      ],
      output: `import { For as List } from "solid-js";
      let el = <List each={items()} >{(item) => <div />}</List>;`,
    },
  ],
});
