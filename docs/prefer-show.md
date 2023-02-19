<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/prefer-show
Enforce using Solid's `<Show />` component for conditionally showing content. Solid's compiler covers this case, so it's a stylistic rule only.
This rule is **off** by default.

[View source](../src/rules/prefer-show.ts) · [View tests](../test/rules/prefer-show.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
 
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
function Component(props) {
  return <div>{props.cond && <span>Content</span>}</div>;
}
// after eslint --fix:
function Component(props) {
  return (
    <div>
      <Show when={props.cond}>
        <span>Content</span>
      </Show>
    </div>
  );
}
 
function Component(props) {
  return <div>{props.cond ? <span>Content</span> : <span>Fallback</span>}</div>;
}
// after eslint --fix:
function Component(props) {
  return (
    <div>
      <Show when={props.cond} fallback={<span>Fallback</span>}>
        <span>Content</span>
      </Show>
    </div>
  );
}
 
function Component(props) {
  return (
    <For each={props.someList}>
      {(listItem) => listItem.cond && <span>Content</span>}
    </For>
  );
}
// after eslint --fix:
function Component(props) {
  return (
    <For each={props.someList}>
      {(listItem) => (
        <Show when={listItem.cond}>
          <span>Content</span>
        </Show>
      )}
    </For>
  );
}
 
function Component(props) {
  return (
    <For each={props.someList}>
      {(listItem) =>
        listItem.cond ? <span>Content</span> : <span>Fallback</span>
      }
    </For>
  );
}
// after eslint --fix:
function Component(props) {
  return (
    <For each={props.someList}>
      {(listItem) => (
        <Show when={listItem.cond} fallback={<span>Fallback</span>}>
          <span>Content</span>
        </Show>
      )}
    </For>
  );
}
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
function Component(props) {
  return <Show when={props.cond}>Content</Show>;
}

function Component(props) {
  return (
    <Show when={props.cond} fallback="Fallback">
      Content
    </Show>
  );
}

```
<!-- AUTO-GENERATED-CONTENT:END -->
