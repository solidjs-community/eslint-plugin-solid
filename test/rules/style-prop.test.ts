import { ruleTester } from "../ruleTester";
import rule from "../../src/rules/style-prop";

ruleTester.run("style-prop", rule, {
  valid: [
    `const el = <div style={{ color: 'red' }}>Hello, world!</div>`,
    `const el = <div style={{ color: 'red', 'background-color': 'green' }}>Hello, world!</div>`,
    `const el = <div style={{ color: "red", "background-color": "green" }}>Hello, world!</div>`,
    `const el = <div style={{ "-webkit-align-content": "center" }}>Hello, world!</div>`,
    `const el = <div style={{ "font-size": "10px" }}>Hello, world!</div>`,
    `const el = <div style={{ "font-size": "0" }}>Hello, world!</div>`,
    `const el = <div STYLE={{ fontSize: 10 }}>Hello, world!</div>`,
    {
      code: `const el = <div style="color: red;" />`,
      options: [{ allowString: true }],
    },
    {
      code: `const el = <div style={\`color: \${themeColor};\`} />`,
      options: [{ allowString: true }],
    },
    {
      code: `const el = <div css={{ color: 'red' }}>Hello, world</div>`,
      options: [{ styleProps: ["style", "css"] }],
    },
    {
      code: `const el = <div style={{ fontSize: 10 }}>Hello, world!</div>`,
      options: [{ styleProps: ["css"] }],
    },
  ],
  invalid: [
    {
      code: `const el = <div style={{ fontSize: '10px' }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp", data: { name: "fontSize" } }],
      output: `const el = <div style={{ "font-size": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style={{ backgroundColor: '10px' }}>Hello, world!</div>`,
      errors: [
        { messageId: "invalidStyleProp", data: { name: "backgroundColor" } },
      ],
      output: `const el = <div style={{ "background-color": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style={{ "-webkitAlignContent": "center" }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp" }],
      output: `const el = <div style={{ "-webkit-align-content": "center" }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style={{ COLOR: '10px' }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp", data: { name: "COLOR" } }],
    },
    {
      code: `const el = <div style={{ unknownStyleProp: '10px' }}>Hello, world!</div>`,
      errors: [
        { messageId: "invalidStyleProp", data: { name: "unknownStyleProp" } },
      ],
    },
    {
      code: `const el = <div css={{ fontSize: '10px' }}>Hello, world!</div>`,
      options: [{ styleProps: ["style", "css"] }],
      errors: [{ messageId: "invalidStyleProp", data: { name: "fontSize" } }],
      output: `const el = <div css={{ "font-size": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div css={{ fontSize: '10px' }}>Hello, world!</div>`,
      options: [{ styleProps: ["css"] }],
      errors: [{ messageId: "invalidStyleProp", data: { name: "fontSize" } }],
      output: `const el = <div css={{ "font-size": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style="font-size: 10px;">Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
      output: `const el = <div style={{"font-size":"10px"}}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style={"font-size: 10px;"}>Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
      output: `const el = <div style={{"font-size":"10px"}}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style="font-size: 10px; missing-value: ;">Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
      output: `const el = <div style={{"font-size":"10px"}}>Hello, world!</div>`,
    },
    {
      code: `const el = <div style="Super invalid CSS! Not CSS at all!">Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
    },
    {
      code: `const el = <div style={\`font-size: 10px;\`}>Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
    },
  ],
});
