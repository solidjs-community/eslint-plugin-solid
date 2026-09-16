<!-- doc-gen HEADER -->
# solid/imports
Enforce consistent imports from "solid-js", "solid-js/web", and "solid-js/store".
This rule is **a warning** by default.

[View source](../src/rules/imports.ts) · [View tests](../test/rules/imports.test.ts)
<!-- end-doc-gen -->

<!-- doc-gen OPTIONS -->

<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
import { createEffect } from "solid-js/web";
// after eslint --fix:
import { createEffect } from "solid-js";

import { createEffect } from "solid-js/web";
import { createSignal } from "solid-js";
// after eslint --fix:
import { createSignal, createEffect } from "solid-js";

import type { Component } from "solid-js/store";
import { createSignal } from "solid-js";
console.log("hi");
// after eslint --fix:
import { createSignal, Component } from "solid-js";
console.log("hi");

import { createSignal } from "solid-js/web";
import "solid-js";
// after eslint --fix:
import { createSignal } from "solid-js";

import { createSignal } from "solid-js/web";
import {} from "solid-js";
// after eslint --fix:
import { createSignal } from "solid-js";

import { createEffect } from "solid-js/web";
import { render } from "solid-js";
// after eslint --fix:
import { render, createEffect } from "solid-js";

import { render, createEffect } from "solid-js";
// after eslint --fix:
import { render } from "solid-js/web";
import { createEffect } from "solid-js";

import { type JSX } from "solid-js";
// after eslint --fix:
import { type JSX } from "@solidjs/web";

import type { JSX } from "solid-js";
// after eslint --fix:
import type { JSX } from "@solidjs/web";

import type { JSX, Component } from "solid-js";
// after eslint --fix:
import type { JSX } from "@solidjs/web";
import type { Component } from "solid-js";

import { render } from "solid-js";
// after eslint --fix:
import { render } from "@solidjs/web";

import { createSignal } from "@solidjs/web";
// after eslint --fix:
import { createSignal } from "solid-js";

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { createSignal, mergeProps as merge } from "solid-js";

import { createSignal, mergeProps as merge } from "solid-js";

import { render, hydrate } from "solid-js/web";

import { createStore, produce } from "solid-js/store";

import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { something } from "somewhere/else";
import { createStore } from "solid-js/store";

import * as Solid from "solid-js";
Solid.render();

import type { Component, JSX } from "solid-js";
import type { Store } from "solid-js/store";

import { createSignal, createStore, reconcile, merge } from "solid-js";

import { render, Portal, Dynamic, isServer } from "@solidjs/web";

import type { JSX, ValidComponent, ComponentProps } from "@solidjs/web";

import type { ValidComponent, ComponentProps } from "solid-js";

import { createStore } from "solid-js/store";

```
<!-- end-doc-gen -->
