<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/jsx-no-script-url
Disallow javascript: URLs.
This rule is **an error** by default.

[View source](../src/rules/jsx-no-script-url.ts) · [View tests](../test/rules/jsx-no-script-url.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

See [this issue](https://github.com/joshwilsonvu/eslint-plugin-solid/issues/24) for rationale.

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
### Invalid Examples

These snippets cause lint errors.

```js
let el = <a href="javascript:alert('hacked!')" />;
 
let el = <Link to="javascript:alert('hacked!')" />;
 
let el = <Foo bar="javascript:alert('hacked!')" />;
 
const link = "javascript:alert('hacked!')";
let el = <a href={link} />;
 
const link = "\tj\na\tv\na\ts\nc\tr\ni\tpt:alert('hacked!')";
let el = <a href={link} />;
 
const link = "javascrip" + "t:alert('hacked!')";
let el = <a href={link} />;
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <a href="https://example.com" />;

let el = <Link to="https://example.com" />;

let el = <Foo bar="https://example.com" />;

const link = "https://example.com";
let el = <a href={link} />;

```
<!-- AUTO-GENERATED-CONTENT:END -->
