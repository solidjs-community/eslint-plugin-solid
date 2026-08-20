<!-- doc-gen HEADER -->
# solid/no-restated-default-options
Disallow restating a prop or option value that is already the default.
This rule is **off** by default.

[View source](../src/rules/no-restated-default-options.ts) · [View tests](../test/rules/no-restated-default-options.test.ts)
<!-- end-doc-gen -->

Explicitly passing a prop value that is already the default (`<For keyed={true}>`, `<Show keyed={false}>`) is noise that AI-generated code produces constantly. This rule removes it, in the same opt-in stylistic category as typescript-eslint's `no-unnecessary-type-arguments` or ESLint core's `no-useless-rename`.

Defaults are verified against the Solid 2.0 source: `<For>` is keyed by default; `<Show>` and `<Match>` are non-keyed by default.

This rule is enabled as an error in the `v2-strict` config only.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
let el = (
  <For each={items()} keyed={true}>
    {(item) => <div />}
  </For>
);
// after eslint --fix:
let el = <For each={items()}>{(item) => <div />}</For>;

let el = (
  <For each={items()} keyed>
    {(item) => <div />}
  </For>
);
// after eslint --fix:
let el = <For each={items()}>{(item) => <div />}</For>;

let el = (
  <Show when={user()} keyed={false}>
    <div />
  </Show>
);
// after eslint --fix:
let el = (
  <Show when={user()}>
    <div />
  </Show>
);

let el = (
  <Match when={cond()} keyed={false}>
    <div />
  </Match>
);
// after eslint --fix:
let el = (
  <Match when={cond()}>
    <div />
  </Match>
);

```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = (
  <For each={items()} keyed={false}>
    {(item) => <div />}
  </For>
);

let el = (
  <Show when={user()} keyed>
    {(u) => <div />}
  </Show>
);

let el = (
  <For each={items()} keyed={rowKey}>
    {(item) => <div />}
  </For>
);

let el = <For each={items()}>{(item) => <div />}</For>;

let el = (
  <Show when={user()}>
    <div />
  </Show>
);

let el = <Grid keyed={true} />;

```
<!-- end-doc-gen -->
