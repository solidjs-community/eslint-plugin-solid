<!-- doc-gen HEADER -->
# solid/prefer-structured-class
Enforce using the structured array/object forms of the `class` prop over manually-built class strings.
This rule is **off** by default.

[View source](../src/rules/prefer-structured-class.ts) · [View tests](../test/rules/prefer-structured-class.test.ts)
<!-- end-doc-gen -->

In Solid 2.0, the `class` prop accepts structured values natively: `ClassValue = string | number | boolean | null | undefined | Record<string, boolean> | ClassValue[]`. Solid toggles only the affected classes when a structured value changes.

Manually building class strings — concatenation with conditionals, template literals with reactive expressions, `.filter(Boolean).join(" ")` — is the React/classnames reflex. It still works (a string is a valid `ClassValue`), but it re-runs the whole expression and rewrites the whole attribute on every change. This rule nudges toward either structured form; the object form and the array form are both good, and the rule imposes no preference between them.

Static strings and plain interpolation (`` class={`btn-${kind}`} ``) are untouched. Simple binary cases get a suggestion fix.

This rule is a warning in the `v2` config and an error in `v2-strict`.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
let el = <div class={"btn " + (active() ? "active" : "")} />;

let el = <div class={`btn ${active() ? "active" : ""}`} />;

let el = <div class={[base, active() && "on"].filter(Boolean).join(" ")} />;

let el = <div class={"btn " + variant() + " large"} />;

```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div class={["btn", { active: active() }]} />;

let el = <div class={{ btn: true, active: active() }} />;

let el = <div class="btn primary" />;

let el = <div class={"btn"} />;

let el = <div class={`btn-${kind}`} />;

let el = <div class={"btn" + "-primary"} />;

let el = <div title={"a " + (b() ? "c" : "")} />;

```
<!-- end-doc-gen -->
