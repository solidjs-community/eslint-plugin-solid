<!-- doc-gen HEADER -->
# solid/validate-jsx-nesting
Disallow HTML nesting the browser refuses to keep, like `<p><div /></p>`, which silently renders a different DOM than the JSX describes.
This rule is **an error** by default.

[View source](../src/rules/validate-jsx-nesting.ts) · [View tests](../test/rules/validate-jsx-nesting.test.ts)
<!-- end-doc-gen -->

Some markup can't survive the HTML parser. `<p><div /></p>` doesn't render a
`div` inside a `p`: the parser closes the paragraph, emits the `div` as a
sibling, and opens an empty paragraph after it. The JSX says one thing and the
DOM is another, which breaks positional walks, event delegation targets and
hydration alike.

Solid's compiler validates static templates and, in 2.0, errors on them. This
rule brings the same check to the editor, on the line, before a build runs, and
covers a case the template validator can't see: an element behind an expression
container (`<p>{<hr />}</p>`) leaves the static template and is inserted at
runtime, so the compiler never parses it as markup. On the client that insert
is an `appendChild`, which builds the invalid tree happily; under SSR the same
JSX is serialized, reparsed by the browser, and hydration walks a DOM that no
longer matches.

Inserted children get their own message, since the client renders them as
written and only server-rendered HTML is restructured. They are still reported
as errors. A component can't tell whether it will be server-rendered, and the
nesting is the one the compiler rejects in a static template, so the
[confidence policy](./rule-confidence.md) classes these reports as certain in
context, like `no-module-scope-reactive-primitive`. That rule only runs in
`v2-strict`; this one stays in `recommended` because severity is set per rule,
not per message, and the repair (nesting the parser keeps) is right in both
modes, so it never pushes a client-only app into a worse shape.

Two questions decide a report, and both must say yes. `validate-html-nesting`
is consulted first, as a cheap filter. Because its tables encode the spec's
content model rather than parser behavior, a second check settles it: the pair
is parsed with `parse5` and reported only if the parser actually restructures
it. That's why `<div><figcaption /></div>`, `<table><script /></table>` and
`<math><mi /></math>` are left alone — the spec frowns at some of them, but
every browser keeps the tree exactly as written.

Inside `<svg>` and `<math>` the pair is parsed a second time in that namespace,
and it is reported only if the parser restructures it there too. The parser
keeps `<svg><a href="/"><a href="/" /></a></svg>` and
`<svg><title><b /></title></svg>` as written, so they aren't reported.
`<foreignObject>`, `<desc>`, `<title>` and MathML's text elements (`<mi>`,
`<mo>`, `<mn>`, `<ms>`, `<mtext>`) hand their children back to HTML, so
`<svg><foreignObject><p><div /></p></foreignObject></svg>` still is. So do the
HTML tags that make the parser leave foreign content, like `<p>`, `<div>` or
`<span>`: the inner `<a>` in
`<svg><g><p><a href="/"><a href="/" /></a></p></g></svg>` is reported.
`<font>` leaves foreign content only with a `color`, `face` or `size`
attribute, and MathML's `<annotation-xml>` hands its children back to HTML only
with `encoding="text/html"` or `encoding="application/xhtml+xml"`.

The namespace is read from the nearest `<svg>` or `<math>` in the JSX, even
across an expression or a component. The compiler builds that part as a
separate template, which stays in SVG only when its root is an SVG-only
element, so `<svg>{ok && <a href="/"><a href="/" /></a>}</svg>` goes unreported
even though the compiler rejects it when generating DOM code.

The check is between an element and its direct parent, which is a real limit:
the parser also closes `p`, `a`, `button`, `form` and `li` by scope, and pushes
HTML out of `<svg>` from any depth. `<p><a href="/"><div /></a></p>` is invalid
for that reason and this rule stays quiet about it, while Solid's compiler
errors on it. Matching the parser there means reimplementing its scope rules;
until then the build is the backstop, and under-reporting is the deliberate
trade.

The rule only speaks when both the parent and the child are literal lowercase
tags. Components, `<Dynamic>` and member expressions can render any wrapper, so
their markup is unknown. Control flow is traversed only where the parent is
still statically certain (`&&`, ternaries, array literals, a `children` prop,
all of which compile to an insert into the same element) and abandoned where it
isn't, such as a `.map()` callback or a variable rendered elsewhere. There is no
autofix: the correct repair depends on what the markup meant.

<!-- doc-gen OPTIONS -->

