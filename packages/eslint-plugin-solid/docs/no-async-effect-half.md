<!-- doc-gen HEADER -->
# solid/no-async-effect-half
Disallow async functions as the effect half of `createEffect(compute, effect)`, where a returned cleanup function would be silently discarded.
This rule is **off** by default.

[View source](../src/rules/no-async-effect-half.ts) · [View tests](../test/rules/no-async-effect-half.test.ts)
<!-- end-doc-gen -->

In Solid 2.0's split `createEffect(compute, effect)` form, the effect half may return a cleanup function that runs before the next execution and on disposal. Marking the effect function `async` breaks that contract twice over: the function now returns a Promise, so the cleanup it "returns" is silently discarded, and every statement after the first `await` runs detached from the effect's lifecycle — possibly after the effect has rerun or been disposed.

```js
// ✗ The abort cleanup is never registered, and setData may fire after disposal
createEffect(
  () => query(),
  async (q) => {
    const data = await fetch(q).then((r) => r.json());
    setData(data);
    return () => controller.abort(); // discarded: this resolves a Promise
  }
);

// ✓ Do the async work in the compute half — async computations are tracked
createEffect(
  async () => (await fetch(query())).json(),
  (data) => setData(data)
);

// ✓ Or start the work here and register cleanup synchronously
createEffect(
  () => query(),
  (q) => {
    const controller = new AbortController();
    fetch(q, { signal: controller.signal }).then(handle);
    return () => controller.abort();
  }
);
```

The compute half is exempt: async computations are first-class in Solid 2.0, and `solid/reactivity` understands their tracking semantics.

This rule is enabled as an error in the `v2` and `v2-strict` configs.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createEffect } from "solid-js";
createEffect(
  () => query(),
  async (q) => {
    const data = await fetch(q);
    setData(data);
  }
);

import { createEffect } from "solid-js";
createEffect(
  () => query(),
  async function (q) {
    await save(q);
  }
);

import { createRenderEffect } from "solid-js";
createRenderEffect(
  () => count(),
  async (value) => update(await value)
);

import { createEffect } from "solid-js";
async function persist(value) {
  await save(value);
}
createEffect(() => count(), persist);

import { createEffect } from "solid-js";
const persist = async (value) => save(value);
createEffect(() => count(), persist);

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createEffect } from "solid-js";
createEffect(
  () => count(),
  (value) => console.log(value)
);

import { createEffect } from "solid-js";
createEffect(
  async () => (await fetch(url())).json(),
  (data) => setData(data)
);

import { createEffect } from "solid-js";
createEffect(
  () => query(),
  (q) => {
    const controller = new AbortController();
    fetch(q, { signal: controller.signal }).then(handle);
    return () => controller.abort();
  }
);

import { createEffect } from "solid-js";
createEffect(async () => console.log(await promise));

import { createEffect } from "solid-js";
const log = (value) => console.log(value);
createEffect(() => count(), log);

```
<!-- end-doc-gen -->
