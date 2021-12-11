<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/no-unknown-namespaces
Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).
This rule is **an error** by default.

[View source](../src/rules/no-unknown-namespaces.ts) · [View tests](../test/rules/no-unknown-namespaces.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
### Invalid Examples

These snippets cause lint errors.

```js
let el = <div foo:boo={null} />;
 
let el = <div bar:car={null} />;
 
let el = <div style:width="100%" />;
 
let el = <div style:width={0} />;
 
let el = <div class:mt-10={true} />;
 
let el = <div class:mt-10 />;
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div on:click={null} />;

let el = <div on:focus={null} />;

let el = <div on:quux />;

let el = <div oncapture:click={null} />;

let el = <div oncapture:focus={null} />;

let el = <div use:X={null} />;

let el = <div use:X />;

let el = <div prop:scrollTop="0px" />;

let el = <div attr:title="title" />;

```
<!-- AUTO-GENERATED-CONTENT:END -->