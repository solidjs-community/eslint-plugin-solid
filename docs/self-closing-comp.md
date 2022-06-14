<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/self-closing-comp
Disallow extra closing tags for components without children.
This rule is **a warning** by default.

[View source](../src/rules/self-closing-comp.ts) · [View tests](../test/rules/self-closing-comp.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

```
  "self-closing-comp": ["error", { "<key>": "<value>" }]
```

Key | Type | Description
:--- | :---: | :---
component | `"all" | "none"` |  *Default `"all"`*.
html | `"all" | "void" | "none"` |  *Default `"all"`*.
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <div></div>;
// after eslint --fix:
let el = <div />;
 
let el = <img></img>;
// after eslint --fix:
let el = <img />;
 
/* eslint solid/self-closing-comp: ["error", { "html": "void" }] */
let el = <div />;
// after eslint --fix:
let el = <div></div>;
 
/* eslint solid/self-closing-comp: ["error", { "html": "void" }] */
let el = <div />;
// after eslint --fix:
let el = <div></div>;
 
/* eslint solid/self-closing-comp: ["error", { "html": "none" }] */
let el = <img />;
// after eslint --fix:
let el = <img></img>;
 
/* eslint solid/self-closing-comp: ["error", { "html": "none" }] */
let el = <img />;
// after eslint --fix:
let el = <img></img>;
 
let el = <div></div>;
// after eslint --fix:
let el = <div />;
 
let el = <Component></Component>;
// after eslint --fix:
let el = <Component />;
 
/* eslint solid/self-closing-comp: ["error", { "component": "none" }] */
let el = <Component />;
// after eslint --fix:
let el = <Component></Component>;
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <Component name="Foo" />;

let el = <Compound.Component name="Foo" />;

let el = (
  <Component>
    <img src="picture.png" />
  </Component>
);

let el = (
  <Compound.Component>
    <img src="picture.png" />
  </Compound.Component>
);

let el = (
  <Component>
    <Component name="Foo" />
  </Component>
);

let el = (
  <Compound.Component>
    <Compound.Component />
  </Compound.Component>
);

let el = <Component name="Foo"> </Component>;

let el = <Compound.Component name="Foo"> </Compound.Component>;

let el = <Component name="Foo"> </Component>;

let el = <div>&nbsp;</div>;

let el = <div> </div>;

/* eslint solid/self-closing-comp: ["error", { "html": "none" }] */
let el = <div></div>;

/* eslint solid/self-closing-comp: ["error", { "html": "none" }] */
let el = <img></img>;

/* eslint solid/self-closing-comp: ["error", { "html": "void" }] */
let el = <div></div>;

/* eslint solid/self-closing-comp: ["error", { "html": "none" }] */
let el = <div></div>;

/* eslint solid/self-closing-comp: ["error", { "component": "none" }] */
let el = <Component></Component>;

```
<!-- AUTO-GENERATED-CONTENT:END -->
