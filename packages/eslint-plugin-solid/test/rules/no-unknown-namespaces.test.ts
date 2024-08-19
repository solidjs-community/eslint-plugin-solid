import { run } from "../ruleTester";
import rule from "../../src/rules/no-unknown-namespaces";

export const cases = run("no-unknown-namespaces", rule, {
  valid: [
    `let el = <div on:click={null} />;`,
    `let el = <div on:focus={null} />;`,
    `let el = <div on:quux />;`,
    `let el = <div oncapture:click={null} />;`,
    `let el = <div oncapture:focus={null} />;`,
    `let el = <div use:X={null} />;`,
    `let el = <div use:X />;`,
    `let el = <div prop:scrollTop="0px" />;`,
    `let el = <div attr:title="title" />;`,
    `let el = <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>`,
    {
      options: [{ allowedNamespaces: ["foo"] }],
      code: `let el = <bar foo="http://www.w3.org/2000/svg" version="1.1" foo:bar="http://www.w3.org/1999/xlink" />`,
    },
  ],
  invalid: [
    {
      code: `let el = <div foo:boo={null} />`,
      errors: [{ messageId: "unknown", data: { namespace: "foo" } }],
    },
    {
      code: `let el = <div bar:car={null} />`,
      errors: [{ messageId: "unknown", data: { namespace: "bar" } }],
    },
    {
      code: `let el = <div style:width="100%" />`,
      errors: [{ messageId: "style", data: { namespace: "style" } }],
    },
    {
      code: `let el = <div style:width={0} />`,
      errors: [{ messageId: "style", data: { namespace: "style" } }],
    },
    {
      code: `let el = <div class:mt-10={true} />`,
      errors: [{ messageId: "style", data: { namespace: "class" } }],
    },
    {
      code: `let el = <div class:mt-10 />`,
      errors: [{ messageId: "style", data: { namespace: "class" } }],
    },
    {
      code: `let el = <Box attr:foo="bar" />`,
      errors: [
        {
          messageId: "component",
          suggestions: [
            {
              messageId: "component-suggest",
              data: { namespace: "attr", name: "foo" },
              output: `let el = <Box foo="bar" />`,
            },
          ],
        },
      ],
    },
    {
      code: `let el = <Box foo:boo={null} />`,
      errors: [
        {
          messageId: "component",
          suggestions: [
            {
              messageId: "component-suggest",
              data: { namespace: "foo", name: "boo" },
              output: `let el = <Box boo={null} />`,
            },
          ],
        },
      ],
    },
  ],
});
