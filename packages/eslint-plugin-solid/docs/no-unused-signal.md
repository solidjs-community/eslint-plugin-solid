<!-- doc-gen HEADER -->
# solid/no-unused-signal
Disallow signals that are never written (use a plain value) or never read (dead state).
This rule is **off** by default.

[View source](../src/rules/no-unused-signal.ts) · [View tests](../test/rules/no-unused-signal.test.ts)
<!-- end-doc-gen -->

A destructured signal tuple is the only handle on the signal, so scope analysis is conclusive: if the setter is never referenced, the value can never change and the signal is really a constant; if the accessor is never referenced, the state can never be observed and every write is dead code. Unused-variable rules miss both cases because the *other* half of the tuple keeps the declaration "used".

```js
// ✗ Never written — this is a constant wearing a signal costume
const [limit, setLimit] = createSignal(10);
return <List max={limit()} />;

// ✓ A plain accessor keeps call sites identical
const limit = () => 10;

// ✓ Or createMemo, if the value derives from reactive state
const limit = createMemo(() => props.pageSize ?? 10);
```

```js
// ✗ Never read — state that's only written has no effect
const [lastSaved, setLastSaved] = createSignal(null);
const save = () => setLastSaved(Date.now());
```

Never-written signals with a literal initial value get an editor suggestion rewriting them to a constant accessor. Exported signal declarations are skipped, since other modules may read or write them.

This rule commonly fires on leftover scaffolding after a Solid 1.x → 2.0 migration, such as signals that used to mirror a `createResource`.

This rule is enabled as a warning in the `v2` config and an error in `v2-strict`.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
console.log(count());

import { createSignal } from "solid-js";
const [count] = createSignal(0);
console.log(count());

import { createSignal } from "solid-js";
const [items, setItems] = createSignal([]);
console.log(items());

import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
setCount(5);

import { createSignal } from "solid-js";
const [, setCount] = createSignal(0);
setCount(5);

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createSignal } from "solid-js";
const [count, setCount] = createSignal(0);
console.log(count());
setCount(1);

import { createSignal } from "solid-js";
function Counter() {
  const [count, setCount] = createSignal(0);
  return <Child value={count} onIncrement={setCount} />;
}

import { createSignal } from "solid-js";
export const [theme, setTheme] = createSignal("light");

import { createSignal } from "solid-js";
const tuple = createSignal(0);
use(tuple);

```
<!-- end-doc-gen -->
