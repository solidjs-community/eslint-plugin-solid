<!-- doc-gen HEADER -->
# solid/no-unassigned-vars
Disallow `let` and `var` variables that are read but never assigned, counting `ref={el}` as an assignment. Replaces ESLint's `no-unassigned-vars`.
This rule is **an error** by default.

[View source](../src/rules/no-unassigned-vars.ts) · [View tests](../test/rules/no-unassigned-vars.test.ts)
<!-- end-doc-gen -->

<!-- doc-gen OPTIONS -->

<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
let x;
use(x);

let el;
<div ref={() => el} />;

let el;
<Comp elRef={el} />;

```

### Valid Examples

These snippets don't cause lint errors.

```js
let el;
<div ref={el} onClick={() => el.focus()} />;

let api;
<Dialog ref={api} />;
api.open();

let el!: HTMLDivElement;
<div ref={el} onClick={() => el.focus()} />;

let el: HTMLDivElement | undefined;
<div ref={el!} />;
el?.focus();

let x;
x = 1;
use(x);

let x = 1;
use(x);

let x;

declare let x: number;
use(x);

```
<!-- end-doc-gen -->
