<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/prefer-classlist
Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames.
This rule is **deprecated** and **off** by default.

[View source](../src/rules/prefer-classlist.ts) · [View tests](../test/rules/prefer-classlist.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

Options shown here are the defaults. Manually configuring an array will *replace* the defaults.

```js
{
  "solid/prefer-classlist": ["off", { 
    // An array of names to treat as `classnames` functions
    classnames: ["cn","clsx","classnames"], // Array<string>
  }]
}
```

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
let el = <div class={cn({ red: true })}>Hello, world!</div>;
// after eslint --fix:
let el = <div classlist={{ red: true }}>Hello, world!</div>;
 
let el = <div class={clsx({ red: true })}>Hello, world!</div>;
// after eslint --fix:
let el = <div classlist={{ red: true }}>Hello, world!</div>;
 
let el = <div class={classnames({ red: true })}>Hello, world!</div>;
// after eslint --fix:
let el = <div classlist={{ red: true }}>Hello, world!</div>;
 
/* eslint solid/prefer-classlist: ["error", { "classnames": ["x", "y", "z"] }] */
let el = <div class={x({ red: true })}>Hello, world!</div>;
// after eslint --fix:
let el = <div classlist={{ red: true }}>Hello, world!</div>;
 
let el = <div className={cn({ red: true })}>Hello, world!</div>;
// after eslint --fix:
let el = <div classlist={{ red: true }}>Hello, world!</div>;
 
let el = (
  <div class={cn({ red: true, "mx-4": props.size > 2 })}>Hello, world!</div>
);
// after eslint --fix:
let el = (
  <div classlist={{ red: true, "mx-4": props.size > 2 }}>Hello, world!</div>
);
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div classlist={{ red: true }}>Hello, world!</div>;

let el = <div class="red">Hello, world!</div>;

let el = <div className="red">Hello, world!</div>;

let el = <div something={cn({ red: true })}>Hello, world!</div>;

let el = <div something={clsx({ red: true })}>Hello, world!</div>;

let el = <div something={classnames({ red: true })}>Hello, world!</div>;

let el = <div class={someOtherClassFunction({ red: true })}>Hello, world!</div>;

let el = (
  <div class={cn({ red: true }, condition && "yellow")}>Hello, world!</div>
);

let el = <div something={cn(condition && "yellow")}>Hello, world!</div>;

let el = (
  <div class={clsx({ red: true })} classlist={{}}>
    Hello, world!
  </div>
);

/* eslint solid/prefer-classlist: ["error", { "classnames": ["x", "y", "z"] }] */
let el = <div class={clsx({ red: true })}>Hello, world!</div>;

```
<!-- AUTO-GENERATED-CONTENT:END -->
