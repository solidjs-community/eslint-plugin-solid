import { run } from "../ruleTester";
import rule from "../../src/rules/components-return-once";

export const cases = run("components-return-once", rule, {
  valid: [],
  invalid: [
    // Early returns
    {
      code: `function Component() {
  if (true) {
    return <div />;
  };
  return <span />;
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    // Balanced ternaries
    {
      code: `function Component() {
  return Math.random() > 0.5 ? <div>Big!</div> : <div>Small!</div>;
}`,
      errors: [{ messageId: "noConditionalReturn" }],
      output: `function Component() {
  return <>{Math.random() > 0.5 ? <div>Big!</div> : <div>Small!</div>}</>;
}`,
    },
    {
      code: `function Component() {
  return Math.random() > 0.5 ? <div>Big!</div> : "Small!";
}`,
      errors: [{ messageId: "noConditionalReturn" }],
      output: `function Component() {
  return <>{Math.random() > 0.5 ? <div>Big!</div> : "Small!"}</>;
}`,
    },
    // Ternaries with clear fallback
    {
      code: `function Component() {
  return Math.random() > 0.5 ? (
    <div>
      Big!
      No, really big!
    </div>
  ) : <div>Small!</div>;
}`,
      errors: [{ messageId: "noConditionalReturn" }],
      output: `function Component() {
  return <Show when={Math.random() > 0.5} fallback={<div>Small!</div>}><div>
      Big!
      No, really big!
    </div></Show>;
}`,
    },
  ],
});
