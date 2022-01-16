import { AST_NODE_TYPES as T } from "@typescript-eslint/experimental-utils";
import { run } from "../ruleTester";
import rule from "../../src/rules/reactivity";

export const cases = run("reactivity", rule, {
  valid: [
    // From Solid docs
    // Guides > Learn Solid
    `function MyComponent(props) {
      return <div>Hello {props.name}</div>;
    }
    let el = <MyComponent name="Solid" />;`,

    `const [first, setFirst] = createSignal("JSON");
    const [last, setLast] = createSignal("Bourne");
    createEffect(() => console.log(\`\${first()} \${last()}\`));`,
    // Examples > Basic > Counter

    // Examples > Basic > Simple Todos
    // Basic Reactivity > createSignal
    `let Component = props => {
      return <div>{props.value || "default"}</div>;
    };`,
    `let Component = props => {
      const value = () => props.value || "default";
      return <div>{value()}</div>;
    };`,
    `let Component = props => {
      const value = createMemo(() => props.value || "default");
      return <div>{value()}</div>;
    };`,
    `let Component = _props => {
      const props = mergeProps({ value: "default" }, _props);
      return <div>{props.value}</div>;
    };`,
    `let Component = _props => {
      const [foo, bar, baz] = splitProps(_props, ["foo"], ["bar"]);
      return <div>{foo.foo} {bar.bar} {baz.baz}</div>;
    }`,
    `let Component = () => {
      const [a, setA] = createSignal(1);
      const [b, setB] = createSignal(1);
    
      createEffect(() => {
        console.log(a(), untrack(b));
      });
    }`,
    `function Component(props) {
      const [value, setValue] = createSignal();
      return <div class={props.class}>{value()}</div>;
    }`,
    `function Component(props) {
      const [value, setValue] = createSignal();
      createEffect(() => console.log(value()));
      return <div class={props.class}>{value()}</div>;
    }`,
    `const [value, setValue] = createSignal();
    on(value, () => console.log('hello'));`,
    `const [value, setValue] = createSignal();
    on([value], () => console.log('hello'));`,
    // Derived signals
    `let c = () => {
      const [signal] = createSignal();
      const d = () => {
        const e = () => { // <-- e becomes a derived signal
          signal();
        }
      } // <-- d never uses it
      d(); // <-- this is fine
    };`,
    `const [signal] = createSignal();
    createEffect(() => console.log(signal()));`,
    `const [signal] = createSignal();
    const memo = createMemo(() => signal());`,
    `const el = <button onClick={() => toggleShow(!show())}>
      {show() ? "Hide" : "Show"}
    </button>`,
    // Parse top level JSX
    `const el = <div />`,
    // getOwner/runWithOwner
    `const [signal] = createSignal();
    createEffect(() => {
      const owner = getOwner();
      runWithOwner(owner, () => console.log(signal()));
    });`,
  ],
  invalid: [
    // Untracked signals
    {
      code: `
      const Component = () => {
        const [signal] = createSignal(5);
        console.log(signal());
        return null;
      }`,
      errors: [{ messageId: "untrackedReactive", type: T.CallExpression, line: 4 }],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal(5);
        console.log(signal());
        return <div>{signal()}</div>
      }`,
      errors: [{ messageId: "untrackedReactive", type: T.CallExpression, line: 4 }],
    },
    // Untracked property access
    {
      code: `
      const Component = props => {
        const value = props.value;
        return <div>{value()}</div>;
      }`,
      errors: [{ messageId: "untrackedReactive", type: T.MemberExpression }],
    },
    {
      code: `
      const Component = props => {
        const { value: valueProp } = props;
        const value = createMemo(() => valueProp || "default");
        return <div>{value()}</div>;
      };`,
      errors: [
        { messageId: "untrackedReactive", type: T.Identifier, line: 3, column: 38, endColumn: 43 },
      ],
    },
    {
      code: `
      const Component = props => {
        const valueProp = props.value;
        const value = createMemo(() => valueProp || "default");
        return <div>{value()}</div>;
      };`,
      errors: [
        {
          messageId: "untrackedReactive",
          data: { name: "props" },
          type: T.MemberExpression,
        },
      ],
    },
    // Derived signals
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        const d = () => { // <-- d becomes a derived signal
          signal();
        }
        d(); // not ok
      }`,
      errors: [
        {
          messageId: "untrackedReactive",
          data: { name: "d" },
          type: T.CallExpression,
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        const d = () => { // <-- d becomes a derived signal
          const e = () => { // <-- e becomes a derived signal
            signal();
          }
          e();
        }
        d(); // not ok
      }`,
      errors: [
        {
          messageId: "untrackedReactive",
          data: { name: "d" },
          type: T.CallExpression,
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal1] = createSignal();
        const d = () => { // <-- d becomes a derived signal
          const [signal2] = createSignal();
          const e = () => { // <-- e becomes a derived signal
            signal1();
            signal2();
          }
          e(); // not ok, signal2 is in scope
        }
      }`,
      errors: [
        {
          messageId: "untrackedReactive",
          data: { name: "e" },
          type: T.CallExpression,
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        const foo = () => { // foo becomes a derived signal
          signal();
        }
        const bar = () => { // bar becomes a derived signal
          foo();
        }
        bar(); // not ok
      }`,
      errors: [
        {
          messageId: "untrackedReactive",
          data: { name: "bar" },
          type: T.CallExpression,
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        const memo = createMomo(() => signal());
      }`,
      errors: [{ messageId: "badUnnamedDerivedSignal" }],
    },
    {
      code: `
      const [signal] = createSignal();
      const memo = createMomo(() => signal());`,
      errors: [{ messageId: "badUnnamedDerivedSignal", line: 3, column: 34, endColumn: 36 }],
    },
    // Unused reactives
    {
      code: `
      const Component = () => {
        createSignal();
      }`,
      errors: [
        {
          messageId: "shouldDestructure",
          data: { nth: "first " },
          type: T.CallExpression,
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [, setSignal] = createSignal();
      }`,
      errors: [
        {
          messageId: "shouldDestructure",
          data: { nth: "first " },
          type: T.ArrayPattern,
        },
      ],
    },
    {
      code: `
      const Component = () => {
        createMemo(() => 5);
      }`,
      errors: [
        {
          messageId: "shouldAssign",
          type: T.CallExpression,
        },
      ],
    },
    // Uncalled signals
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        return <div>{signal}</div>
      }`,
      errors: [{ messageId: "badSignal", type: T.Identifier, line: 4 }],
    },
    {
      code: `
      const Component = () => {
        const memo = createMemo(() => 5);
        return <div>{memo}</div>
      }`,
      errors: [{ messageId: "badSignal", type: T.Identifier, line: 4 }],
    },
    // getOwner/runWithOwner
    {
      code: `
      const owner = getOwner();
      const [signal] = createSignal();
      createEffect(() => runWithOwner(owner, () => console.log(signal())));`,
      errors: [{ messageId: "badUnnamedDerivedSignal", line: 4 }],
    },
    {
      code: `
      function Component() {
        const owner = getOwner();
        const [signal] = createSignal();
        createEffect(() => runWithOwner(owner, () => console.log(signal())));
      }`,
      errors: [{ messageId: "badUnnamedDerivedSignal", line: 5 }],
    },
  ],
});
