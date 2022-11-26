<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/no-react-deps
Disallow usage of dependency arrays in createEffect and createMemo.
This rule is **a warning** by default.

[View source](../src/rules/no-react-deps.ts) · [View tests](../test/rules/no-react-deps.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
 
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
createEffect(() => {
  console.log(signal());
}, [signal()]);
// after eslint --fix:
createEffect(() => {
  console.log(signal());
});
 
createEffect(() => {
  console.log(signal());
}, [signal]);
// after eslint --fix:
createEffect(() => {
  console.log(signal());
});
 
const value = createMemo(() => computeExpensiveValue(a(), b()), [a(), b()]);
// after eslint --fix:
const value = createMemo(() => computeExpensiveValue(a(), b()));
 
const value = createMemo(() => computeExpensiveValue(a(), b()), [a, b]);
// after eslint --fix:
const value = createMemo(() => computeExpensiveValue(a(), b()));
 
const value = createMemo(() => computeExpensiveValue(a(), b()), [a, b()]);
// after eslint --fix:
const value = createMemo(() => computeExpensiveValue(a(), b()));
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
createEffect(() => {
  console.log(signal());
});

createEffect((prev) => {
  console.log(signal() + prev);
}, 0);

const value = createMemo(() => computeExpensiveValue(a(), b()));

const sum = createMemo((prev) => input() + prev, 0);

const args = [
  () => {
    console.log(signal());
  },
  [signal()],
];
createEffect(...args);

```
<!-- AUTO-GENERATED-CONTENT:END -->
