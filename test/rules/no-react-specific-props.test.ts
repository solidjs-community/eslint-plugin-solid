import { run } from "../ruleTester";
import rule from "../../src/rules/no-react-specific-props";

run("no-react-specific-props", rule, {
  valid: [
    `let el = <div>Hello world!</div>;`,
    `let el = <div class="greeting">Hello world!</div>;`,
    `let el = <div class={"greeting"}>Hello world!</div>;`,
    `let el = <div many other attributes class="greeting">Hello world!</div>;`,
    `let el = <label for="id">Hello world!</label>;`,
    `let el = <label for="id">Hello world!</label>`,
    `let el = <label for={"id"}>Hello world!</label>`,
    `let el = <label many other attributes for="id">Hello world!</label>`,
    `let el = <PascalComponent class="greeting" for="id" />`,
  ],
  invalid: [
    {
      code: `let el = <div className="greeting">Hello world!</div>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `let el = <div class="greeting">Hello world!</div>`,
    },
    {
      code: `let el = <div className={"greeting"}>Hello world!</div>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `let el = <div class={"greeting"}>Hello world!</div>`,
    },
    {
      code: `let el = <div className="greeting" />`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `let el = <div class="greeting" />`,
    },
    {
      code: `let el = <div many other attributes className="greeting">Hello world!</div>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `let el = <div many other attributes class="greeting">Hello world!</div>`,
    },
    {
      code: `let el = <PascalComponent className="greeting">Hello world!</PascalComponent>`,
      errors: [
        { messageId: "prefer", data: { from: "className", to: "class" } },
      ],
      output: `let el = <PascalComponent class="greeting">Hello world!</PascalComponent>`,
    },
    {
      code: `let el = <label htmlFor="id">Hello world!</label>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `let el = <label for="id">Hello world!</label>`,
    },
    {
      code: `let el = <label htmlFor={"id"}>Hello world!</label>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `let el = <label for={"id"}>Hello world!</label>`,
    },
    {
      code: `let el = <label many other attributes htmlFor="id">Hello world!</label>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `let el = <label many other attributes for="id">Hello world!</label>`,
    },
    {
      code: `let el = <PascalComponent htmlFor="id">Hello world!</PascalComponent>`,
      errors: [{ messageId: "prefer", data: { from: "htmlFor", to: "for" } }],
      output: `let el = <PascalComponent for="id">Hello world!</PascalComponent>`,
    },
  ],
});
