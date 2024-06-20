import { run } from "../ruleTester";
import rule from "../../src/rules/boolean-attr";

export const cases = run("boolean-attr", rule, {
  valid: [
    `let el = <div draggable="true">Hello, world!</div>`,
    `let el = <div draggable="false">Hello, world!</div>`,
    `let el = <div draggable={true}>Hello, world!</div>`,
    `let el = <div draggable={false}>Hello, world!</div>`,
    `let el = <div draggable={condition()}>Hello, world!</div>`,
  ],
  invalid: [
    {
      code: `let el = <div draggable>Hello, world!</div>`,
      errors: [{ messageId: "explicitEnumeratedAttribute" }],
      output: `let el = <div draggable="true">Hello, world!</div>`,
    },
  ],
});
