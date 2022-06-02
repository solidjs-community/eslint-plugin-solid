import { AST_NODE_TYPES as T } from "@typescript-eslint/utils";
import { run } from "../ruleTester";
import rule from "../../src/rules/event-handlers";

export const cases = run("event-handlers", rule, {
  valid: [
    `const onfoo = () => 42;
    let el = <div onClick={onfoo} />;`,
    `const string = 'string' + some_func();
    let el = <div onLy={string} />`,
    `function Component(props) {
      return <div onClick={props.onClick} />;
    }`,
    `function Component(props) {
      return <div onFoo={props.onFoo} />;
    }`,
    `let el = <div attr:only={() => {}} />;`,
    `let el = <div onLy={() => {}} />;`,
    `let el = <div on:ly={() => {}} />;`,
    `let el = <foo.bar only="true" />;`,
    { code: `let el = <div onclick={onclick} />`, options: [{ ignoreCase: true }] },
    { code: `let el = <div only={only} />`, options: [{ ignoreCase: true }] },
  ],
  invalid: [
    {
      code: `let el = <div only />`,
      errors: [
        {
          messageId: "detected-attr", // has priority over "naming"/"capitalization"
          type: T.JSXAttribute,
          data: { name: "only", staticValue: true },
        },
      ],
    },
    {
      code: `let el = <div only={() => {}} />`,
      errors: [
        {
          messageId: "naming",
          type: T.JSXIdentifier,
          suggestions: [
            {
              messageId: "make-handler",
              data: { name: "only", handlerName: "onLy" },
              output: `let el = <div onLy={() => {}} />`,
            },
            {
              messageId: "make-attr",
              data: { name: "only", attrName: "attr:only" },
              output: `let el = <div attr:only={() => {}} />`,
            },
          ],
        },
      ],
    },
    {
      code: `let el = <div onclick={() => {}} />`,
      errors: [{ messageId: "capitalization", type: T.JSXIdentifier }],
      output: `let el = <div onClick={() => {}} />`,
    },
    {
      code: `let el = <div onClIcK={() => {}} />`,
      errors: [{ messageId: "capitalization", type: T.JSXIdentifier }],
      output: `let el = <div onClick={() => {}} />`,
    },
    {
      code: `let el = <div oncLICK={() => {}} />`,
      errors: [{ messageId: "capitalization", type: T.JSXIdentifier }],
      output: `let el = <div onClick={() => {}} />`,
    },
    {
      code: `let el = <div onLy />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: true },
          type: T.JSXAttribute,
        },
      ],
    },
    {
      code: `let el = <div onLy="string" />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: "string" },
          type: T.JSXAttribute,
        },
      ],
    },
    {
      code: `let el = <div onLy={5} />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: 5 },
          type: T.JSXAttribute,
        },
      ],
    },
    {
      code: `let el = <div onLy={"string"} />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: "string" },
          type: T.JSXAttribute,
        },
      ],
    },
    {
      code: `
      const string = 'string';
      let el = <div onLy={string} />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: "string" },
          type: T.JSXAttribute,
        },
      ],
    },
  ],
});
