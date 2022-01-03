<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/no-destructure
Prevent destructuring props. In Solid, props must be used with property accesses (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the parameter list.
This rule is **an error** by default.

[View source](../src/rules/no-destructure.ts) · [View tests](../test/rules/no-destructure.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let Component = ({}) => <div />;
// after eslint --fix:
let Component = (props) => <div />;
 
let Component = ({ a }) => <div a={a} />;
// after eslint --fix:
let Component = (props) => <div a={props.a} />;
 
let Component = ({ a }) => <div a={a} />;
// after eslint --fix:
let Component = (props) => <div a={props.a} />;
 
let Component = ({ a: A }) => <div a={A} />;
// after eslint --fix:
let Component = (props) => <div a={props.a} />;
 
let Component = ({ a: A }) => <div a={A} />;
// after eslint --fix:
let Component = (props) => <div a={props["a"]} />;
 
let Component = ({ ["a" + ""]: a }) => <div a={a} />;
// after eslint --fix:
let Component = (props) => <div a={props["a" + ""]} />;
 
let Component = ({ ["a" + ""]: a, b }) => <div a={a} b={b} />;
// after eslint --fix:
let Component = (props) => <div a={props["a" + ""]} b={props.b} />;
 
let Component = ({ a = 5 }) => <div a={a} />;
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return <div a={props.a} />;
};
 
let Component = ({ a = 5 }) => <div a={a} />;
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return <div a={props.a} />;
};
 
let Component = ({ a: A = 5 }) => <div a={A} />;
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return <div a={props.a} />;
};
 
let Component = ({ a: A = 5 }) => <div a={A} />;
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return <div a={props["a"]} />;
};
 
let Component = ({ ["a" + ""]: a = 5 }) => <div a={a} />;
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ ["a" + ""]: 5 }, _props);
  return <div a={props["a" + ""]} />;
};
 
let Component = ({ ["a" + ""]: a = 5, b = 10, c }) => <div a={a} b={b} c={c} />;
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ ["a" + ""]: 5, b: 10 }, _props);
  return <div a={props["a" + ""]} b={props.b} c={props.c} />;
};
 
let Component = ({ a = 5 }) => {
  return <div a={a} />;
};
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  return <div a={props.a} />;
};
 
let Component = ({ a = 5 }) => {
  various();
  statements();
  return <div a={a} />;
};
// after eslint --fix:
let Component = (_props) => {
  const props = mergeProps({ a: 5 }, _props);
  various();
  statements();
  return <div a={props.a} />;
};
 
let Component = ({ ...rest }) => <div a={rest.a} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, []);
  return <div a={rest.a} />;
};
 
let Component = ({ a, ...rest }) => <div a={a} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return <div a={props.a} />;
};
 
let Component = ({ a, ...rest }) => <div a={a} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return <div a={props.a} />;
};
 
let Component = ({ a, ...other }) => <div a={a} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, other] = splitProps(_props, ["a"]);
  return <div a={props.a} />;
};
 
let Component = ({ a, ...rest }) => <div a={a} b={rest.b} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return <div a={props.a} b={rest.b} />;
};
 
let Component = ({ a: A, ...rest }) => <div a={A} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return <div a={props.a} />;
};
 
let Component = ({ a: A, ...rest }) => <div a={A} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a"]);
  return <div a={props["a"]} />;
};
 
let Component = ({ ["a" + ""]: A, ...rest }) => <div a={A} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a" + ""]);
  return <div a={props["a" + ""]} />;
};
 
let Component = ({ ["a" + ""]: A, ...rest }) => <div a={A} b={rest.b} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(_props, ["a" + ""]);
  return <div a={props["a" + ""]} b={rest.b} />;
};
 
let Component = ({ a = 5, ...rest }) => {
  return <div a={a} b={rest.b} />;
};
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(mergeProps({ a: 5 }, _props), ["a"]);
  return <div a={props.a} b={rest.b} />;
};
 
let Component = ({ a = 5, ...rest }) => <div a={a} b={rest.b} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(mergeProps({ a: 5 }, _props), ["a"]);
  return <div a={props.a} b={rest.b} />;
};
 
let Component = ({ ["a" + ""]: A = 5, ...rest }) => <div a={A} b={rest.b} />;
// after eslint --fix:
let Component = (_props) => {
  const [props, rest] = splitProps(mergeProps({ ["a" + ""]: 5 }, _props), [
    "a" + "",
  ]);
  return <div a={props["a" + ""]} b={rest.b} />;
};
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let Component = (props) => <div />;

let Component = (props) => <div />;

let Component = (props) => {
  return <div />;
};

let Component = (props) => <div />;

let Component = (props) => null;

let Component = (props) => <div a={props.a} />;

let Component = (props) => {
  const [local, rest] = splitProps(props, ["a"]);
  return <div a={local.a} b={rest.b} />;
};

let Component = (props) => {
  const { a } = someFunction();
  return <div a={a} />;
};

let NotAComponent = ({ a }, more, params) => <div a={a} />;

let Component = (props) => {
  let inner = ({ a, ...rest }) => a;
  let a = inner({ a: 5 });
  return <div a={a} />;
};

// This one might be surprising, since we're clearly destructuring props!
// But this will be caught as a reactive expression use outside of
// a tracked scope, in the "solid/reactivity" rule. There's really
// nothing wrong with destructuring props in tracked scopes when done
// correctly, but catching it in the params covers the most common
// cases with good DX.
let Component = (props) => {
  let { a } = props;
  return <div a={a} />;
};

let element = <div />;

```
<!-- AUTO-GENERATED-CONTENT:END -->