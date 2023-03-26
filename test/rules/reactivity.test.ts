import { AST_NODE_TYPES as T } from "@typescript-eslint/utils";
import { run, tsOnlyTest } from "../ruleTester";
import rule from "../../src/rules/reactivity";

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
    // spreading props
    `function Component(props) {
      return <div {...props} />;
    }`,
    `function Component(props) {
      return <div {...props.nestedProps} />;
    }`,
    `function Component() {
      const [signal, setSignal] = createSignal({});
      return <div {...signal()} />;
    }`,
    // Derived signals
    `let c = () => {
      const [signal] = createSignal();
      const d = () => {
        function e() { // <-- e becomes a derived signal
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
    `const [count, setCount] = createSignal();
    const el = <button type="button" onClick={() => setCount(count() + 1)}>Increment</button>;`,
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
    // Observers from Standard Web APIs
    `const [signal] = createSignal(5);
    new IntersectionObserver(() => console.log(signal()));
    new MutationObserver(() => console.log(signal()));
    new PerformanceObserver(() => console.log(signal()));
    new ReportingObserver(() => console.log(signal()));
    new ResizeObserver(() => console.log(signal()));`,
    // Async tracking scope exceptions
    `const [photos, setPhotos] = createSignal([]);
    onMount(async () => {
      const res = await fetch("https://jsonplaceholder.typicode.com/photos?_limit=20");
      setPhotos(await res.json());
    });`,
    `const [a, setA] = createSignal(1);
    const [b] = createSignal(2);
    on(b, async () => { await delay(1000); setA(a() + 1) });`,
    // Custom hooks
    `const Component = (props) => {
      const localRef = () => props.ref;
      const composedRef1 = useComposedRefs(localRef);
      const composedRef2 = useComposedRefs(() => props.ref);
      const composedRef3 = createComposedRefs(localRef);
    }`,
    `function createFoo(v) {}
    const [bar, setBar] = createSignal();
    createFoo({ onBar: () => bar() });`,
    `const [bar, setBar] = createSignal();
    X.createFoo(() => bar());`,
    `const [bar, setBar] = createSignal();
    X . Y\n. createFoo(() => bar());`,
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
      const handler = () => console.log(signal());
      return <div onClick={handler} />;
    }`,
    `function Component() {
      const [signal, setSignal] = createSignal(1);
      return <div onClick={signal} />;
    }`,
    `function Component() {
      const [signal, setSignal] = createSignal(1);
      return <div on:click={() => console.log(signal())} />;
    }`,
    // event listeners are reactive on components
    `const Parent = props => {
      return <Child onClick={props.onClick} />;
    }`,
    // Pass reactive variables as-is into provider value prop
    `const Component = props => {
      const [signal] = createSignal();
      return <SomeContext.Provider value={signal}>{props.children}</SomeContext.Provider>;
    }`,
    // Don't warn on using props.initial* or props.default* for initialization
    `function Component(props) {
      const [count, setCount] = useSignal(props.initialCount);
      return <div>{count()}</div>;
    }`,
    `function Component(props) {
      const [count, setCount] = useSignal(props.defaultCount);
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
    // has JSX, but lowercase function and not named props => don't treat first parameter as props
    `function notAComponent(something) {
      console.log(something.a);
      return <div />;
    }`,
    // function expression inside tagged template literal expression is tracked scope
    "css`color: ${props => props.color}`;",
    "html`<div>${props => props.name}</div>`;",
    "styled.css`color: ${props => props.color};`",
    // refs
    `function Component() {
      let canvas;
      return <canvas ref={canvas} />;
    }`,
    `function Component() {
      let canvas;
      return (
        <canvas ref={c => {
          canvas = c;
        }} />
      );
    }`,
    `function Component() {
      const [index] = createSignal(0);
      let canvas;
      return (
        <canvas ref={c => {
          index();
          canvas = c;
        }} />
      );
    }`,
    // mapArray()
    `function createCustomStore() {
      const [store, updateStore] = createStore({});

      return mapArray(
        // the first argument to mapArray is a tracked scope
        () => store.path.to.field,
        (item) => ({})
      );
    }`,
    `function createCustomStore() {
      const [store, updateStore] = createStore({});

      return indexArray(
        // the first argument to mapArray is a tracked scope
        () => store.path.to.field,
        (item) => ({})
      );
    }`,
    // type casting
    {
      code: `const m = createMemo(() => 5) as Accessor<number>;`,
      ...tsOnlyTest,
    },
    {
      code: `const m = createMemo(() => 5)!;`,
      ...tsOnlyTest,
    },
    {
      code: `const m = createMemo(() => 5)! as Accessor<number>;`,
      ...tsOnlyTest,
    },
    {
      code: `const m = createMemo(() => 5) satisfies Accessor<number>;`,
      ...tsOnlyTest,
    },
    // functions in JSXExpressionContainers
    `function Component(props) {
      return (
        <div>{() => {
          console.log('hello');
          return props.greeting;
        }}</div>
      );
    }`,
    // static* prefix for props
    `function Component(props) {
      const value = props.staticValue;
    }`,
    `function Component() {
      const staticValue = () => props.value;
      const value = staticValue();
    }`,
    // observable
    `function Component(props) {
      const count$ = observable(() => props.count);
      return <div />;
    }`,
    `const [signal, setSignal] = createSignal(0);
    const value$ = observable(signal);`,
    // use: functions
    `let someHook;
    function Component(props) {
      return <div use:someHook={() => props.count} />;
    }`,
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
          data: { name: "props.value" },
          type: T.MemberExpression,
        },
      ],
    },
    // mark `props` as props by name before we've determined if Component is a component in :exit
    {
      code: `
      const Component = props => {
        const derived = () => props.value;
        const oops = derived();
        return <div>{oops}</div>;
      }`,
      errors: [
        {
          messageId: "untrackedReactive",
          data: { name: "derived" },
          type: T.CallExpression,
        },
      ],
    },
    // treat first parameter of uppercase function with JSX as a props
    {
      code: `
      function Component(something) {
        console.log(something.a);
        return <div />;
      }`,
      errors: [{ messageId: "untrackedReactive", type: T.MemberExpression }],
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
        function d() { // <-- d becomes a derived signal
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
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "JSX" },
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const memo = createMemo(() => 5);
        return <div>{memo}</div>
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "memo", where: "JSX" },
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        return <button type={signal}>Button</button>
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "JSX" },
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal();
        return <div>{signal}</div>
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "JSX" },
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal("world");
        const memo = createMemo(() => "hello " + signal)
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "arithmetic or comparisons" },
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal("world");
        const memo = createMemo(() => \`hello \${signal}\`)
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "template literals" },
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal(5);
        const memo = createMemo(() => -signal)
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "unary expressions" },
        },
      ],
    },
    {
      code: `
      const Component = (props) => {
        const [signal] = createSignal(5);
        const memo = createMemo(() => props.array[signal])
      }`,
      errors: [
        {
          messageId: "badSignal",
          type: T.Identifier,
          line: 4,
          data: { name: "signal", where: "property accesses" },
        },
      ],
    },
    // event listeners are not rebound on native elements
    {
      code: `
      const Component = props => {
        return <div onClick={props.onClick} />;
      }`,
      errors: [
        {
          messageId: "expectedFunctionGotExpression",
          type: T.MemberExpression,
          line: 3,
          data: { name: "props.onClick" },
        },
      ],
    },
    {
      code: `
      const Component = props => {
        createEffect(props.theEffect);
      }`,
      errors: [
        {
          messageId: "expectedFunctionGotExpression",
          type: T.MemberExpression,
          line: 3,
          data: { name: "props.theEffect" },
        },
      ],
    },
    // provider value passed as-is
    {
      code: `
      const Component = props => {
        return <SomeContext.Provider value={props.value}>{props.children}</SomeContext.Provider>;
      }`,
      errors: [{ messageId: "untrackedReactive", data: { name: "props.value" } }],
    },
    {
      code: `
      const Component = props => {
        return <SomeProvider value={props.value}>{props.children}</SomeProvider>;
      }`,
      errors: [{ messageId: "untrackedReactive", data: { name: "props.value" } }],
    },
    {
      code: `
      const Component = props => {
        const [signal] = createSignal();
        return <SomeContext.Provider value={signal()} someOtherProp={props.foo}>{props.children}</SomeContext.Provider>;
      }`,
      errors: [{ messageId: "untrackedReactive", data: { name: "signal" } }],
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
    // non-function expression inside tagged template literal expression is not tracked scope
    {
      code: `
      const [signal] = createSignal("red");
      css\`color: \${signal}\`;`,
      errors: [{ messageId: "badSignal", line: 3 }],
    },
    {
      code: `
      const [signal] = createSignal("red");
      const f = () => signal();
      css\`color: \${f}\`;`,
      errors: [{ messageId: "badSignal", line: 4 }],
    },
    // mapArray
    {
      code: `
      function createCustomStore() {
        const [store, updateStore] = createStore({});
        return mapArray(
          [],
          (item) => store.path.to.field
        );
      }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `
      const [array] = createSignal([]);
      const result = mapArray(array, (item, i) => {
        i()
      });`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    {
      code: `
      const [array] = createSignal([]);
      const result = indexArray(array, (item) => {
        item()
      });`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    // static* prefix for props
    {
      code: `
      const [signal] = createSignal();
      let el = <Component staticProp={signal()} />;`,
      errors: [{ messageId: "untrackedReactive" }],
    },
  ],
});
