import { AST_NODE_TYPES as T } from "@typescript-eslint/utils";
import { run } from "../ruleTester";
import rule from "../../src/rules/reactivity";

// Don't bother checking for imports for every test
jest.mock("../../src/utils", () => {
  return {
    ...jest.requireActual("../../src/utils"),
    trackImports: () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const handleImportDeclaration = () => {};
      const matchImport = (imports: string | Array<string>, str: string) => {
        const importArr = Array.isArray(imports) ? imports : [imports];
        return importArr.includes(str);
      };
      return { matchImport, handleImportDeclaration };
    },
  };
});

export const cases = run("reactivity", rule, {
  valid: [
    `function MyComponent(props) {
      return <div>Hello {props.name}</div>;
    }
    let el = <MyComponent name="Solid" />;`,

    `const [first, setFirst] = createSignal("JSON");
    const [last, setLast] = createSignal("Bourne");
    createEffect(() => console.log(\`\${first()} \${last()}\`));`,
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
    `const [count] = createSignal();
    createEffect(() => {
      (() => count())()
    })`,
    `const [count] = createSignal();
    const el = <div>{(() => count())()}</div>`,
    // Parse top level JSX
    `const el = <div />`,
    // getOwner/runWithOwner
    `const [signal] = createSignal();
    createEffect(() => {
      const owner = getOwner();
      runWithOwner(owner, () => console.log(signal()));
    });`,
    // Sync callbacks
    `const [signal] = createSignal();
    createEffect(() => {
      [1, 2].forEach(() => console.log(signal()));
    });`,
    `function Component(props) {
      createEffect(() => {
        [1, 2].forEach(() => console.log(props.foo));
      });
      return <div />;
    }`,
    `function Component(bleargh /* doesn't match props regex */) {
      createEffect(() => {
        [1, 2].forEach(() => console.log(bleargh.foo));
      });
      return <div />;
    }`,
    // Timers
    `const [signal] = createSignal(5);
    setTimeout(() => console.log(signal()), 500);
    setInterval(() => console.log(signal()), 600);
    setImmediate(() => console.log(signal()));
    requestAnimationFrame(() => console.log(signal()));
    requestIdleCallback(() => console.log(signal()));`,
    // Async tracking scope exceptions
    `const [photos, setPhotos] = createSignal([]);
    onMount(async () => {
      const res = await fetch("https://jsonplaceholder.typicode.com/photos?_limit=20");
      setPhotos(await res.json());
    });`,
    `const [a, setA] = createSignal(1);
    const [b] = createSignal(2);
    on(b, async () => { await delay(1000); setA(a() + 1) });`,
    `const Component = (props) => {
      const localRef = () => props.ref;
      // custom hooks
      const composedRef1 = useComposedRefs(localRef);
      const composedRef2 = useComposedRefs(() => props.ref);
      const composedRef3 = createComposedRefs(localRef);
    }`,
    // Event listeners
    `const [signal, setSignal] = createSignal(1);
    const element = document.getElementById("id");
    element.addEventListener("click", () => {
      console.log(signal());
    }, { once: true });`,
    `const [signal, setSignal] = createSignal(1);
    const element = document.getElementById("id");
    element.onclick = () => {
      console.log(signal());
    };`,
    `function Component() {
      const [signal, setSignal] = createSignal(1);
      return <div onClick={() => console.log(signal())} />;
    }`,
    `function Component() {
      const [signal, setSignal] = createSignal(1);
      return <div on:click={() => console.log(signal())} />;
    }`,
    // Don't warn on using props.initial* for initialization
    `function Component(props) {
      const [count, setCount] = useSignal(props.initialCount);
      return <div>{count()}</div>;
    }`,
    // Store getters
    `const [state, setState] = createStore({
      firstName: 'Will',
      lastName: 'Smith',
      get fullName() {
        return state.firstName + " " + state.lastName;
      }
    });`,
    // untrack()
    `const [signal] = createSignal(5);
    untrack(() => {
      console.log(signal());
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
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        return <button type={signal}>Button</button>
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
    // Async tracking scopes
    {
      code: `
      const [count, setCount] = createSignal(0);
      createEffect(async () => {
        await Promise.resolve();
        console.log(count());
      });`,
      errors: [{ messageId: "noAsyncTrackedScope", line: 3 }],
    },
    {
      code: `
      const [photos, setPhotos] = createSignal([]);
      createEffect(async () => {
        const res = await fetch("https://jsonplaceholder.typicode.com/photos?_limit=20");
        setPhotos(await res.json());
      });`,
      errors: [{ messageId: "noAsyncTrackedScope", line: 3 }],
    },
  ],
});
