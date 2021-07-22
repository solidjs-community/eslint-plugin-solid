import { run } from "../ruleTester";
import rule from "../../src/rules/prefer-classlist";

run("prefer-classlist", rule, {
  valid: [
    `const el = <div classlist={{ red: true }}>Hello, world!</div>`,
    `const el = <div class="red">Hello, world!</div>`,
    `const el = <div className="red">Hello, world!</div>`,
    `const el = <div something={cn({ red: true })}>Hello, world!</div>`,
    `const el = <div something={clsx({ red: true })}>Hello, world!</div>`,
    `const el = <div something={classnames({ red: true })}>Hello, world!</div>`,
    `const el = <div class={someOtherClassFunction({ red: true })}>Hello, world!</div>`,
    `const el = <div class={cn({ red: true }, condition && "yellow")}>Hello, world!</div>`,
    `const el = <div something={cn(condition && "yellow")}>Hello, world!</div>`,
    `const el = <div class={clsx({ red: true })} classlist={{}}>Hello, world!</div>`,
    {
      code: `const el = <div class={clsx({ red: true })}>Hello, world!</div>`,
      options: [{ classnames: ["x", "y", "z"] }],
    },
  ],
  invalid: [
    {
      code: `const el = <div class={cn({ red: true })}>Hello, world!</div>`,
      errors: [{ messageId: "preferClasslist", data: { classnames: "cn" } }],
      output: `const el = <div classlist={{ red: true }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div class={clsx({ red: true })}>Hello, world!</div>`,
      errors: [{ messageId: "preferClasslist", data: { classnames: "clsx" } }],
      output: `const el = <div classlist={{ red: true }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div class={classnames({ red: true })}>Hello, world!</div>`,
      errors: [
        { messageId: "preferClasslist", data: { classnames: "classnames" } },
      ],
      output: `const el = <div classlist={{ red: true }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div class={x({ red: true })}>Hello, world!</div>`,
      options: [{ classnames: ["x", "y", "z"] }],
      errors: [{ messageId: "preferClasslist", data: { classnames: "x" } }],
      output: `const el = <div classlist={{ red: true }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div className={cn({ red: true })}>Hello, world!</div>`,
      errors: [{ messageId: "preferClasslist", data: { classnames: "cn" } }],
      output: `const el = <div classlist={{ red: true }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div class={cn({ red: true, "mx-4": props.size > 2 })}>Hello, world!</div>`,
      errors: [{ messageId: "preferClasslist", data: { classnames: "cn" } }],
      output: `const el = <div classlist={{ red: true, "mx-4": props.size > 2 }}>Hello, world!</div>`,
    },
  ],
});