<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
let el = (
  <head>
    <div />
  </head>
);

let el = (
  <body>
    <tr />
  </body>
);

let el = (
  <p>
    <div>Hello world!</div>
  </p>
);

let el = (
  <p>
    <hr />
  </p>
);

let el = (
  <p>
    Hello <p>world</p>!
  </p>
);

let el = (
  <table>
    <div>Hello world!</div>
  </table>
);

let el = (
  <tr>
    <div>Hello world!</div>
  </tr>
);

let el = (
  <table>
    <tbody>
      <tr>
        <td>
          <tr />
        </td>
      </tr>
    </tbody>
  </table>
);

let el = (
  <a href="/one">
    <a href="/two">Hello world!</a>
  </a>
);

let el = (
  <button>
    <button>Hello world!</button>
  </button>
);

let el = (
  <form>
    <form>Hello world!</form>
  </form>
);

let el = (
  <svg>
    <div>Hello world!</div>
  </svg>
);

let el = (
  <svg>
    <foreignObject>
      <p>
        <div>Hello world!</div>
      </p>
    </foreignObject>
  </svg>
);

let el = (
  <math>
    <mi>
      <a href="/one">
        <a href="/two">x</a>
      </a>
    </mi>
  </math>
);

let el = (
  <svg>
    <g>
      <p>
        <a href="/one">
          <a href="/two" />
        </a>
      </p>
    </g>
  </svg>
);

let el = (
  <svg>
    <font color="red">
      <a href="/one">
        <a href="/two" />
      </a>
    </font>
  </svg>
);

let el = (
  <math>
    <annotation-xml encoding="text/html">
      <a href="/one">
        <a href="/two" />
      </a>
    </annotation-xml>
  </math>
);

let el = (
  <table>
    <thead>
      <th>1</th>
    </thead>
  </table>
);

let el = (
  <table>
    <col />
  </table>
);

let el = (
  <div>
    <tr>
      <td>1</td>
    </tr>
  </div>
);

let el = (
  <ul>
    <li>
      one<li>two</li>
    </li>
  </ul>
);

let el = (
  <h1>
    <h2>Hello world!</h2>
  </h1>
);

let el = (
  <textarea>
    <div>Hello world!</div>
  </textarea>
);

let el = (
  <x-row>
    <td>1</td>
  </x-row>
);

let el = <p>{<hr />}</p>;

let el = <p>{condition && <hr />}</p>;

let el = <p>{condition ? <hr /> : <div />}</p>;

let el = <p>{[<hr />]}</p>;

let el = <p children={<hr />} />;

let el = (
  <p>
    <div>
      <p>
        <hr />
      </p>
    </div>
  </p>
);

let el = (
  <p>
    <div />
    <div />
  </p>
);

```

### Valid Examples

These snippets don't cause lint errors.

```js
let el = (
  <div>
    <p>Hello world!</p>
  </div>
);

let el = (
  <p>
    <span>Hello world!</span>
  </p>
);

let el = (
  <p>
    Hello <em>world</em>!
  </p>
);

let el = (
  <p>
    one
    <br />
    two
  </p>
);

let el = (
  <table>
    <tbody>
      <tr>
        <td>1</td>
      </tr>
    </tbody>
  </table>
);

let el = (
  <ul>
    <li>one</li>
    <li>two</li>
  </ul>
);

let el = (
  <select>
    <option>one</option>
  </select>
);

let el = (
  <h1>
    <div>Hello world!</div>
  </h1>
);

let el = (
  <div>
    <figcaption>Hello world!</figcaption>
  </div>
);

let el = (
  <ul>
    <figcaption>Hello world!</figcaption>
  </ul>
);

let el = (
  <div>
    <summary>Hello world!</summary>
  </div>
);

let el = (
  <html>
    <body>
      <figcaption>Caption</figcaption>
    </body>
  </html>
);

let el = (
  <body>
    <dd>Definition</dd>
  </body>
);

let el = (
  <body>
    <dt>Term</dt>
  </body>
);

let el = (
  <body>
    <summary>More</summary>
  </body>
);

let el = (
  <body>
    <area shape="rect" coords="0,0,1,1" href="/" />
  </body>
);

let el = (
  <html>
    <head>
      <basefont />
    </head>
  </html>
);

let el = (
  <table>
    <script>{"1"}</script>
  </table>
);

let el = (
  <table>
    <style>{"td{}"}</style>
  </table>
);

