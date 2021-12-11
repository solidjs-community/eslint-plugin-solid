import { run, Cases } from "../ruleTester";
import rule from "../../src/rules/no-destructure";

export const cases: Cases = {
  valid: [
    `let Component = props => <div />`,
    `let Component = (props) => <div />`,
    `let Component = props => null`,
    `let Component = (props) => <div a={props.a} />`,
    `let Component = (props) => { 
      const [local, rest] = splitProps(props, ['a']);
      return <div a={local.a} b={rest.b} />;
    }`,
    `let Component = props => {
      const { a } = someFunction();
      return <div a={a} />
    }`,
    `let Component = ({ a }, more, params) => <div a={a} />`,
  ],
  invalid: [
    {
      code: `let Component = ({}) => <div />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div />`,
    },
    {
      code: `let Component = ({ a }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props.a} />`,
    },
    {
      code: `let Component = ({ a: A }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props.a} />`,
    },
    // {
    //   code: `let Component = ({ a = 5 }) => <div a={a} />`,
    //   errors: [{ messageId: "noDestructure" }],
    // },
    {
      code: `let Component = ({ a: A }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props.a} />`,
    },
    {
      code: `let Component = ({ ['a' + '']: a }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props['a' + '']} />`,
    },
    // {
    //   code: `let Component = ({ a, ...rest }) => <div a={a} />`,
    //   errors: [{ messageId: "noDestructure" }],
    // },
    // {
    //   code: `let Component = ({ a: A, ...rest }) => <div a={A} />`,
    //   errors: [{ messageId: "noDestructure" }],
    // },
  ],
};

run("no-destructure", rule, cases);
