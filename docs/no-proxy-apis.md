<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/no-proxy-apis
Disallow usage of APIs that use ES6 Proxies, only to target environments that don't support them.
This rule is **off** by default.

[View source](../src/rules/no-proxy-apis.ts) · [View tests](../test/rules/no-proxy-apis.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
 
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

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
<!-- AUTO-GENERATED-CONTENT:END -->