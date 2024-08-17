<!-- doc-gen HEADER -->
# solid/no-react-deps
Disallow usage of dependency arrays in `createEffect` and `createMemo`.
This rule is **a warning** by default.

[View source](../src/rules/no-react-deps.ts) · [View tests](../test/rules/no-react-deps.test.ts)
<!-- end-doc-gen -->

<!-- doc-gen OPTIONS -->

<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

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

const deps = [signal];
createEffect(() => {
  console.log(signal());
}, deps);

const value = createMemo(() => computeExpensiveValue(a(), b()), [a(), b()]);
// after eslint --fix:
const value = createMemo(() => computeExpensiveValue(a(), b()));

const value = createMemo(() => computeExpensiveValue(a(), b()), [a, b]);
// after eslint --fix:
const value = createMemo(() => computeExpensiveValue(a(), b()));

const value = createMemo(() => computeExpensiveValue(a(), b()), [a, b()]);
// after eslint --fix:
const value = createMemo(() => computeExpensiveValue(a(), b()));

const deps = [a, b];
const value = createMemo(() => computeExpensiveValue(a(), b()), deps);

const deps = [a, b];
const memoFn = () => computeExpensiveValue(a(), b());
const value = createMemo(memoFn, deps);
```

### Valid Examples

These snippets don't cause lint errors.

```js
createEffect(() => {
  console.log(signal());
});

createEffect((prev) => {
  console.log(signal());
  return prev + 1;
}, 0);

createEffect((prev) => {
  console.log(signal());
  return (prev || 0) + 1;
});

createEffect((prev) => {
  console.log(signal());
  return prev ? prev + 1 : 1;
}, undefined);

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
<!-- end-doc-gen -->
