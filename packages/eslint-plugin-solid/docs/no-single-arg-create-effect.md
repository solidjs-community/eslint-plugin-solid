<!-- doc-gen HEADER -->
# solid/no-single-arg-create-effect
Require the two-argument `createEffect(compute, effect)` form used by Solid 2.0.
This rule is **off** by default.

[View source](../src/rules/no-single-arg-create-effect.ts) · [View tests](../test/rules/no-single-arg-create-effect.test.ts)
<!-- end-doc-gen -->

Solid 2.0 splits effects into a tracked compute function and an untracked effect function: `createEffect(compute, effect)`. The single-argument 1.x form is the most commonly reproduced mistake in AI-generated Solid 2.0 code. TypeScript types the 1.x form as `never` through a deprecated overload — which produces no compile error on a bare statement call — and the runtime only throws in dev mode. This rule is the build-time hard stop.

```js
// Solid 1.x
createEffect(() => console.log(count()));

// Solid 2.0
createEffect(() => count(), (value) => console.log(value));
```

For a derived value, use `createMemo`. For a one-shot side effect at setup time, just call the function directly.

This rule is enabled as an error in the `v2` and `v2-strict` configs.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
import { createEffect } from "solid-js";
createEffect(() => console.log(count()));

import { createRenderEffect } from "solid-js";
createRenderEffect(() => update(count()));

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
createEffect(count, (value) => console.log(value), { name: "logger" });

import { createRenderEffect } from "solid-js";
createRenderEffect(
  () => count(),
  (value) => update(value)
);

```
<!-- end-doc-gen -->
