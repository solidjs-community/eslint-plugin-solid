<!-- doc-gen HEADER -->
# solid/no-react-specific-props
Disallow usage of React-specific `className`/`htmlFor` props, which were deprecated in v1.4.0.
This rule is **a warning** by default.

[View source](../src/rules/no-react-specific-props.ts) · [View tests](../test/rules/no-react-specific-props.test.ts)
<!-- end-doc-gen -->

<!-- doc-gen OPTIONS -->

<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
let el = <div className="greeting">Hello world!</div>;
// after eslint --fix:
let el = <div class="greeting">Hello world!</div>;

let el = <div className={"greeting"}>Hello world!</div>;
// after eslint --fix:
let el = <div class={"greeting"}>Hello world!</div>;

let el = <div className="greeting" />;
// after eslint --fix:
let el = <div class="greeting" />;

let el = (
  <div many other attributes className="greeting">
    Hello world!
  </div>
);
// after eslint --fix:
let el = (
  <div many other attributes class="greeting">
    Hello world!
  </div>
);

let el = <PascalComponent className="greeting">Hello world!</PascalComponent>;
// after eslint --fix:
let el = <PascalComponent class="greeting">Hello world!</PascalComponent>;

let el = <label htmlFor="id">Hello world!</label>;
// after eslint --fix:
let el = <label for="id">Hello world!</label>;

let el = <label htmlFor={"id"}>Hello world!</label>;
// after eslint --fix:
let el = <label for={"id"}>Hello world!</label>;

let el = (
  <label many other attributes htmlFor="id">
    Hello world!
  </label>
);
// after eslint --fix:
let el = (
  <label many other attributes for="id">
    Hello world!
  </label>
);

let el = <PascalComponent htmlFor="id">Hello world!</PascalComponent>;
// after eslint --fix:
let el = <PascalComponent for="id">Hello world!</PascalComponent>;

let el = <div key={item.id} />;
// after eslint --fix:
let el = <div />;
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div>Hello world!</div>;

let el = <div class="greeting">Hello world!</div>;

let el = <div class={"greeting"}>Hello world!</div>;

let el = (
  <div many other attributes class="greeting">
    Hello world!
  </div>
);

let el = <label for="id">Hello world!</label>;

let el = <label for="id">Hello world!</label>;

let el = <label for={"id"}>Hello world!</label>;

let el = (
  <label many other attributes for="id">
    Hello world!
  </label>
);

let el = <PascalComponent class="greeting" for="id" />;

let el = <PascalComponent key={item.id} />;
```
<!-- end-doc-gen -->
