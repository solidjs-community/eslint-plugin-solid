import { ruleTester } from "../ruleTester";
import rule from "../../src/rules/prefer-class-prop";

ruleTester.run("no-classname", rule, {
  valid: [
    `const el = <div>Hello world!</div>`,
    `const el = <div class="greeting">Hello world!</div>`,
    `const el = <div class={"greeting"}>Hello world!</div>`,
    `const el = <div many other attributes class="greeting">Hello world!</div>`,
    `const el = <PascalComponent className="greeting">Hello world!</PascalComponent>`,
  ],
  invalid: [
    {
      code: `const el = <div className="greeting">Hello world!</div>`,
      errors: [{ messageId: "preferClass" }],
      output: `const el = <div class="greeting">Hello world!</div>`,
    },
    {
      code: `const el = <div className={"greeting"}>Hello world!</div>`,
      errors: [{ messageId: "preferClass" }],
      output: `const el = <div class={"greeting"}>Hello world!</div>`,
    },
    {
      code: `const el = <div many other attributes className="greeting">Hello world!</div>`,
      errors: [{ messageId: "preferClass" }],
      output: `const el = <div many other attributes class="greeting">Hello world!</div>`,
    },
  ],
});
