import { ruleTester } from "../ruleTester";
import rule from "../../src/rules/no-innerhtml";

ruleTester.run("no-innerhtml", rule, {
  valid: [
    `const el = <div prop1 prop2={2}>Hello world!</div>`,
    `const el = <Box prop1 prop2={2}>Hello world!</Box>`,
    {
      code: `const el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>" />`,
      options: [{ allowStatic: true }],
    },
    {
      code: `const el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />`,
      options: [{ allowStatic: true }],
    },
    {
      code: `const el = <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>"></div>`,
      options: [{ allowStatic: true }],
    },
  ],
  invalid: [
    {
      code: `const el = <div prop1 prop2={2} innerHTML="<p>Hello</><p>world!</p>" />`,
      errors: [{ messageId: "dangerous" }],
    },
    {
      code: `const el = <div prop1 prop2={2} innerHTML={"<p>Hello</p>" + "<p>world!</p>"} />`,
      errors: [{ messageId: "dangerous" }],
    },
    {
      code: `const el = <div prop1 prop2={2} innerHTML={Math.random()} />`,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "dangerous" }],
    },
    {
      code: `const el = <div prop1 prop2={2} innerHTML="Hello world!" />`,
      options: [{ allowStatic: true }],
      errors: [
        {
          messageId: "notHtml",
          suggestions: [
            {
              messageId: "useInnerText",
              output: `const el = <div prop1 prop2={2} innerText="Hello world!" />`,
            },
          ],
        },
      ],
    },
    {
      code: `
        const el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            <p>Child element content</p>
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: "JSXElement" }],
    },
    {
      code: `
        const el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            <p>Child element content 1</p>
            <p>Child element context 2</p>
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: "JSXElement" }],
    },
    {
      code: `
        const el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            {"Child text content"}
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: "JSXElement" }],
    },
    {
      code: `
        const el = (
          <div prop1 prop2={2} innerHTML="<p>Hello</p><p>world!</p>">
            {identifier}
          </div>
        );
      `,
      options: [{ allowStatic: true }],
      errors: [{ messageId: "conflict", type: "JSXElement" }],
    },
  ],
});
