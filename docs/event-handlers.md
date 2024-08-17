<!-- doc-gen HEADER -->
# solid/event-handlers
Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler.
This rule is **a warning** by default.

[View source](../src/rules/event-handlers.ts) · [View tests](../test/rules/event-handlers.test.ts)
<!-- end-doc-gen -->

See [this issue](https://github.com/solidjs-community/eslint-plugin-solid/issues/23) for rationale.

<!-- doc-gen OPTIONS -->
## Rule Options

Options shown here are the defaults. 

```js
{
  "solid/event-handlers": ["warn", { 
    // if true, don't warn on ambiguously named event handlers like `onclick` or `onchange`
    ignoreCase: false, 
    // if true, warn when spreading event handlers onto JSX. Enable for Solid < v1.6.
    warnOnSpread: false, 
  }]
}
```
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <div only />;

let el = <div only={() => {}} />;

let el = <div onclick={() => {}} />;
// after eslint --fix:
let el = <div onClick={() => {}} />;

let el = <div onClIcK={() => {}} />;
// after eslint --fix:
let el = <div onClick={() => {}} />;

let el = <div oncLICK={() => {}} />;
// after eslint --fix:
let el = <div onClick={() => {}} />;

let el = <div onLy />;

let el = <div onLy="string" />;

let el = <div onLy={5} />;

let el = <div onLy={"string"} />;

const string = "string";
let el = <div onLy={string} />;

let el = <div onDoubleClick={() => {}} />;
// after eslint --fix:
let el = <div onDblClick={() => {}} />;

let el = <div ondoubleclick={() => {}} />;
// after eslint --fix:
let el = <div onDblClick={() => {}} />;

let el = <div ondblclick={() => {}} />;
// after eslint --fix:
let el = <div onDblClick={() => {}} />;

/* eslint solid/event-handlers: ["error", { "warnOnSpread": true }] */
const handleClick = () => 42;
let el = <div {...{ onClick: handleClick, foo }} />;
// after eslint --fix:
const handleClick = () => 42;
let el = <div {...{ foo }} onClick={handleClick} />;

/* eslint solid/event-handlers: ["error", { "warnOnSpread": true }] */
const handleClick = () => 42;
let el = <div {...{ foo, onClick: handleClick }} />;
// after eslint --fix:
const handleClick = () => 42;
let el = <div {...{ foo }} onClick={handleClick} />;

/* eslint solid/event-handlers: ["error", { "warnOnSpread": true }] */
const handleClick = () => 42;
let el = <div {...{ onClick: handleClick }} />;
// after eslint --fix:
const handleClick = () => 42;
let el = <div onClick={handleClick} />;
```

### Valid Examples

These snippets don't cause lint errors.

```js
const onfoo = () => 42;
let el = <div onClick={onfoo} />;

const string = "string" + some_func();
let el = <div onLy={string} />;

function Component(props) {
  return <div onClick={props.onClick} />;
}

function Component(props) {
  return <div onFoo={props.onFoo} />;
}

let el = <div attr:only={() => {}} />;

let el = <div onLy={() => {}} />;

let el = <div on:ly={() => {}} />;

let el = <foo.bar only="true" />;

let el = <div onDblClick={() => {}} />;

const onClick = () => 42;
let el = <div {...{ onClick }} />;

/* eslint solid/event-handlers: ["error", { "ignoreCase": true }] */
let el = <div onclick={onclick} />;

/* eslint solid/event-handlers: ["error", { "ignoreCase": true }] */
let el = <div only={only} />;
```
<!-- end-doc-gen -->
