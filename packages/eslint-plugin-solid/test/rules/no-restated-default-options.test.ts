import { run } from "../ruleTester";
import rule from "../../src/rules/no-restated-default-options";

export const cases = run("no-restated-default-options", rule, {
  valid: [
    // non-default values are meaningful
    `let el = <For each={items()} keyed={false}>{(item) => <div />}</For>;`,
    `let el = <Show when={user()} keyed>{(u) => <div />}</Show>;`,
    `let el = <For each={items()} keyed={rowKey}>{(item) => <div />}</For>;`,
    // no keyed prop at all
    `let el = <For each={items()}>{(item) => <div />}</For>;`,
    `let el = <Show when={user()}><div /></Show>;`,
    // unknown components are left alone
    `let el = <Grid keyed={true} />;`,
  ],
  invalid: [
    {
      code: `let el = <For each={items()} keyed={true}>{(item) => <div />}</For>;`,
      errors: [
        { messageId: "restatedDefault", data: { prop: "keyed", value: "true", component: "For" } },
      ],
      output: `let el = <For each={items()} >{(item) => <div />}</For>;`,
    },
    {
      code: `let el = <For each={items()} keyed>{(item) => <div />}</For>;`,
      errors: [
        { messageId: "restatedDefault", data: { prop: "keyed", value: "true", component: "For" } },
      ],
      output: `let el = <For each={items()} >{(item) => <div />}</For>;`,
    },
    {
      code: `let el = <Show when={user()} keyed={false}><div /></Show>;`,
      errors: [
        {
          messageId: "restatedDefault",
          data: { prop: "keyed", value: "false", component: "Show" },
        },
      ],
      output: `let el = <Show when={user()} ><div /></Show>;`,
    },
    {
      code: `let el = <Match when={cond()} keyed={false}><div /></Match>;`,
      errors: [
        {
          messageId: "restatedDefault",
          data: { prop: "keyed", value: "false", component: "Match" },
        },
      ],
      output: `let el = <Match when={cond()} ><div /></Match>;`,
    },
  ],
});
