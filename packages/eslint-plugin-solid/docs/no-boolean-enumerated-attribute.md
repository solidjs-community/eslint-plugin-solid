<!-- doc-gen HEADER -->
# solid/no-boolean-enumerated-attribute
Disallow boolean values on enumerated attributes like draggable and tristate aria-*, which take string tokens — a boolean false removes the attribute instead of writing "false".
This rule is **off** by default.

[View source](../src/rules/no-boolean-enumerated-attribute.ts) · [View tests](../test/rules/no-boolean-enumerated-attribute.test.ts)
<!-- end-doc-gen -->

Enumerated attributes look boolean but aren't: they take literal string tokens — `"true"`/`"false"` for `draggable`, `spellcheck`, `contenteditable`, and the tristate ARIA states, `"yes"`/`"no"` for `translate`. Solid's attribute handling removes an attribute entirely when its value is `false` and writes an empty string for `true`, so booleans silently produce a *different state* than the matching token:

- `draggable={false}` removes the attribute → the element behaves as `"auto"`, not `"false"`. `draggable={true}` (and bare `draggable`) writes an empty value, which is invalid for `draggable` and also behaves as `"auto"`.
- `spellcheck={false}`, `contenteditable={false}`, `translate={false}` remove the attribute → the element *inherits* instead of being explicitly off.
- `aria-checked`, `aria-expanded`, `aria-hidden`, `aria-pressed`, `aria-selected` are tristate: absence means `"undefined"` (not checkable, not expandable, computed from the tree), which assistive technologies treat differently from an explicit `"false"`. This bites hardest on the common React habit `aria-expanded={isOpen()}`.

```jsx
// ✗ A different state than intended
<div draggable={false} />          // behaves as "auto"
<button aria-expanded={false} />   // state becomes "undefined", not collapsed

// ✓ The string tokens
<div draggable="false" />
<button aria-expanded={open() ? "true" : "false"} />
```

The rule only reports values that provably misbehave: boolean literals in a broken direction, bare `draggable`, and expressions that are boolean by construction (comparisons, negations). Dynamic values whose type can't be proven locally are left alone — and boolean forms that happen to work are too (`contenteditable={true}` writes `""`, which *is* the true state; ARIA attributes that default to `"false"`, like `aria-disabled`, where removal is equivalent to false).

Boolean literals are autofixed to the matching token. Provably-boolean expressions get an editor suggestion mapping them through a ternary.

This rule applies to Solid 1.x as well as 2.0 — the attribute behavior is the same — but is only enabled by default (as an error) in the `v2` and `v2-strict` configs.

Credit to [#145](https://github.com/solidjs-community/eslint-plugin-solid/pull/145) by @SarguelUnda, which proposed this rule for `draggable`.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
let el = <div draggable={false} />;
// after eslint --fix:
let el = <div draggable="false" />;

let el = <textarea spellcheck={false} />;
// after eslint --fix:
let el = <textarea spellcheck="false" />;

let el = <div contenteditable={false} />;
// after eslint --fix:
let el = <div contenteditable="false" />;

let el = <p translate={false} />;
// after eslint --fix:
let el = <p translate="no" />;

let el = <div draggable={true} />;
// after eslint --fix:
let el = <div draggable="true" />;

let el = <img draggable />;
// after eslint --fix:
let el = <img draggable="true" />;

let el = <button aria-expanded={false} />;
// after eslint --fix:
let el = <button aria-expanded="false" />;

let el = <div aria-hidden={true} />;
// after eslint --fix:
let el = <div aria-hidden="true" />;

let el = <button aria-pressed={count() > 0} />;

let el = <div draggable={!locked()} />;

let el = <p translate={a === b} />;

```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div draggable="true" />;

let el = <div draggable="false" />;

let el = <span aria-expanded="false" />;

let el = <p translate="no" />;

let el = <div draggable={dragMode()} />;

let el = <button aria-pressed={pressed()} />;

let el = <button aria-expanded={open() ? "true" : "false"} />;

let el = <div contenteditable />;

let el = <div contenteditable={true} />;

let el = <textarea spellcheck={true} />;

let el = <p translate />;

let el = <input disabled={true} />;

let el = <input readonly={false} />;

let el = <button aria-disabled={false} />;

let el = <div aria-busy={isLoading()} />;

let el = <Toggle draggable={false} aria-expanded={false} />;

```
<!-- end-doc-gen -->
