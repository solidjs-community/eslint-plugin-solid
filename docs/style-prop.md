<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/style-prop
Require CSS properties in the `style` prop to be valid and kebab-cased (ex. 'font-size'), not camel-cased (ex. 'fontSize') like in React, and that property values with dimensions are strings, not numbers with implicit 'px' units.
This rule is **a warning** by default.

[View source](../src/rules/style-prop.ts) · [View tests](../test/rules/style-prop.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

Options shown here are the defaults. If you manually configure a rule, your options will **replace** the default set.

```js
{
  "solid/style-prop": ["warn", { 
    // an array of prop names to treat as a CSS style object
    styleProps: ["style"], // Array<string>
    // if allowString is set to true, this rule will not convert a style string literal into a style object (not recommended for performance)
    allowString: false, 
  }]
}
```

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <div style={{ fontSize: "10px" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>;
 
let el = <div style={{ backgroundColor: "red" }}>Hello, world!</div>;
// after eslint --fix:
let el = <div style={{ "background-color": "red" }}>Hello, world!</div>;
 
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

let el = <div style={{ "font-size": 0 }}>Hello, world!</div>;

let el = <div STYLE={{ fontSize: 10 }}>Hello, world!</div>;

let el = <div style={{ "flex-grow": 1 }}>Hello, world!</div>;

let el = <div style={{ "--custom-width": 1 }}>Hello, world!</div>;

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
