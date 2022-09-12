import { run } from "../ruleTester";
import rule from "../../src/rules/jsx-no-duplicate-props";

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
  ],
});
