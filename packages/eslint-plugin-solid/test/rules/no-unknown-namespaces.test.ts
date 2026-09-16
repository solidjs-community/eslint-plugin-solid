import { run } from "../ruleTester.js";
import rule from "../../src/rules/no-unknown-namespaces.js";

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
    // Solid 2.0: any colon-name is a legal literal attribute
    {
      code: `let el = <div foo:boo="literal" />;`,
      settings: { solid: { version: 2 } },
    },
    {
      code: `let el = <div prop:scrollTop="0px" />;`,
      settings: { solid: { version: 2 } },
    },
    {
      code: `let el = <div class:mt-10 style:width="100%" />;`,
      settings: { solid: { version: 2 } },
    },
    {
      code: `let el = <svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#a" /></svg>;`,
      settings: { solid: { version: 2 } },
    },
    {
      // explicitly allowed 1.x prefix is not flagged even in v2
      options: [{ allowedNamespaces: ["use"] }],
      code: `let el = <div use:X={null} />;`,
      settings: { solid: { version: 2 } },
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
    // Solid 2.0: formerly-public prefixes silently render literal attributes
    {
      code: `let el = <div on:click={handler} />;`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "v2Namespace" }],
    },
    {
      code: `let el = <div use:X={null} />;`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "v2Namespace" }],
    },
    {
      code: `let el = <div attr:title="title" />;`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "v2Namespace" }],
    },
    {
      code: `let el = <div bool:disabled={cond()} />;`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "v2Namespace" }],
    },
    {
      code: `let el = <div oncapture:click={handler} />;`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "v2Namespace" }],
    },
  ],
});
