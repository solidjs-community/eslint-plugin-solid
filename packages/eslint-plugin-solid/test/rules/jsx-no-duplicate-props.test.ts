import { run } from "../ruleTester.js";
import rule from "../../src/rules/jsx-no-duplicate-props.js";

export const cases = run("jsx-no-duplicate-props", rule, {
  valid: [
    `let el = <div a="a" b="b" />`,
    `let el = <div a="a" {...{ b: "b" }} />`,
    `let el = <div a="a" {...{ "b": "b" }} />`,
    `let el = <div a="a" A="A" />`,
    `let el = <div a="a" {...{ A: "A" }} />`,
    `let el = <div class="blue" />`,
    `let el = <div children={<div />} />`,
    `let el = <div><div /></div>`,
  ],
  invalid: [
    {
      code: `let el = <div a="a" a="aaaa" />`,
      errors: [{ messageId: "noDuplicateProps" }],
    },
    {
      code: `let el = <div a="a" {...{a: "aaaa" }} />`,
      errors: [{ messageId: "noDuplicateProps" }],
    },
    {
      code: `let el = <div {...{a: "aaaa" }} a="a" />`,
      errors: [{ messageId: "noDuplicateProps" }],
    },
    {
      code: `let el = <div a="a" {...{ "a": "aaaa" }} />`,
      errors: [{ messageId: "noDuplicateProps" }],
    },
    {
      code: `let el = <div class="blue" class="green" />`,
      errors: [{ messageId: "noDuplicateClass" }],
    },
    {
      code: `let el = <div class="blue" {...{ class: "green" }} />`,
      errors: [{ messageId: "noDuplicateClass" }],
    },
    // Solid 2.0: classList no longer exists, so the guidance changes
    {
      code: `let el = <div class="blue" class="green" />`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "noDuplicateClassV2" }],
    },
    {
      code: `let el = <div children={<div />}><div /></div>`,
      errors: [
        {
          messageId: "noDuplicateChildren",
          data: {
            used: "`props.children`, JSX children",
          },
        },
      ],
    },
    {
      code: `let el = <div innerHTML="<p></p>" textContent="howdy!" />`,
      errors: [
        {
          messageId: "noDuplicateChildren",
          data: { used: "`props.innerHTML`, `props.textContent`" },
        },
      ],
    },
    {
      code: `let el = <div innerHTML="<p></p>" textcontent="howdy!" />`,
      errors: [
        {
          messageId: "noDuplicateChildren",
          data: { used: "`props.innerHTML`, `props.textContent`" },
        },
      ],
    },
  ],
});