let el = (
  <table>
    <tbody>
      <tr>
        <td>
          <figcaption>Caption</figcaption>
        </td>
      </tr>
    </tbody>
  </table>
);

let el = (
  <table>
    <tbody>
      <tr>
        <th>
          <dd>Definition</dd>
        </th>
      </tr>
    </tbody>
  </table>
);

let el = (
  <table>
    <tbody>
      <tr>
        <template />
      </tr>
    </tbody>
  </table>
);

let el = (
  <table>
    <tbody>
      <script>{"1"}</script>
    </tbody>
  </table>
);

let el = (
  <table>
    <thead>
      <template />
    </thead>
  </table>
);

let el = (
  <table>
    <tfoot>
      <template />
    </tfoot>
  </table>
);

let el = (
  <table>
    <colgroup>
      <template />
    </colgroup>
  </table>
);

let el = (
  <table>
    <caption>
      <figcaption>Caption</figcaption>
    </caption>
  </table>
);

let el = (
  <math>
    <mi>x</mi>
    <mo>=</mo>
    <mn>1</mn>
  </math>
);

let el = (
  <math>
    <mfrac>
      <mi>a</mi>
      <mi>b</mi>
    </mfrac>
  </math>
);

let el = (
  <math>
    <semantics>
      <mi>x</mi>
    </semantics>
  </math>
);

let el = (
  <svg>
    <a href="/">
      <path d="" />
    </a>
  </svg>
);

let el = (
  <svg>
    <tr />
  </svg>
);

let el = (
  <svg>
    <a href="/one">
      <a href="/two" />
    </a>
  </svg>
);

let el = (
  <svg>
    <title>
      <b>Hello world!</b>
    </title>
  </svg>
);

let el = (
  <svg>
    <font>
      <a href="/one">
        <a href="/two" />
      </a>
    </font>
  </svg>
);

let el = (
  <math>
    <annotation-xml>
      <a href="/one">
        <a href="/two" />
      </a>
    </annotation-xml>
  </math>
);

let el = (
  <svg>
    <title>
      one
      <br />
      two
    </title>
  </svg>
);

let el = (
  <optgroup label="Group">
    <br />
  </optgroup>
);

let el = (
  <foreignObject>
    <figcaption>Caption</figcaption>
  </foreignObject>
);

let el = (
  <math>
    <clipPath />
  </math>
);

let el = (
  <figure>
    <a href="/x">
      <img src="a.png" />
      <figcaption>Caption</figcaption>
    </a>
  </figure>
);

let el = (
  <figure>
    <div>
      <figcaption>Caption</figcaption>
    </div>
  </figure>
);

let el = (
  <details>
    <div>
      <summary>More</summary>
    </div>
  </details>
);

let el = (
  <div>
    <area shape="rect" coords="0,0,1,1" href="/" />
  </div>
);

let el = (
  <dl>
    <div>
      <dt>term</dt>
      <dd>definition</dd>
    </div>
  </dl>
);

let el = (
  <my-figure>
    <img src="a.png" />
    <figcaption>Caption</figcaption>
  </my-figure>
);

let el = (
  <p>
    <my-widget>Hello world!</my-widget>
  </p>
);

let el = (
  <h1>
    <span>
      <h2>Hello world!</h2>
    </span>
  </h1>
);

let el = (
  <math>
    <mi>x</mi>
  </math>
);

let el = (
  <math>
    <msqrt>
      <mn>2</mn>
    </msqrt>
  </math>
);

let el = (
  <svg>
    <text>Hello world!</text>
  </svg>
);

let el = (
  <svg>
    <foreignObject>
      <div>Hello world!</div>
    </foreignObject>
  </svg>
);

let el = (
  <my-widget>
    <div>Hello world!</div>
  </my-widget>
);

let el = (
  <p>
    <Foo />
  </p>
);

let el = (
  <Foo>
    <hr />
  </Foo>
);

let el = (
  <p>
    <Foo.Bar />
  </p>
);

let el = (
  <Dynamic component={tag}>
    <hr />
  </Dynamic>
);

let el = (
  <p>
    <Show when={condition}>
      <hr />
    </Show>
  </p>
);

let el = (
  <table>
    {items.map((item) => (
      <div>{item}</div>
    ))}
  </table>
);

let el = <p fallback={<hr />}>Hello world!</p>;

let el = (
  <>
    <p>Hello world!</p>
    <hr />
  </>
);

let el = <hr />;

```
<!-- end-doc-gen -->
