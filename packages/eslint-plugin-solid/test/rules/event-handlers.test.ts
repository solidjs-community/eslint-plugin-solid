import { run } from "../ruleTester.js";
import rule from "../../src/rules/event-handlers.js";

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
    `let el = <div onDblClick={() => {}} />;`,
    `const onClick = () => 42;
    let el = <div {...{ onClick }} />;`,
    { code: `let el = <div onclick={onclick} />`, options: [{ ignoreCase: true }] },
    { code: `let el = <div only={only} />`, options: [{ ignoreCase: true }] },
    // Solid 2.0: camelCase handlers with functions are correct
    {
      code: `let el = <button onClick={() => setCount(count() + 1)} />;`,
      settings: { solid: { version: 2 } },
    },
    // Solid 2.0: lowercase on* with a static string is a legitimate literal
    // attribute (e.g. a native inline handler)
    {
      code: `let el = <div onclick="alert('hi')" />;`,
      settings: { solid: { version: 2 } },
    },
    {
      code: `let el = <div only="static" />;`,
      settings: { solid: { version: 2 } },
    },
  ],
  invalid: [
    {
      code: `let el = <div only />`,
      errors: [
        {
          messageId: "detected-attr", // has priority over "naming"/"capitalization"
          data: { name: "only", staticValue: true },
        },
      ],
    },
    {
      code: `let el = <div only={() => {}} />`,
      errors: [
        {
          messageId: "naming",
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
      errors: [{ messageId: "capitalization" }],
      output: `let el = <div onClick={() => {}} />`,
    },
    {
      code: `let el = <div onClIcK={() => {}} />`,
      errors: [{ messageId: "capitalization" }],
      output: `let el = <div onClick={() => {}} />`,
    },
    {
      code: `let el = <div oncLICK={() => {}} />`,
      errors: [{ messageId: "capitalization" }],
      output: `let el = <div onClick={() => {}} />`,
    },
    {
      code: `let el = <div onLy />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: true },
        },
      ],
    },
    {
      code: `let el = <div onLy="string" />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: "string" },
        },
      ],
    },
    {
      code: `let el = <div onLy={5} />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: 5 },
        },
      ],
    },
    {
      code: `let el = <div onLy={"string"} />`,
      errors: [
        {
          messageId: "detected-attr",
          data: { name: "onLy", staticValue: "string" },
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
        },
      ],
    },
    {
      code: `let el = <div onDoubleClick={() => {}} />;`,
      errors: [
        { messageId: "nonstandard", data: { name: "onDoubleClick", fixedName: "onDblClick" } },
      ],
      output: `let el = <div onDblClick={() => {}} />;`,
    },
    {
      code: `let el = <div ondoubleclick={() => {}} />;`,
      errors: [
        { messageId: "nonstandard", data: { name: "ondoubleclick", fixedName: "onDblClick" } },
      ],
      output: `let el = <div onDblClick={() => {}} />;`,
    },
    {
      code: `let el = <div ondblclick={() => {}} />;`,
      errors: [
        { messageId: "capitalization", data: { name: "ondblclick", fixedName: "onDblClick" } },
      ],
      output: `let el = <div onDblClick={() => {}} />;`,
    },
    {
      code: `const handleClick = () => 42;
      let el = <div {...{ onClick: handleClick, foo }} />;`,
      options: [{ warnOnSpread: true }],
      errors: [{ messageId: "spread-handler", data: { name: "onClick" } }],
      output: `const handleClick = () => 42;
      let el = <div {...{  foo }} onClick={handleClick} />;`,
    },
    {
      code: `const handleClick = () => 42;
      let el = <div {...{ foo, onClick: handleClick, }} />;`,
      options: [{ warnOnSpread: true }],
      errors: [{ messageId: "spread-handler", data: { name: "onClick" } }],
      output: `const handleClick = () => 42;
      let el = <div {...{ foo,  }} onClick={handleClick} />;`,
    },
    {
      code: `const handleClick = () => 42;
      let el = <div {...{ onClick: handleClick }} />;`,
      options: [{ warnOnSpread: true }],
      errors: [{ messageId: "spread-handler", data: { name: "onClick" } }],
      output: `const handleClick = () => 42;
      let el = <div  onClick={handleClick} />;`,
    },
    // Solid 2.0: lowercase on* with a function value is a listener that never fires
    {
      code: `let el = <div onclick={() => setCount(1)} />;`,
      settings: { solid: { version: 2 } },
      errors: [
        { messageId: "lowercase-attribute-v2", data: { name: "onclick", fixedName: "onClick" } },
      ],
      output: `let el = <div onClick={() => setCount(1)} />;`,
    },
    {
      code: `let el = <div ondoubleclick={() => {}} />;`,
      settings: { solid: { version: 2 } },
      errors: [
        {
          messageId: "lowercase-attribute-v2",
          data: { name: "ondoubleclick", fixedName: "onDblClick" },
        },
      ],
      output: `let el = <div onDblClick={() => {}} />;`,
    },
    {
      // unknown event: suggestion only, since the intent is ambiguous
      code: `let el = <div onfoobar={() => {}} />;`,
      settings: { solid: { version: 2 } },
      errors: [
        {
          messageId: "lowercase-attribute-v2",
          data: { name: "onfoobar", fixedName: "onFoobar" },
          suggestions: [
            {
              messageId: "make-handler",
              data: { name: "onfoobar", handlerName: "onFoobar" },
              output: `let el = <div onFoobar={() => {}} />;`,
            },
          ],
        },
      ],
    },
    // Solid 2.0: camelCase handler with a static value can't be a listener
    {
      code: `let el = <div onClick="alert('hi')" />;`,
      settings: { solid: { version: 2 } },
      errors: [{ messageId: "static-handler-v2" }],
    },
    {
      // onDoubleClick lowercases to a nonexistent DOM event; fix to onDblClick
      code: `let el = <div onDoubleClick={() => {}} />;`,
      settings: { solid: { version: 2 } },
      errors: [
        { messageId: "nonstandard", data: { name: "onDoubleClick", fixedName: "onDblClick" } },
      ],
      output: `let el = <div onDblClick={() => {}} />;`,
    },
  ],
});
