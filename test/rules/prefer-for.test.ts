import { run } from "../ruleTester";
import rule from "../../src/rules/prefer-for";

run("prefer-for", rule, {
  valid: [
    `let Component = (props) => <ol><For each={props.data}>{d => <li>{d.text}</li>}</For></ol>;`,
    `let abc = x.map(y => y + z);`,
    `let Component = (props) => {
      let abc = x.map(y => y + z);
      return <div>Hello, world!</div>;
    }`,
  ],
  invalid: [
    {
      code: `let Component = (props) => <ol>{props.data.map(d => <li>{d.text}</li>)}</ol>;`,
      errors: [{ messageId: "preferFor" }],
    },
    {
      code: `let Component = (props) => <ol>{props.data.map(d => <li key={d.id}>{d.text}</li>)}</ol>;`,
      errors: [{ messageId: "preferFor" }],
    },
    {
      code: `
      function Component(props) {
        return <ol>{props.data.map(d => <li>{d.text}</li>)}</ol>;
      }`,
      errors: [{ messageId: "preferFor" }],
    },
  ],
});
