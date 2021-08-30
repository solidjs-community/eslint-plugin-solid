<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/style-prop
Ensures CSS properties in the `style` prop are valid and kebab-cased (ex. 'font-size'), not camel-cased (ex. 'fontSize') like in React, and that property values are strings, not numbers with implicit 'px' units.
This rule is **an error** by default.

[View source](../src/rules/style-prop.ts) · [View tests](../test/rules/style-prop.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

```
  "style-prop": ["error", { "<key>": "<value>" }]
```

Key | Type | Description
:--- | :---: | :---
styleProps | `Array<string>` |  
allowString | `boolean` |  
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <div style={{ fontSize: "10px" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>;
 
let el = <div style={{ backgroundColor: "10px" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "background-color": "10px" }}>Hello, world!</div>;
 
let el = <div style={{ "-webkitAlignContent": "center" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "-webkit-align-content": "center" }}>Hello, world!</div>;
 
let el = <div style={{ COLOR: "10px" }}>Hello, world!</div>;
 
let el = <div style={{ unknownStyleProp: "10px" }}>Hello, world!</div>;
 
/* eslint solid/style-prop: ["error", { "styleProps": ["style", "css"] }] */
let el = <div css={{ fontSize: "10px" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div css={{ "font-size": "10px" }}>Hello, world!</div>;
 
/* eslint solid/style-prop: ["error", { "styleProps": ["css"] }] */
let el = <div css={{ fontSize: "10px" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div css={{ "font-size": "10px" }}>Hello, world!</div>;
 
let el = <div style="font-size: 10px;">Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>;
 
let el = <div style={"font-size: 10px;"}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>;
 
let el = <div style="font-size: 10px; missing-value: ;">Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>;
 
let el = <div style="Super invalid CSS! Not CSS at all!">Hello, world!</div>;
 
let el = <div style={`font-size: 10px;`}>Hello, world!</div>;
 
let el = <div style={{ "font-size": 10 }}>Hello, world!</div>;
 
let el = <div style={{ "margin-top": -10 }}>Hello, world!</div>;
 
let el = <div style={{ padding: 0 }}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ padding: "0" }}>Hello, world!</div>;
 
```
### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div style={{ color: "red" }}>Hello, world!</div>;

let el = (
  <div style={{ color: "red", "background-color": "green" }}>Hello, world!</div>
);

let el = (
  <div style={{ color: "red", "background-color": "green" }}>Hello, world!</div>
);

let el = <div style={{ "-webkit-align-content": "center" }}>Hello, world!</div>;

let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>;

let el = <div style={{ "font-size": "0" }}>Hello, world!</div>;

let el = <div STYLE={{ fontSize: 10 }}>Hello, world!</div>;

/* eslint solid/style-prop: ["error", { "allowString": true }] */
let el = <div style="color: red;" />;

/* eslint solid/style-prop: ["error", { "allowString": true }] */
let el = <div style={`color: ${themeColor};`} />;

/* eslint solid/style-prop: ["error", { "styleProps": ["style", "css"] }] */
let el = <div css={{ color: "red" }}>Hello, world</div>;

/* eslint solid/style-prop: ["error", { "styleProps": ["css"] }] */
let el = <div style={{ fontSize: 10 }}>Hello, world!</div>;

```

<!-- AUTO-GENERATED-CONTENT:END -->
