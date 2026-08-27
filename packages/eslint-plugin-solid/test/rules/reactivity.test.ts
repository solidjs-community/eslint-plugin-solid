import { run, tsOnly } from "../ruleTester";
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
    `const [signal] = createSignal();
    createEffect(() => {
      runWithOwner(undefined, () => console.log(signal()));
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
    `function createFoo(v) {}
    const [bar, setBar] = createSignal();
    createFoo({ onBar() { bar() } });`,
    `function createFoo(v) {}
    const [bar, setBar] = createSignal();
    createFoo(bar);`,
    `function createFoo(v) {}
    const [bar, setBar] = createSignal();
    createFoo([bar]);`,
    {
      code: `function createFoo(v) {}
      const [bar, setBar] = createSignal();
      createFoo({ onBar: () => bar() } as object);`,
      [tsOnly]: true,
    },
    `const [bar, setBar] = createSignal();
    X.createFoo(() => bar());`,
    `const [bar, setBar] = createSignal();
    X . Y\n. createFoo(() => bar());`,
    {
      code: `function customQuery(v) {}
      const [signal, setSignal] = createSignal();
      customQuery(() => signal());`,
      options: [{ customReactiveFunctions: ["customQuery"] }], // only needed when not create*/use*
    },
    // Event listeners
    `const [signal, setSignal] = createSignal(1);
    const element = document.getElementById("id");
    element.addEventListener("click", () => {
      console.log(signal());
    }, { once: true });`,
    `const {0: signal, 1: setSignal} = createSignal(1);
    const element = document.getElementById("id");
    element.onclick = () => {
      console.log(signal());
    };`,
    `const {'0': signal, '1': setSignal} = createSignal(1);
    const element = document.getElementById("id");
    element.onclick = () => {
      console.log(signal());
    };`,
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
    `function Component(props) {
      return <div onClick={e => props.onClick(e)} />;
    }`,
    // event listeners are reactive on components
    `const Parent = props => {
      return <Child onClick={props.onClick} />;
    }`,
    `const Parent = props => {
      return <Child onClick={e => props.onClick(e)} />;
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
      const {0: count, 1: setCount} = useSignal(props.initialCount);
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
    `const {0: state, 1: setState} = createStore({
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
    `function Component() {
      const [canvas, setCanvas] = createSignal();
      return <canvas ref={c => setCanvas(c)} />;
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
      [tsOnly]: true,
    },
    {
      code: `const m = createMemo(() => 5)!;`,
      [tsOnly]: true,
    },
    {
      code: `const m = createMemo(() => 5)! as Accessor<number>;`,
      [tsOnly]: true,
    },
    {
      code: `const m = createMemo(() => 5) satisfies Accessor<number>;`,
      [tsOnly]: true,
    },
    {
      code: `const [s] = createSignal('a' as string)`,
      [tsOnly]: true,
    },
    {
      code: `createFoo('a' as string)`,
      [tsOnly]: true,
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
    // passing function instead of signal
    `const [signal, setSignal] = createSignal();
    let el = <Child foo={() => signal()}></Child>`,
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
    // f*cking insane edge case with multiple functions taking props as sync callbacks (#110)
    `function formObjectDispatch(formObject, action) {
      const { field } = action.payload;
      formObject.findIndex((props) => props.field === field);
      formObject.findIndex((props) => props.field === field);
    }`,
    // === Solid 2.0 APIs ===
    // createProjection returns a readonly derived store
    `function Component() {
      const [todos, setTodos] = createStore([]);
      const selected = createProjection(draft => {
        draft.count = todos.length;
      });
      createEffect(() => console.log(selected.count));
    }`,
    // createOptimistic acts like createSignal
    `function Component(props) {
      const [name, setName] = createOptimistic(() => props.name);
      return <div>{name()}</div>;
    }`,
    // createOptimisticStore acts like createStore
    `function Component() {
      const [state, setState] = createOptimisticStore({ items: [] });
      return <div>{state.items.length}</div>;
    }`,
    // merge replaces mergeProps
    `let Component = _props => {
      const props = merge({ value: "default" }, _props);
      return <div>{props.value}</div>;
    };`,
    // omit replaces splitProps, returning a single props object
    `let Component = props => {
      const rest = omit(props, "value");
      return <div>{rest.other}</div>;
    };`,
    // function-form createSignal/createStore (derived, writable)
    `const [count, setCount] = createSignal(0);
    const [double, setDouble] = createSignal(() => count() * 2);
    createEffect(() => console.log(double()));`,
    `function Component(props) {
      const [derived, setDerived] = createStore(draft => {
        draft.name = props.name;
      });
      return <div>{derived.name}</div>;
    }`,
    // async computations are first-class in 2.0
    `const [id, setId] = createSignal(1);
    const user = createMemo(async () => {
      const response = await fetch(\`/api/users/\${id()}\`);
      return response.json();
    });`,
    // reads before the first await are tracked
    `const [id, setId] = createSignal(1);
    const [format, setFormat] = createSignal("json");
    const user = createMemo(async () => {
      const fmt = format();
      const response = await fetch("/api/users/" + id());
      return fmt === "json" ? response.json() : response.text();
    });`,
    // async event handlers may read reactive values after await (polling is fine)
    `const [count, setCount] = createSignal(0);
    const el = <button onClick={async () => {
      await save();
      console.log(count());
    }} />;`,
    // action callbacks are not tracked scopes; post-yield reads poll current values
    `function Component(props) {
      const save = action(function* () {
        yield api.save();
        console.log(props.value);
      });
      return <button onClick={save}>Save</button>;
    }`,
    // split effects: createEffect(compute, effect)
    `const [count, setCount] = createSignal(0);
    createEffect(() => count(), (value) => {
      console.log(value);
    });`,
    // isPending/latest/resolve take reactive functions
    `function Component(props) {
      const pending = isPending(() => props.user);
      return <div>{latest(() => props.user.name)}</div>;
    }`,
    // onSettled replaces onMount
    `function Component() {
      const [count, setCount] = createSignal(0);
      onSettled(() => {
        console.log(count());
      });
    }`,
    // flush callback runs in the current scope, like batch
    `function Component() {
      const [count, setCount] = createSignal(0);
      createEffect(() => {
        flush(() => console.log(count()));
      });
    }`,
    // repeat takes a count accessor and a map function
    `const [count, setCount] = createSignal(5);
    const items = repeat(() => count(), (index) => index * 2);`,
    // action callbacks may read reactive values and be async/generators
    `function Component(props) {
      const save = action(async () => {
        await postData(props.data);
      });
      return <button onClick={save}>Save</button>;
    }`,
    // <For keyed={false}> passes the item as an accessor (old <Index> shape)
    `function Component(props) {
      return (
        <For each={props.items} keyed={false}>
          {(item, index) => <div data-index={index}>{item()}</div>}
        </For>
      );
    }`,
    // <For keyed={fn}> passes accessors for both params
    `function Component(props) {
      return (
        <For each={props.items} keyed={item => item.id}>
          {(item, index) => <div data-index={index()}>{item().name}</div>}
        </For>
      );
    }`,
    // <For keyed> and <For keyed={true}> behave like 1.x <For>
    `function Component(props) {
      return (
        <For each={props.items} keyed>
          {(item, index) => <div data-index={index()}>{item.name}</div>}
        </For>
      );
    }`,
    // Returned accessors are the custom-primitive contract: the caller
    // decides whether they land in a tracked scope. (#213)
    `const [items, setItems] = createSignal([]);
    function useCartTotal() {
      return () => items().reduce((sum, item) => sum + item.price, 0);
    }`,
    `const [count, setCount] = createSignal(0);
    const useDouble = () => () => count() * 2;`,
    `const [count, setCount] = createSignal(0);
    function useCounter() {
      return function current() { return count(); };
    }`,
    // Snapshot capture opted into by naming convention (#213)
    `const [items, setItems] = createSignal([]);
    function useTotal() {
      const initialItems = items();
      return () => initialItems.length;
    }`,
    // Captured value only used at setup, not by a returned function
    `const [items, setItems] = createSignal([]);
    function useTotal() {
      const list = items();
      console.log(list);
      return () => items().length;
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
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    {
      code: `
      const Component = () => {
        const [signal] = createSignal(5);
        console.log(signal());
        return <div>{signal()}</div>
      }`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    // Untracked property access
    {
      code: `
      const Component = props => {
        const value = props.value;
        return <div>{value()}</div>;
      }`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `
      const Component = props => {
        const { value: valueProp } = props;
        const value = createMemo(() => valueProp || "default");
        return <div>{value()}</div>;
      };`,
      errors: [{ messageId: "untrackedReactive", line: 3, column: 38, endColumn: 43 }],
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
        },
      ],
    },
    {
      code: `
      const Component = props => {
        const [value] = createSignal(props.value);
      }`,
      errors: [{ messageId: "untrackedReactive" }],
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
      errors: [{ messageId: "untrackedReactive" }],
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
        },
      ],
    },
    {
      code: `
      const Component = () => {
        const {2: signal, 3: setSignal} = createSignal();
      }`,
      errors: [
        {
          messageId: "shouldDestructure",
          data: { nth: "first " },
          type: T.ObjectPattern,
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
    // custom hooks
    {
      code: `
      const [signal] = createSignal(0);
      useExample(signal())`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `
      const [signal] = createSignal(0);
      useExample([signal()])`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `
      const [signal] = createSignal(0);
      useExample({ value: signal() })`,
      errors: [{ messageId: "untrackedReactive" }],
    },
    {
      code: `
      const [signal] = createSignal(0);
      useExample((() => signal())())`,
      errors: [{ messageId: "expectedFunctionGotExpression" }],
    },
    // === Solid 2.0 APIs ===
    // merge/omit results are reactive like mergeProps/splitProps
    {
      code: `
      const Component = _props => {
        const props = merge({ value: "default" }, _props);
        const value = props.value;
        return <div>{value}</div>;
      };`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    {
      code: `
      const Component = props => {
        const rest = omit(props, "value");
        console.log(rest.other);
        return null;
      };`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    // createProjection returns a reactive store
    {
      code: `
      const Component = () => {
        const projected = createProjection(draft => {});
        console.log(projected.value);
        return null;
      };`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    // createOptimistic returns a signal pair
    {
      code: `
      const Component = () => {
        const [value, setValue] = createOptimistic(0);
        console.log(value());
        return null;
      };`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    // createOptimisticStore returns a store pair
    {
      code: `
      const Component = () => {
        const [state, setState] = createOptimisticStore({});
        console.log(state.value);
        return null;
      };`,
      errors: [{ messageId: "untrackedReactive", line: 4 }],
    },
    // === reads after suspension in async computations ===
    // signal read after await in an async memo is not tracked
    {
      code: `
      const [id, setId] = createSignal(1);
      const user = createMemo(async () => {
        const response = await fetch("/api/users");
        return response.json() + id();
      });`,
      errors: [{ messageId: "readAfterAwait", line: 5 }],
    },
    // props read after await is not tracked
    {
      code: `
      function Component(props) {
        const data = createMemo(async () => {
          const response = await fetch("/api");
          return response.json() + props.suffix;
        });
        return <div>{data()}</div>;
      }`,
      errors: [{ messageId: "readAfterAwait", line: 5 }],
    },
    // function-form createSignal with a read after await
    {
      code: `
      const [count, setCount] = createSignal(1);
      const [derived, setDerived] = createSignal(async () => {
        await tick();
        return count() * 2;
      });`,
      errors: [{ messageId: "readAfterAwait", line: 5 }],
    },
    // a loop containing an await taints the whole loop body (later iterations
    // read after the previous iteration's suspension), but not the iterated
    // expression, which is evaluated once up front
    {
      code: `
      const [urls, setUrls] = createSignal([]);
      const [weight, setWeight] = createSignal(1);
      const total = createMemo(async () => {
        let sum = 0;
        for (const url of urls()) {
          sum += (await fetch(url)).size * weight();
        }
        return sum;
      });`,
      errors: [{ messageId: "readAfterAwait", line: 7 }],
    },
    // Stale captures: signal read at setup, value captured by a variable a
    // returned function reads — the capture never updates (#213)
    {
      code: `
      const [items, setItems] = createSignal([]);
      function useCartTotal() {
        const list = items();
        return () => list.reduce((sum, item) => sum + item.price, 0);
      }`,
      errors: [{ messageId: "staleCapture", line: 4 }],
    },
    // Derived-through-expression capture is just as stale
    {
      code: `
      const [items, setItems] = createSignal([]);
      function useCount() {
        const total = items().length;
        return () => total;
      }`,
      errors: [{ messageId: "staleCapture", line: 4 }],
    },
    // Functions embedded in returned JSX escape the same way
    {
      code: `
      const [theme, setTheme] = createSignal("dark");
      function Component() {
        const current = theme();
        return <button onClick={() => console.log(current)}>theme</button>;
      }`,
      errors: [{ messageId: "staleCapture", line: 4 }],
    },
    // Implicit arrow return escapes too
    {
      code: `
      const [count, setCount] = createSignal(0);
      function useStale() {
        const value = count();
        return () => value + 1;
      }`,
      errors: [{ messageId: "staleCapture", line: 4 }],
    },
  ],
});
