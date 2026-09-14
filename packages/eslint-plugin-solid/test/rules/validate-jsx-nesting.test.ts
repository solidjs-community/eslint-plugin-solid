import { run } from "../ruleTester";
import rule from "../../src/rules/validate-jsx-nesting";

export const cases = run("validate-jsx-nesting", rule, {
  valid: [
    `let el = <div><p>Hello world!</p></div>;`,
    `let el = <p><span>Hello world!</span></p>;`,
    `let el = <p>Hello <em>world</em>!</p>;`,
    `let el = <p>one<br />two</p>;`,
    `let el = <table><tbody><tr><td>1</td></tr></tbody></table>;`,
    `let el = <ul><li>one</li><li>two</li></ul>;`,
    `let el = <select><option>one</option></select>;`,
    // the parser keeps these, so they are not this rule's business even though
    // the spec's content model disallows them
    `let el = <h1><div>Hello world!</div></h1>;`,
    `let el = <div><figcaption>Hello world!</figcaption></div>;`,
    `let el = <div><summary>Hello world!</summary></div>;`,
    `let el = <table><script>{"1"}</script></table>;`,
    `let el = <table><style>{"td{}"}</style></table>;`,
    // MathML and SVG are not HTML content models
    `let el = <math><mi>x</mi><mo>=</mo><mn>1</mn></math>;`,
    `let el = <math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>;`,
    `let el = <math><semantics><mi>x</mi></semantics></math>;`,
    `let el = <svg><a href="/"><path d="" /></a></svg>;`,
    // content-model restrictions the parser doesn't enforce by moving anything
    `let el = <figure><a href="/x"><img src="a.png" /><figcaption>Caption</figcaption></a></figure>;`,
    `let el = <figure><div><figcaption>Caption</figcaption></div></figure>;`,
    `let el = <details><div><summary>More</summary></div></details>;`,
    `let el = <div><area shape="rect" coords="0,0,1,1" href="/" /></div>;`,
    `let el = <dl><div><dt>term</dt><dd>definition</dd></div></dl>;`,
    `let el = <my-figure><img src="a.png" /><figcaption>Caption</figcaption></my-figure>;`,
    `let el = <p><my-widget>Hello world!</my-widget></p>;`,
    // headings close the current node, never an ancestor
    `let el = <h1><span><h2>Hello world!</h2></span></h1>;`,
    `let el = <math><mi>x</mi></math>;`,
    `let el = <math><msqrt><mn>2</mn></msqrt></math>;`,
    `let el = <svg><text>Hello world!</text></svg>;`,
    `let el = <svg><foreignObject><div>Hello world!</div></foreignObject></svg>;`,
    // custom elements can define any content model
    `let el = <my-widget><div>Hello world!</div></my-widget>;`,
    // components can render anything, including a wrapper that makes this legal
    `let el = <p><Foo /></p>;`,
    `let el = <Foo><hr /></Foo>;`,
    `let el = <p><Foo.Bar /></p>;`,
    `let el = <Dynamic component={tag}><hr /></Dynamic>;`,
    // control flow hides what actually wraps the child at runtime
    `let el = <p><Show when={condition}><hr /></Show></p>;`,
    `let el = <table>{items.map((item) => <div>{item}</div>)}</table>;`,
    // a prop that isn't `children` is data, not a child position
    `let el = <p fallback={<hr />}>Hello world!</p>;`,
    // sibling, not nested
    `let el = <><p>Hello world!</p><hr /></>;`,
    // no JSX parent at all
    `let el = <hr />;`,
  ],
  invalid: [
    {
      code: `let el = <p><div>Hello world!</div></p>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "div" } }],
    },
    {
      code: `let el = <p><hr /></p>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "hr" } }],
    },
    {
      code: `let el = <p>Hello <p>world</p>!</p>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "p" } }],
    },
    {
      code: `let el = <table><div>Hello world!</div></table>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "table", child: "div" } }],
    },
    {
      code: `let el = <tr><div>Hello world!</div></tr>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "tr", child: "div" } }],
    },
    {
      code: `let el = <a href="/one"><a href="/two">Hello world!</a></a>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "a", child: "a" } }],
    },
    {
      code: `let el = <button><button>Hello world!</button></button>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "button", child: "button" } }],
    },
    {
      code: `let el = <form><form>Hello world!</form></form>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "form", child: "form" } }],
    },
    {
      code: `let el = <svg><div>Hello world!</div></svg>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "svg", child: "div" } }],
    },
    {
      code: `let el = <table><thead><th>1</th></thead></table>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "thead", child: "th" } }],
    },
    {
      code: `let el = <table><col /></table>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "table", child: "col" } }],
    },
    {
      code: `let el = <div><tr><td>1</td></tr></div>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "div", child: "tr" } }],
    },
    {
      code: `let el = <ul><li>one<li>two</li></li></ul>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "li", child: "li" } }],
    },
    {
      code: `let el = <h1><h2>Hello world!</h2></h1>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "h1", child: "h2" } }],
    },
    {
      code: `let el = <textarea><div>Hello world!</div></textarea>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "textarea", child: "div" } }],
    },
    // a custom element doesn't make table markup legal
    {
      code: `let el = <x-row><td>1</td></x-row>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "x-row", child: "td" } }],
    },
    // these all compile to the same insert() into the same parent
    {
      code: `let el = <p>{<hr />}</p>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "hr" } }],
    },
    {
      code: `let el = <p>{condition && <hr />}</p>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "hr" } }],
    },
    {
      code: `let el = <p>{condition ? <hr /> : <div />}</p>;`,
      errors: [
        { messageId: "invalidNesting", data: { parent: "p", child: "hr" } },
        { messageId: "invalidNesting", data: { parent: "p", child: "div" } },
      ],
    },
    {
      code: `let el = <p>{[<hr />]}</p>;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "hr" } }],
    },
    {
      code: `let el = <p children={<hr />} />;`,
      errors: [{ messageId: "invalidNesting", data: { parent: "p", child: "hr" } }],
    },
    // each level is reported on its own
    {
      code: `let el = <p><div><p><hr /></p></div></p>;`,
      errors: [
        { messageId: "invalidNesting", data: { parent: "p", child: "div" } },
        { messageId: "invalidNesting", data: { parent: "p", child: "hr" } },
      ],
    },
    {
      code: `let el = <p><div /><div /></p>;`,
      errors: [
        { messageId: "invalidNesting", data: { parent: "p", child: "div" } },
        { messageId: "invalidNesting", data: { parent: "p", child: "div" } },
      ],
    },
  ],
});
