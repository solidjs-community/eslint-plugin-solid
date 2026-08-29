<!-- doc-gen HEADER -->
# solid/no-accessor-as-prop
Disallow passing uncalled signal accessors or other functions as value-typed DOM element attributes.
This rule is **off** by default.

[View source](../src/rules/no-accessor-as-prop.ts) · [View tests](../test/rules/no-accessor-as-prop.test.ts)
<!-- end-doc-gen -->

Passing an uncalled signal accessor as a value-typed DOM attribute (`<div title={count} />`) silently sets the attribute to a stringified function. TypeScript has flagged this since Solid 1.7, but the error is a cryptic assignability failure, and many pipelines never run `tsc` (Vite builds don't typecheck). This rule is the enforcement and translation layer: it fires on the same span with a message that states the fix (`count` → `count()`).

Unlike `solid/reactivity`'s signal tracing, any expression that statically resolves to a function fires here — including plain helper functions — and the rule keeps working when the `reactivity` mega-rule is disabled. Event handlers (`onClick`), `ref`, `children`, namespaced attributes, components, and custom elements are all exempt, since functions are legitimate values there.

This rule is enabled as an error in the `v2` and `v2-strict` configs.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <div title={count} />;

import { createMemo } from "solid-js";
const label = createMemo(() => "hi");
let el = <input value={label} />;

const getTitle = () => "hello";
let el = <div title={getTitle} />;

let el = <div title={() => "hello"} />;

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <div title={count()} />;

import { createMemo } from "solid-js";
const label = createMemo(() => "hi");
let el = <input value={label()} />;

import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
let el = <button onClick={() => setCount(count() + 1)} ref={register} />;

import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <Counter value={count} />;

import { createSignal } from "solid-js";
const [count] = createSignal(0);
let el = <my-element value={count} />;

let el = <div title={title} />;

let el = <div title={"hello"} tabindex={0} />;

```
<!-- end-doc-gen -->
