import { run } from "../ruleTester";
import rule from "../../src/rules/self-closing-comp";

export const cases = run("self-closing-comp", rule, {
  valid: [
    `let el = <Component name="Foo" />;`,
    `let el = <Compound.Component name="Foo" />;`,
    `let el = <Component><img src="picture.png" /></Component>;`,
    `let el = <Compound.Component><img src="picture.png" /></Compound.Component>;`,
    `let el = <Component>
      <Component name="Foo" />
    </Component>;`,
    `let el = <Compound.Component>
      <Compound.Component />
    </Compound.Component>`,
    `let el = <Component name="Foo"> </Component>;`,
    `let el = <Compound.Component name="Foo"> </Compound.Component>;`,

    `let el = <Component name="Foo">            </Component>;`,
    `let el = <div>&nbsp;</div>`,
    `let el = <div>{' '}</div>`,
    {
      code: `let el = <div></div>;`,
      options: [{ html: "none" }],
    },
    {
      code: `let el = <img></img>;`,
      options: [{ html: "none" }],
    },
    {
      code: `let el = <div></div>;`,
      options: [{ html: "void" }],
    },
    {
      code: `let el = (
        <div>
        </div>
      )`,
      options: [{ html: "none" }],
    },
    {
      code: `let el = <Component></Component>`,
      options: [{ component: "none" }],
    },
  ],
  invalid: [
    {
      code: `let el = <div></div>;`,
      errors: [{ messageId: "selfClose" }],
      output: `let el = <div />;`,
    },
    {
      code: `let el = <img></img>;`,
      errors: [{ messageId: "selfClose" }],
      output: `let el = <img />;`,
    },
    {
      code: `let el = <div/>;`,
      options: [{ html: "void" }],
      errors: [{ messageId: "dontSelfClose" }],
      output: `let el = <div></div>;`,
    },
    {
      code: `let el = <div />;`,
      options: [{ html: "void" }],
      errors: [{ messageId: "dontSelfClose" }],
      output: `let el = <div></div>;`,
    },
    {
      code: `let el = <img/>;`,
      options: [{ html: "none" }],
      errors: [{ messageId: "dontSelfClose" }],
      output: `let el = <img></img>;`,
    },
    {
      code: `let el = <img />;`,
      options: [{ html: "none" }],
      errors: [{ messageId: "dontSelfClose" }],
      output: `let el = <img></img>;`,
    },
    {
      code: `let el = (
        <div>
        </div>
      );`,
      errors: [{ messageId: "selfClose" }],
      output: `let el = (
        <div />
      );`,
    },
    {
      code: `let el = (
        <Component>
        </Component>
      );`,
      errors: [{ messageId: "selfClose" }],
      output: `let el = (
        <Component />
      );`,
    },
    {
      code: `let el = <Component />;`,
      options: [{ component: "none" }],
      errors: [{ messageId: "dontSelfClose" }],
      output: `let el = <Component></Component>;`,
    },
  ],
});
