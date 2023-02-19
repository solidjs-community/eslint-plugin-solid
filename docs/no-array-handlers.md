<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/no-array-handlers
Disallow usage of unsafe event handlers.
This rule is **off** by default.

[View source](../src/rules/no-array-handlers.ts) · [View tests](../test/rules/no-array-handlers.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
 
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
let el = <button onClick={[(n) => console.log(n), "str"]} />;
 
let el = <button onClick={[(k: string) => k.toUpperCase(), "hello"]} />;
 
let el = <div onMouseOver={[1, 2, 3]} />;
 
let el = <div on:click={[handler, i()]} />;
 
let el = <button type="button" onclick={[handler, i() + 2]} class="btn" />;
 
let handler = [(x) => x * 2, 54];
let el = <button style={{ background: "pink" }} onclick={handler} />;
 
const thing = (props) => (
  <div onclick={[props.callback, props.id]}>
    <button type="button" onclick={handler} class="btn" />
  </div>
);
 
function Component() {
  const arr = [(n: number) => n * n, 2];
  return <div onClick={arr} />;
}
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <button style={{ background: "red" }} onClick={() => 9001} />;

const handler = () => 1 + 1;
let el = <button onClick={handler} />;

let el = <button onclick={() => 9001} />;

const handler = () => 1 + 1;
let el = <button style={{ background: "pink" }} onclick={handler} />;

let el = <button attr:click={[(x) => x, 9001]} />;

let el = <button prop:onClick={[(x) => x, 9001]} />;

let el = <button on:Click={() => 1 + 1} />;

function Component(props) {
  return <div onClick={props.onClick} />;
}

<button onClick={() => [handler, "abc"]} />;

<button onClick={() => [handler, { data: true }]} />;

function Component() {
  return <div onClick={[(n: number) => n * n, 2] as SafeArray<number>} />;
}

```
<!-- AUTO-GENERATED-CONTENT:END -->