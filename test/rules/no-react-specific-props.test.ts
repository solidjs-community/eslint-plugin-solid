import { run } from "../ruleTester";
import rule from "../../src/rules/no-react-specific-props";

run("no-react-specific-props", rule, {
  valid: [
    `const el = <div>Hello world!</div>;`,
    `const el = <div class="greeting">Hello world!</div>;`,
    `const el = <div class={"greeting"}>Hello world!</div>;`,
    `const el = <div many other attributes class="greeting">Hello world!</div>;`,
    `const el = <label for="id">Hello world!</label>;`,
    `const el = <label for="id">Hello world!</label>`,
    `const el = <label for={"id"}>Hello world!</label>`,
    `const el = <label many other attributes for="id">Hello world!</label>`,
    `const el = <PascalComponent class="greeting" for="id" />`,
  ],
  invalid: [
    {
      code: `const el = <div className="greeting">Hello world!</div>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `const el = <div class="greeting">Hello world!</div>`,
    },
    {
      code: `const el = <div className={"greeting"}>Hello world!</div>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `const el = <div class={"greeting"}>Hello world!</div>`,
    },
    {
      code: `const el = <div className="greeting" />`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `const el = <div class="greeting" />`,
    },
    {
      code: `const el = <div many other attributes className="greeting">Hello world!</div>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `const el = <div many other attributes class="greeting">Hello world!</div>`,
    },
    {
      code: `const el = <PascalComponent className="greeting">Hello world!</PascalComponent>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `const el = <PascalComponent class="greeting">Hello world!</PascalComponent>`,
    },
    {
      code: `const el = <label htmlFor="id">Hello world!</label>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `const el = <label for="id">Hello world!</label>`,
    },
    {
      code: `const el = <label htmlFor={"id"}>Hello world!</label>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `const el = <label for={"id"}>Hello world!</label>`,
    },
    {
      code: `const el = <label many other attributes htmlFor="id">Hello world!</label>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `const el = <label many other attributes for="id">Hello world!</label>`,
    },
    {
      code: `const el = <PascalComponent htmlFor="id">Hello world!</PascalComponent>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `const el = <PascalComponent for="id">Hello world!</PascalComponent>`,
    },
  ],
});
