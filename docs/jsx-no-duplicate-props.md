<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/jsx-no-duplicate-props
Disallow passing the same prop twice in JSX.
This rule is **an error** by default.

[View source](../src/rules/jsx-no-duplicate-props.ts) · [View tests](../test/rules/jsx-no-duplicate-props.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
## Rule Options

Options shown here are the defaults. 

```js
{
  "solid/jsx-no-duplicate-props": ["error", { 
    // Consider two prop names differing only by case to be the same.
    ignoreCase: false, 
  }]
}
```

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
let el = <div a="a" a="aaaa" />;
 
let el = <div a="a" {...{ a: "aaaa" }} />;
 
let el = <div {...{ a: "aaaa" }} a="a" />;
 
let el = <div a="a" {...{ a: "aaaa" }} />;
 
let el = <div class="blue" class="green" />;
 
let el = <div class="blue" {...{ class: "green" }} />;
 
let el = (
  <div children={<div />}>
    <div />
  </div>
);
 
let el = <div innerHTML="<p></p>" textContent="howdy!" />;
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = <div a="a" b="b" />;

let el = <div a="a" {...{ b: "b" }} />;

let el = <div a="a" {...{ b: "b" }} />;

let el = <div a="a" A="A" />;

let el = <div a="a" {...{ A: "A" }} />;

let el = <div class="blue" />;

let el = <div children={<div />} />;

let el = (
  <div>
    <div />
  </div>
);

```
<!-- AUTO-GENERATED-CONTENT:END -->
