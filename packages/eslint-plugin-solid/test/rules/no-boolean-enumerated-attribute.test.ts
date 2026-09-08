import { run } from "../ruleTester";
import rule from "../../src/rules/no-boolean-enumerated-attribute";

export const cases = run("no-boolean-enumerated-attribute", rule, {
  valid: [
    // string tokens are the correct form
    `let el = <div draggable="true" />;`,
    `let el = <div draggable="false" />;`,
    `let el = <span aria-expanded="false" />;`,
    `let el = <p translate="no" />;`,
    // dynamic values can't be proven boolean locally; the rule stays quiet
    `let el = <div draggable={dragMode()} />;`,
    `let el = <button aria-pressed={pressed()} />;`,
    // ternaries producing tokens are exactly the recommended pattern
    `let el = <button aria-expanded={open() ? "true" : "false"} />;`,
    // boolean true is harmless where the empty string means true
    `let el = <div contenteditable />;`,
    `let el = <div contenteditable={true} />;`,
    `let el = <textarea spellcheck={true} />;`,
    `let el = <p translate />;`,
    // real boolean attributes are not enumerated; booleans are right there
    `let el = <input disabled={true} />;`,
    `let el = <input readonly={false} />;`,
    // default-false ARIA attributes: removal IS the false state, so booleans
    // are harmless and not our business
    `let el = <button aria-disabled={false} />;`,
    `let el = <div aria-busy={isLoading()} />;`,
    // components receive these as ordinary props
    `let el = <Toggle draggable={false} aria-expanded={false} />;`,
  ],
  invalid: [
    // boolean false removes the attribute — a different state than "false"
    {
      code: `let el = <div draggable={false} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <div draggable="false" />;`,
    },
    {
      code: `let el = <textarea spellcheck={false} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <textarea spellcheck="false" />;`,
    },
    {
      code: `let el = <div contenteditable={false} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <div contenteditable="false" />;`,
    },
    // translate wants yes/no, not true/false
    {
      code: `let el = <p translate={false} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <p translate="no" />;`,
    },
    // draggable alone treats the empty value as invalid, so true is broken too
    {
      code: `let el = <div draggable={true} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <div draggable="true" />;`,
    },
    {
      code: `let el = <img draggable />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <img draggable="true" />;`,
    },
    // tristate ARIA states: absence is "undefined", not "false"
    {
      code: `let el = <button aria-expanded={false} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <button aria-expanded="false" />;`,
    },
    {
      code: `let el = <div aria-hidden={true} />;`,
      errors: [{ messageId: "booleanValue" }],
      output: `let el = <div aria-hidden="true" />;`,
    },
    // provably-boolean expressions get a suggestion, not an autofix
    {
      code: `let el = <button aria-pressed={count() > 0} />;`,
      errors: [
        {
          messageId: "booleanExpression",
          suggestions: [
            {
              messageId: "useStrings",
              output: `let el = <button aria-pressed={count() > 0 ? "true" : "false"} />;`,
            },
          ],
        },
      ],
    },
    {
      code: `let el = <div draggable={!locked()} />;`,
      errors: [
        {
          messageId: "booleanExpression",
          suggestions: [
            {
              messageId: "useStrings",
              output: `let el = <div draggable={!locked() ? "true" : "false"} />;`,
            },
          ],
        },
      ],
    },
    {
      code: `let el = <p translate={a === b} />;`,
      errors: [
        {
          messageId: "booleanExpression",
          suggestions: [
            {
              messageId: "useStrings",
              output: `let el = <p translate={a === b ? "yes" : "no"} />;`,
            },
          ],
        },
      ],
    },
  ],
});
