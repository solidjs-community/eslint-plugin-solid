<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/event-handlers
Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler.
This rule is **a warning** by default.

[View source](../src/rules/event-handlers.ts) · [View tests](../test/rules/event-handlers.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

See [this issue](https://github.com/joshwilsonvu/eslint-plugin-solid/issues/23) for rationale.

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

Options shown here are the defaults. If you manually configure a rule, your options will **replace** the default set.

```js
{
  "solid/event-handlers": ["warn", { 
    // if true, don't warn on ambiguously named event handlers like `onclick` or `onchange`
    ignoreCase: false, 
  }]
}
```

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
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

/* eslint solid/event-handlers: ["error", { "ignoreCase": true }] */
let el = <div onclick={onclick} />;

/* eslint solid/event-handlers: ["error", { "ignoreCase": true }] */
let el = <div only={only} />;

```
<!-- AUTO-GENERATED-CONTENT:END -->
