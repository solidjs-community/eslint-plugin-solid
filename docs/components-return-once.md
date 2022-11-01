<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/components-return-once
Disallow early returns in components. Solid components only run once, and so conditionals should be inside JSX.
This rule is **a warning** by default.

[View source](../src/rules/components-return-once.ts) · [View tests](../test/rules/components-return-once.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

See [this issue](https://github.com/solidjs-community/eslint-plugin-solid/issues/24) for rationale.

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
 
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
function Component() {
  if (condition) {
    return <div />;
  }
  return <span />;
}
 
const Component = () => {
  if (condition) {
    return <div />;
  }
  return <span />;
};
 
function Component() {
  return Math.random() > 0.5 ? <div>Big!</div> : <div>Small!</div>;
}
// after eslint --fix:
function Component() {
  return <>{Math.random() > 0.5 ? <div>Big!</div> : <div>Small!</div>}</>;
}
 
function Component() {
  return Math.random() > 0.5 ? <div>Big!</div> : "Small!";
}
// after eslint --fix:
function Component() {
  return <>{Math.random() > 0.5 ? <div>Big!</div> : "Small!"}</>;
}
 
function Component() {
  return Math.random() > 0.5 ? (
    <div>Big! No, really big!</div>
  ) : (
    <div>Small!</div>
  );
}
// after eslint --fix:
function Component() {
  return (
    <Show when={Math.random() > 0.5} fallback={<div>Small!</div>}>
      <div>Big! No, really big!</div>
    </Show>
  );
}
 
function Component(props) {
  return props.cond1 ? (
    <div>Condition 1</div>
  ) : Boolean(props.cond2) ? (
    <div>Not condition 1, but condition 2</div>
  ) : (
    <div>Neither condition 1 or 2</div>
  );
}
// after eslint --fix:
function Component(props) {
  return (
    <Switch fallback={<div>Neither condition 1 or 2</div>}>
      <Match when={props.cond1}>
        <div>Condition 1</div>
      </Match>
      <Match when={Boolean(props.cond2)}>
        <div>Not condition 1, but condition 2</div>
      </Match>
    </Switch>
  );
}
 
function Component(props) {
  return !!props.cond && <div>Conditional</div>;
}
// after eslint --fix:
function Component(props) {
  return (
    <Show when={!!props.cond}>
      <div>Conditional</div>
    </Show>
  );
}
 
function Component(props) {
  return props.primary || <div>{props.secondaryText}</div>;
}
 
HOC(() => {
  if (condition) {
    return <div />;
  }
  return <div />;
});
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
function Component() {
  return <div />;
}

function someFunc() {
  if (condition) {
    return 5;
  }
  return 10;
}

function notAComponent() {
  if (condition) {
    return <div />;
  }
  return <div />;
}

callback(() => {
  if (condition) {
    return <div />;
  }
  return <div />;
});

```
<!-- AUTO-GENERATED-CONTENT:END -->
