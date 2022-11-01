import { run } from "../ruleTester";
import rule from "../../src/rules/components-return-once";

export const cases = run("components-return-once", rule, {
  valid: [
    `function Component() {
      return <div />;
    }`,
    `function someFunc() {
      if (condition) {
        return 5;
      }
      return 10;
    }`,
    `function notAComponent() {
      if (condition) {
        return <div />;
      }
      return <div />;
    }`,
    `callback(() => {
      if (condition) {
        return <div />;
      }
      return <div />;
    });`,
  ],
  invalid: [
    // Early returns
    {
      code: `function Component() {
        if (condition) {
          return <div />;
        };
        return <span />;
      }`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    {
      code: `const Component = () => {
        if (condition) {
          return <div />;
        }
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
    // Switch/Match
    {
      code: `function Component(props) {
  return props.cond1 ? (
    <div>Condition 1</div>
  ) : Boolean(props.cond2) ? (
    <div>Not condition 1, but condition 2</div>
  ) : (
    <div>Neither condition 1 or 2</div>
  );
}`,
      errors: [{ messageId: "noConditionalReturn" }],
      output: `function Component(props) {
  return <Switch fallback={<div>Neither condition 1 or 2</div>}>
<Match when={props.cond1}><div>Condition 1</div></Match>
<Match when={Boolean(props.cond2)}><div>Not condition 1, but condition 2</div></Match>
</Switch>;
}`,
    },
    // Logical
    {
      code: `function Component(props) {
  return !!props.cond && <div>Conditional</div>;
}`,
      errors: [{ messageId: "noConditionalReturn" }],
      output: `function Component(props) {
  return <Show when={!!props.cond}><div>Conditional</div></Show>;
}`,
    },
    {
      code: `function Component(props) {
  return props.primary || <div>{props.secondaryText}</div>;
}`,
      errors: [{ messageId: "noConditionalReturn" }],
    },
    // HOCs
    {
      code: `HOC(() => {
        if (condition) {
          return <div />;
        }
        return <div />;
      });`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
  ],
});
