import { run } from "../ruleTester";
import rule from "../../src/rules/components-return-once";

export const cases = run("components-return-once", rule, {
  valid: [
    `
      function Component() {
        const renderContent = () => true ? <div /> : <p />

        return (
          <div>
            {renderContent()}
          </div>
        )
      }
    `,

    `
      function Component() {
        const renderContent = () => {
          const renderInner = () => true ? <div /> : <p />

          return true ? renderInner() : <div />
        }

        return (
          <div>{renderContent()}</div>
        )
      }
    `,

    `function Component() {
      return <div />;
    }`,
    `function someFunc() {
      if (condition) {
        return 5;
      }
      return 10;
    }`,
    `function notAComponent() {
      if (condition) {
        return <div />;
      }
      return <div />;
    }`,
    `callback(() => {
      if (condition) {
        return <div />;
      }
      return <div />;
    });`,
  ],
  invalid: [
    // Early returns
    {
      code: `function Component() {
        if (condition) {
          return <div />;
        };
        return <span />;
      }`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    {
      code: `const Component = () => {
        if (condition) {
          return <div />;
        }
        return <span />;
      }`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    // Balanced ternaries
    {
      code: `function Component() {
  return Math.random() > 0.5 ? <div>Big!</div> : <div>Small!</div>;
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    {
      code: `function Component() {
  return Math.random() > 0.5 ? <div>Big!</div> : "Small!";
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    // Ternaries with clear fallback
    {
      code: `function Component() {
  return Math.random() > 0.5 ? (
    <div>
      Big!
      No, really big!
    </div>
  ) : <div>Small!</div>;
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    // Switch/Match
    {
      code: `function Component(props) {
  return props.cond1 ? (
    <div>Condition 1</div>
  ) : Boolean(props.cond2) ? (
    <div>Not condition 1, but condition 2</div>
  ) : (
    <div>Neither condition 1 or 2</div>
  );
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    // Logical
    {
      code: `function Component(props) {
  return !!props.cond && <div>Conditional</div>;
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    {
      code: `function Component(props) {
  return props.primary || <div>{props.secondaryText}</div>;
}`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
    // HOCs
    {
      code: `HOC(() => {
        if (condition) {
          return <div />;
        }
        return <div />;
      });`,
      errors: [{ messageId: "noEarlyReturn" }],
    },
  ],
});
