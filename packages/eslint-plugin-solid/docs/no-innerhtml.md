<!-- doc-gen HEADER -->
# solid/no-innerhtml
Disallow usage of the innerHTML attribute, which can often lead to security vulnerabilities.
This rule is **an error** by default.

[View source](../src/rules/no-innerhtml.ts) · [View tests](../test/rules/no-innerhtml.test.ts)
<!-- end-doc-gen -->

<!-- doc-gen OPTIONS -->
## Rule Options

Options shown here are the defaults. 

```js
{
  "solid/no-innerhtml": ["error", { 
    // if the innerHTML value is guaranteed to be a static HTML string (i.e. no user input), allow it
    allowStatic: true, 
  }]
}
```
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
/* eslint solid/no-innerhtml: ["error", { "allowStatic": false }] */
let el = <div prop1 prop2={2} innerHTML="<p>Hello</><p>world!</p>" />;

/* eslint solid/no-innerhtml: ["error", { "allowStatic": false }] */
let el = <div innerHTML={"<p>Hello</p><p>world!</p>"} />;

/* eslint solid/no-innerhtml: ["error", { "allowStatic": false }] */
let el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />;

let el = <div prop1 prop2={2} innerHTML={Math.random()} />;

let el = <div prop1 prop2={2} innerHTML="Hello world!" />;

let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    <p>Child element content</p>
  </div>
);

let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    <p>Child element content 1</p>
    <p>Child element context 2</p>
  </div>
);

let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    {"Child text content"}
  </div>
);

let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    {identifier}
  </div>
);

let el = <div dangerouslySetInnerHTML={{ __html: "<p>Hello</p><p>world!</p>" }} />;
// after eslint --fix:
let el = <div innerHTML={"<p>Hello</p><p>world!</p>"} />;

let el = <div dangerouslySetInnerHTML={foo} />;

let el = <div dangerouslySetInnerHTML={{}} />;
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = (
  <div prop1 prop2={2}>
    Hello world!
  </div>
);

let el = (
  <Box prop1 prop2={2}>
    Hello world!
  </Box>
);

let el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>" />;

let el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />;

let el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>"></div>;
```
<!-- end-doc-gen -->
