import { run } from "../ruleTester";
import rule from "../../src/rules/prefer-show";

export const cases = run("prefer-show", rule, {
  valid: [
    `function Component(props) {
      return <Show when={props.cond}>Content</Show>;
    }`,
    `function Component(props) {
      return <Show when={props.cond} fallback="Fallback">Content</Show>;
    }`,
  ],
  invalid: [
    {
      code: `
      function Component(props) {
        return <div>{props.cond && <span>Content</span>}</div>;
      }`,
      errors: [{ messageId: "preferShowAnd" }],
      output: `
      function Component(props) {
        return <div><Show when={props.cond}><span>Content</span></Show></div>;
      }`,
    },
    {
      code: `
      function Component(props) {
        return (
          <div>
            {props.cond ? (
              <span>Content</span> 
            ) : (
              <span>Fallback</span>
            )}
          </div>
        );
      }`,
      errors: [{ messageId: "preferShowTernary" }],
      output: `
      function Component(props) {
        return (
          <div>
            <Show when={props.cond} fallback={<span>Fallback</span>}><span>Content</span></Show>
          </div>
        );
      }`,
    },
  ],
});
