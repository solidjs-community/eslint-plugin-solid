import { run } from "../ruleTester";
import rule from "../../src/rules/jsx-no-undef";

// The bulk of the testing of this rule is done in eslint-plugin-react,
// so we just test the custom directives part of it here.
run("jsx-no-undef", rule, {
  valid: [
    `let X; let el = <div use:X={{}} />;`,
    `(X => <div use:X={{}} />)()`,
    `let X; let el = <div use:X />`,
    `let X, el = <div use:X />`,
    `let Component, X = <Component use:X />`,
    {
      code: `let el = <div use:X />`,
      options: [{ allowGlobals: true }],
      globals: { X: true },
    },
    {
      code: `let el = <div use:X />`,
      options: [{ allowGlobals: true }],
      globals: { X: false },
    },
  ],
  invalid: [
    {
      code: `let el = <Component />;`,
      errors: [{ messageId: "undefined", data: { identifier: "Component" } }],
    },
    {
      code: `let el = <div use:X />;`,
      errors: [
        { messageId: "customDirectiveUndefined", data: { identifier: "X" } },
      ],
    },
    {
      code: `let el = <div use:X={{}} />;`,
      errors: [
        { messageId: "customDirectiveUndefined", data: { identifier: "X" } },
      ],
    },
    {
      code: `let el = <div use:X />;`,
      globals: { X: true },
      errors: [
        { messageId: "customDirectiveUndefined", data: { identifier: "X" } },
      ],
    },
    {
      code: `let el = <div use:X />;`,
      errors: [
        { messageId: "customDirectiveUndefined", data: { identifier: "X" } },
      ],
      options: [{ allowGlobals: true }],
    },
  ],
});
