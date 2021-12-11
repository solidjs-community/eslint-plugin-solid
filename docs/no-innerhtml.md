<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/no-innerhtml
Disallow usage of the innerHTML attribute, which can often lead to security vulnerabilities.
This rule is **an error** by default.

[View source](../src/rules/no-innerhtml.ts) · [View tests](../test/rules/no-innerhtml.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

```
  "no-innerhtml": ["error", { "<key>": "<value>" }]
```

Key | Type | Description
:--- | :---: | :---
allowStatic | `boolean` |  
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <div prop1 prop2={2} innerHTML="<p>Hello</><p>world!</p>" />;
 
let el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />;
 
/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = <div prop1 prop2={2} innerHTML={Math.random()} />;
 
/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = <div prop1 prop2={2} innerHTML="Hello world!" />;
 
/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    <p>Child element content</p>
  </div>
);
 
/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    <p>Child element content 1</p>
    <p>Child element context 2</p>
  </div>
);
 
/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    {"Child text content"}
  </div>
);
 
/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = (
  <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
    {identifier}
  </div>
);
 
let el = (
  <div dangerouslySetInnerHTML={{ __html: "<p>Hello</p><p>world!</p>" }} />
);
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

/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>" />;

/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />;

/* eslint solid/no-innerhtml: ["error", { "allowStatic": true }] */
let el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>"></div>;

```
<!-- AUTO-GENERATED-CONTENT:END -->