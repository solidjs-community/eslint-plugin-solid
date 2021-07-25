import { run } from "../ruleTester";
import rule from "../../src/rules/no-unknown-namespaces";

run("no-unknown-namespaces", rule, {
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
  ],
});
