import { ruleTester } from "../ruleTester";
import rule from "../../src/rules/prefer-for";

ruleTester.run("prefer-for", rule, {
  valid: [
    `const Component = (props) => <ol><For each={props.data}>{d => <li>{d.text}</li>}</For></ol>;`,
    `const abc = x.map(y => y + z);`,
    `const Component = (props) => {
      const abc = x.map(y => y + z);
      return <div>Hello, world!</div>;
    }`,
  ],
  invalid: [
    {
      code: `const Component = (props) => <ol>{props.data.map(d => <li>{d.text}</li>)}</ol>;`,
      errors: [{ messageId: "preferFor" }],
    },
    {
      code: `const Component = (props) => <ol>{props.data.map(d => <li key={d.id}>{d.text}</li>)}</ol>;`,
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
