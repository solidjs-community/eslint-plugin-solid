import { AST_NODE_TYPES as T } from "@typescript-eslint/experimental-utils";
import { run } from "../ruleTester";
import rule from "../../src/rules/no-innerhtml";

export const cases = run("no-innerhtml", rule, {
  valid: [
    `let el = <div prop1 prop2={2}>Hello world!</div>`,
    `let el = <Box prop1 prop2={2}>Hello world!</Box>`,
    {
      code: `let el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>" />`,
      options: [{ allowStatic: true }],
    },
    {
      code: `let el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />`,
      options: [{ allowStatic: true }],
    },
    {
      code: `let el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>"></div>`,
      options: [{ allowStatic: true }],
    },
  ],
  invalid: [
    {
      code: `let el = <div prop1 prop2={2} innerHTML="<p>Hello</><p>world!</p>" />`,
      errors: [{ messageId: "dangerous" }],
    },
    {
      code: `let el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />`,
      errors: [{ messageId: "dangerous" }],
    },
    {
      code: `let el = <div prop1 prop2={2} innerHTML={Math.random()} />`,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "dangerous" }],
    },
    {
      code: `let el = <div prop1 prop2={2} innerHTML="Hello world!" />`,
      options: [{ allowStatic: true }],
      errors: [
        {
          messageId: "notHtml",
          suggestions: [
            {
              messageId: "useInnerText",
              output: `let el = <div prop1 prop2={2} innerText="Hello world!" />`,
            },
          ],
        },
      ],
    },
    {
      code: `
        let el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            <p>Child element content</p>
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: T.JSXElement }],
    },
    {
      code: `
        let el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            <p>Child element content 1</p>
            <p>Child element context 2</p>
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: T.JSXElement }],
    },
    {
      code: `
        let el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            {"Child text content"}
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: T.JSXElement }],
    },
    {
      code: `
        let el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            {identifier}
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: T.JSXElement }],
    },
    {
      code: `let el = <div dangerouslySetInnerHTML={{ __html: "<p>Hello</p><p>world!</p>" }} />`,
      errors: [{ messageId: "dangerouslySetInnerHTML" }],
      output: `let el = <div innerHTML={"<p>Hello</p><p>world!</p>"} />`,
    },
    {
      code: `let el = <div dangerouslySetInnerHTML={foo} />`,
      errors: [{ messageId: "dangerouslySetInnerHTML" }],
    },
    {
      code: `let el = <div dangerouslySetInnerHTML={{}} />`,
      errors: [{ messageId: "dangerouslySetInnerHTML" }],
    },
  ],
});
