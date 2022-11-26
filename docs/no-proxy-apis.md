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

These snippets cause lint errors.

```js
let proxy = new Proxy(asdf, {});
 
let proxy = Proxy.revocable(asdf, {});
 
import {} from "solid-js/store";
 
let el = <div {...maybeSignal()} />;
 
let el = <div {...{ ...maybeSignal() }} />;
 
let el = <div {...maybeProps.foo} />;
 
let el = <div {...{ ...maybeProps.foo }} />;
 
let merged = mergeProps(maybeSignal);
 
let func = () => ({});
let merged = mergeProps(func, props);
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let merged = mergeProps({}, props);

const obj = {};
let merged = mergeProps(obj, props);

let obj = {};
let merged = mergeProps(obj, props);

let merged = mergeProps(
  {
    get asdf() {
      signal();
    },
  },
  props
);

let el = <div {...{ asdf: "asdf" }} />;

let el = <div {...asdf} />;

let obj = { Proxy: 1 };

```
<!-- AUTO-GENERATED-CONTENT:END -->