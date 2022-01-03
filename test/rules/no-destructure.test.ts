import { run, Cases } from "../ruleTester";
import rule from "../../src/rules/no-destructure";

export const cases: Cases = {
  valid: [
    `let Component = props => <div />`,
    `let Component = (props) => <div />`,
    `let Component = (props) => { return <div />; }`,
    `let Component = (props) => (<div />)`,
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
    `let NotAComponent = ({ a }, more, params) => <div a={a} />`,
    `let Component = props => {
      let inner = ({ a, ...rest }) => a;
      let a = inner({ a: 5 });
      return <div a={a} />;
    }`,
    `
    // This one might be surprising, since we're clearly destructuring props!
    // But this will be caught as a reactive expression use outside of
    // a tracked scope, in the "solid/reactivity" rule. There's really 
    // nothing wrong with destructuring props in tracked scopes when done 
    // correctly, but catching it in the params covers the most common 
    // cases with good DX.
    let Component = props => {
      let { a } = props;
      return <div a={a} />;
    }`,
    `let element = <div />`, // parse top level JSX
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
      code: `let Component = ({ a }) => (<div a={a} />)`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => (<div a={props.a} />)`,
    },
    {
      code: `let Component = ({ a: A }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props.a} />`,
    },

    {
      code: `let Component = ({ 'a': A }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props['a']} />`,
    },
    {
      code: `let Component = ({ ['a' + '']: a }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props['a' + '']} />`,
    },
    {
      code: `let Component = ({ ['a' + '']: a, b }) => <div a={a} b={b} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (props) => <div a={props['a' + '']} b={props.b} />`,
    },
    {
      code: `let Component = ({ a = 5 }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ a = 5 }) => (<div a={a} />)`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ a: A = 5 }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ 'a': A = 5 }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const props = mergeProps({ 'a': 5 }, _props);
  return (<div a={props['a']} />);
}`,
    },
    {
      code: `let Component = ({ ['a' + '']: a = 5 }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const props = mergeProps({ ['a' + '']: 5 }, _props);
  return (<div a={props['a' + '']} />);
}`,
    },
    {
      code: `let Component = ({ ['a' + '']: a = 5, b = 10, c }) => <div a={a} b={b} c={c} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const props = mergeProps({ ['a' + '']: 5, b: 10 }, _props);
  return (<div a={props['a' + '']} b={props.b} c={props.c} />);
}`,
    },
    {
      code: `let Component = ({ a = 5 }) => { 
        return <div a={a} />; 
      }`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => { 
          const props = mergeProps({ a: 5 }, _props);
return <div a={props.a} />; 
      }`,
    },
    {
      code: `let Component = ({ a = 5 }) => { 
        various();
        statements();
        return <div a={a} />; 
      }`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => { 
          const props = mergeProps({ a: 5 }, _props);
various();
        statements();
        return <div a={props.a} />; 
      }`,
    },
    {
      code: `let Component = ({ ...rest }) => <div a={rest.a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, []);
  return (<div a={rest.a} />);
}`,
    },
    {
      code: `let Component = ({ a, ...rest }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ a, ...rest }) => (<div a={a} />)`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ a, ...other }) => <div a={a} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, other] = splitProps(_props, ["a"]);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ a, ...rest }) => <div a={a} b={rest.b} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return (<div a={props.a} b={rest.b} />);
}`,
    },
    {
      code: `let Component = ({ a: A, ...rest }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return (<div a={props.a} />);
}`,
    },
    {
      code: `let Component = ({ 'a': A, ...rest }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ['a']);
  return (<div a={props['a']} />);
}`,
    },
    {
      code: `let Component = ({ ['a' + '']: A, ...rest }) => <div a={A} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ['a' + '']);
  return (<div a={props['a' + '']} />);
}`,
    },
    {
      code: `let Component = ({ ['a' + '']: A, ...rest }) => <div a={A} b={rest.b} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(_props, ['a' + '']);
  return (<div a={props['a' + '']} b={rest.b} />);
}`,
    },
    {
      code: `let Component = ({ a = 5, ...rest }) => { 
        return <div a={a} b={rest.b} />; 
      }`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => { 
          const [props, rest] = splitProps(mergeProps({ a: 5 }, _props), ["a"]);return <div a={props.a} b={rest.b} />; 
      }`,
    },
    {
      code: `let Component = ({ a = 5, ...rest }) => (<div a={a} b={rest.b} />)`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(mergeProps({ a: 5 }, _props), ["a"]);  return (<div a={props.a} b={rest.b} />);
}`,
    },
    {
      code: `let Component = ({ ['a' + '']: A = 5, ...rest }) => <div a={A} b={rest.b} />`,
      errors: [{ messageId: "noDestructure" }],
      output: `let Component = (_props) => {
  const [props, rest] = splitProps(mergeProps({ ['a' + '']: 5 }, _props), ['a' + '']);  return (<div a={props['a' + '']} b={rest.b} />);
}`,
    },
  ],
};

run("no-destructure", rule, cases);
