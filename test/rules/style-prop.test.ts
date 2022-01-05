import { run } from "../ruleTester";
import rule from "../../src/rules/style-prop";

export const cases = run("style-prop", rule, {
  valid: [
    `let el = <div style={{ color: 'red' }}>Hello, world!</div>`,
    `let el = <div style={{ color: 'red', 'background-color': 'green' }}>Hello, world!</div>`,
    `let el = <div style={{ color: "red", "background-color": "green" }}>Hello, world!</div>`,
    `let el = <div style={{ "-webkit-align-content": "center" }}>Hello, world!</div>`,
    `let el = <div style={{ "font-size": "10px" }}>Hello, world!</div>`,
    `let el = <div style={{ "font-size": "0" }}>Hello, world!</div>`,
    `let el = <div STYLE={{ fontSize: 10 }}>Hello, world!</div>`,
    {
      code: `let el = <div style="color: red;" />`,
      options: [{ allowString: true }],
    },
    {
      code: `let el = <div style={\`color: \${themeColor};\`} />`,
      options: [{ allowString: true }],
    },
    {
      code: `let el = <div css={{ color: 'red' }}>Hello, world</div>`,
      options: [{ styleProps: ["style", "css"] }],
    },
    {
      code: `let el = <div style={{ fontSize: 10 }}>Hello, world!</div>`,
      options: [{ styleProps: ["css"] }],
    },
  ],
  invalid: [
    {
      code: `let el = <div style={{ fontSize: '10px' }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp", data: { name: "fontSize" } }],
      output: `let el = <div style={{ "font-size": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style={{ backgroundColor: '10px' }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp", data: { name: "backgroundColor" } }],
      output: `let el = <div style={{ "background-color": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style={{ "-webkitAlignContent": "center" }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp" }],
      output: `let el = <div style={{ "-webkit-align-content": "center" }}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style={{ COLOR: '10px' }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp", data: { name: "COLOR" } }],
    },
    {
      code: `let el = <div style={{ unknownStyleProp: '10px' }}>Hello, world!</div>`,
      errors: [{ messageId: "invalidStyleProp", data: { name: "unknownStyleProp" } }],
    },
    {
      code: `let el = <div css={{ fontSize: '10px' }}>Hello, world!</div>`,
      options: [{ styleProps: ["style", "css"] }],
      errors: [{ messageId: "invalidStyleProp", data: { name: "fontSize" } }],
      output: `let el = <div css={{ "font-size": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `let el = <div css={{ fontSize: '10px' }}>Hello, world!</div>`,
      options: [{ styleProps: ["css"] }],
      errors: [{ messageId: "invalidStyleProp", data: { name: "fontSize" } }],
      output: `let el = <div css={{ "font-size": '10px' }}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style="font-size: 10px;">Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
      output: `let el = <div style={{"font-size":"10px"}}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style={"font-size: 10px;"}>Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
      output: `let el = <div style={{"font-size":"10px"}}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style="font-size: 10px; missing-value: ;">Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
      output: `let el = <div style={{"font-size":"10px"}}>Hello, world!</div>`,
    },
    {
      code: `let el = <div style="Super invalid CSS! Not CSS at all!">Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
    },
    {
      code: `let el = <div style={\`font-size: 10px;\`}>Hello, world!</div>`,
      errors: [{ messageId: "stringStyle" }],
    },
    {
      code: `let el = <div style={{ 'font-size': 10 }}>Hello, world!</div>`,
      errors: [{ messageId: "numericStyleValue" }],
    },
    {
      code: `let el = <div style={{ 'margin-top': -10 }}>Hello, world!</div>`,
      errors: [{ messageId: "numericStyleValue" }],
    },
    {
      code: `let el = <div style={{ padding: 0 }}>Hello, world!</div>`,
      errors: [{ messageId: "zeroStyleValue" }],
      output: `let el = <div style={{ padding: "0" }}>Hello, world!</div>`,
    },
  ],
});
