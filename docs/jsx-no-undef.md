<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/jsx-no-undef
Disallow references to undefined variables in JSX. Handles custom directives.
This rule is **an error** by default.

[View source](../src/rules/jsx-no-undef.ts) · [View tests](../test/rules/jsx-no-undef.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

Options shown here are the defaults. 

```js
{
  "solid/jsx-no-undef": ["error", { 
    // When true, the rule will consider the global scope when checking for defined components.
    allowGlobals: false, 
    // Automatically import certain components from `"solid-js"` if they are undefined.
    autoImport: true, 
    // Adjusts behavior not to conflict with TypeScript's type checking.
    typescriptEnabled: false, 
  }]
}
```

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <Component />;
 
let el = <div use:X />;
 
/* eslint solid/jsx-no-undef: ["error", { "typescriptEnabled": true }] */
let el = <div use:X />;
 
let el = <div use:X={{}} />;
 
let el = <div use:X />;
 
/* eslint solid/jsx-no-undef: ["error", { "allowGlobals": true }] */
let el = <div use:X />;
 
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import { For } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
 
let el = <Show when={item}>{(item) => item.name}</Show>;
// after eslint --fix:
import { Show } from "solid-js";
let el = <Show when={item}>{(item) => item.name}</Show>;
 
render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
);
// after eslint --fix:
import { Switch, Match } from "solid-js";

render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
);
 
import X from "x";
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import { For } from "solid-js";
import X from "x";
let el = <For each={items}>{(item) => item.name}</For>;
 
import { Show } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import { Show, For } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
 
import { For, Switch } from "solid-js";
render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
);
// after eslint --fix:
import { For, Switch, Match } from "solid-js";
render(
  <Switch fallback={<div>Not Found</div>}>
    <Match when={state.route === "home"} />
  </Switch>
);
 
import X from "x";
import { Show } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import X from "x";
import { Show, For } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
 
import X from "x";
import Solid from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import X from "x";
import Solid, { For } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
 
import X from "x";
import "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import X from "x";
import { For } from "solid-js";
let el = <For each={items}>{(item) => item.name}</For>;
 
// attached comment
import X from "x";
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import { For } from "solid-js";
// attached comment
import X from "x";
let el = <For each={items}>{(item) => item.name}</For>;
 
import X from "x"; // attached comment
let el = <For each={items}>{(item) => item.name}</For>;
// after eslint --fix:
import { For } from "solid-js";
import X from "x"; // attached comment
let el = <For each={items}>{(item) => item.name}</For>;
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let X;
let el = <div use:X={{}} />;

((X) => <div use:X={{}} />)();

let X;
let el = <div use:X />;

let X,
  el = <div use:X />;

let Component,
  X = <Component use:X />;

/* eslint solid/jsx-no-undef: ["error", { "allowGlobals": true }] */
let el = <div use:X />;

/* eslint solid/jsx-no-undef: ["error", { "allowGlobals": true }] */
let el = <div use:X />;

/* eslint solid/jsx-no-undef: ["error", { "typescriptEnabled": true }] */
let el = <Component />;

```
<!-- AUTO-GENERATED-CONTENT:END -->
