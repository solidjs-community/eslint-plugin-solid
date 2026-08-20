import { run } from "../ruleTester";
import rule from "../../src/rules/prefer-structured-class";

export const cases = run("prefer-structured-class", rule, {
  valid: [
    // structured forms — the goal state
    `let el = <div class={["btn", { active: active() }]} />;`,
    `let el = <div class={{ btn: true, active: active() }} />;`,
    // static strings are fine
    `let el = <div class="btn primary" />;`,
    `let el = <div class={"btn"} />;`,
    // plain interpolation without conditionals is fine
    "let el = <div class={`btn-${kind}`} />;",
    // static concatenation is fine
    `let el = <div class={"btn" + "-primary"} />;`,
    // other attributes are not this rule's business
    `let el = <div title={"a " + (b() ? "c" : "")} />;`,
  ],
  invalid: [
    {
      code: `let el = <div class={"btn " + (active() ? "active" : "")} />;`,
      errors: [
        {
          messageId: "manualClassString",
          suggestions: [
            {
              messageId: "useStructuredForm",
              output: `let el = <div class={["btn", active() && "active"]} />;`,
            },
          ],
        },
      ],
    },
    {
      code: 'let el = <div class={`btn ${active() ? "active" : ""}`} />;',
      errors: [{ messageId: "manualClassString" }],
    },
    {
      code: `let el = <div class={[base, active() && "on"].filter(Boolean).join(" ")} />;`,
      errors: [{ messageId: "manualClassString" }],
    },
    {
      code: `let el = <div class={"btn " + variant() + " large"} />;`,
      errors: [{ messageId: "manualClassString" }],
    },
  ],
});
