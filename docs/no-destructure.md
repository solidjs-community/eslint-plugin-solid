<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->

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
 
let Component = ({ a: A }) => <div a={A} />;
// after eslint --fix:
let Component = (props) => <div a={props.a} />;
 
let Component = ({ a: A }) => <div a={A} />;
// after eslint --fix:
let Component = (props) => <div a={props.a} />;
 
let Component = ({ ["a" + ""]: a }) => <div a={a} />;
// after eslint --fix:
let Component = (props) => <div a={props["a" + ""]} />;
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let Component = (props) => <div />;

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

let Component = ({ a }, more, params) => <div a={a} />;

```
<!-- AUTO-GENERATED-CONTENT:END -->