<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/reactivity
Enforce that reactivity (props, signals, memos, etc.) is properly used, so changes in those values will be tracked and update the view as expected.
This rule is **a warning** by default.

[View source](../src/rules/reactivity.ts) · [View tests](../test/rules/reactivity.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

## Troubleshooting

Below are a few common patterns that cause warnings, what these warnings mean, and whether these
warnings can be safely ignored.

- **Accessing reactive variables in the component body**

  ```jsx
  function Greeting(props) {
    const text = `Hello, ${props.name}!`;
    //                     ^^^^^^^^^^
    // The reactive variable 'props.name' should be used within JSX, a tracked scope (like
    // createEffect), or inside an event handler function, or else changes will be ignored.

    return <span class="greeting">{text}</span>;
  }
  ```

  Using a prop (or calling a signal, etc.) directly inside of the component body will trigger a
  warning about a real problem and should rarely be ignored. This is because props (and signals,
  etc.) can change over time, but Solid components only run once, so a change to the prop will have
  no effect. For example, if `props.name` is initially equal to `'Alice'`, but is later changed to
  `'Bob'`, the `<Greeting />` component will still display "Hello, Alice!"

  Given that components run once, the way to handle this is to move `props.*` accesses and signal calls
  into the JSX (or certain other places called "tracked scopes"). Alternatively, you can use wrapper functions
  instead, and call those functions in the JSX. For example, either of the following solutions will work
  and eliminate the warning:

  ```jsx
  function Greeting(props) {
    return <span class="greeting">Hello, {props.name}!</span>;
  }
  // or
  function Greeting(props) {
    const text = () => `Hello, ${props.name}!`; // `text` now acts like a signal

    return <span class="greeting">{text()}</span>;
  }
  ```

  <details>
  <summary>Why does this work?</summary>

  Solid's compiler transforms expressions in JSX; it wraps them in a function, and creates an effect
  to track when they've changed in order to update the UI. So `<span>{text()}</span>` becomes
  `<span>{() => text()}</span>`, and `<span>{props.name}</span>` becomes `<span>{() => props.name}</span>`. The `props.name` access works just like a signal call because `.name` is a
  getter function under the hood; a function call in both cases. It's important that the accesses
  happen in the JSX for the tracking to work.
  </details>

- **Initializing state from props**

  ```js
  function Counter(props) {
    const [count, setCount] = createSignal(props.count);
    //                                     ^^^^^^^^^^^
    // The reactive variable 'props.count' should be used within JSX, a tracked scope (like
    // createEffect), or inside an event handler function, or else changes will be ignored.
  }
  ```

  Even when using a prop to initialize a signal, you'll still get the same warning as described
  above. This code ignores any changes to `props.count`, instead of reacting to those changes.

  > React developers: this is equivalent to `const [count, setCount] = useState(props.count)`.

  Though it's often better to use props directly instead of creating new state from props, there are
  cases where this pattern is what you want. You can safely ignore the rule when you are providing
  an "initial" or "default" value to a component ("uncontrolled components" in React).

  That's why there's an escape hatch for this case; any props beginning with `initial` or `default`
  won't trigger this warning. By using the `initial` or `default` prefix, you've shown that you
  intend to ignore updates to that prop. If you can't or don't want to use the prefix, adding an `// eslint-disable-next-line` comment to disable the warning accomplishes the same thing.

  ```js
  const [count, setCount] = createSignal(props.initialCount); // fixed!
  ```

- **Using reactivity with a context provider**

  ```jsx
  const CountContext = createContext();
  function CountProvider(props) {
    const [count, setCount] = createSignal(0);

    return <CountContext.Provider value={count()}>{props.children}</CountContext.Provider>;
    //                                   ^^^^^^^
    // The reactive variable 'count' should be used within JSX, a tracked scope (like
    // createEffect), or inside an event handler function, or else changes will be ignored.
  }
  ```

  Even though `count()` is used in JSX, this warning indicates a real problem and should not be
  ignored. Unlike most props, the `value` prop in a Provider is _not_ a tracked scope, meaning it
  will not react to changes in `count()`. The solution is to [pass the signal
  as-is](https://www.solidjs.com/docs/latest#createcontext), and call it when using `useContext()`.

  ```jsx
  return <CountContext.Provider value={count}>{props.children}</CountContext.Provider>; // fixed!
  ```

  Passing `props` or a store will work, but when passing a property access, it needs to be wrapped
  in a function so that the property access is done only as needed.

- **Passing event handler props directly to native elements**

  ```jsx
  function Button(props) {
    return <button onClick={props.onClick}>{props.children}</button>;
    //                      ^^^^^^^^^^^^^
    // The reactive variable 'props.onClick' should be wrapped in a function for
    // reactivity. This includes event handler bindings on native elements, which
    // are not reactive like other JSX props.
  }
  ```

  This warning indicates a real problem and should not be ignored. Unlike most props, `on*` event
  handlers on native elements are _not_ tracked scopes and don't react to changes in props. In this
  example, if `props.onClick` were to change, clicking the button would run the initial handler, not
  the current one.

  This behavior is by design—instead of running `removeEventListener()` and `addEventListener()`
  each time the handler is changed (which is slow), Solid asks you for an event handler that
  accesses the _current_ prop (or signal, etc.) when called, like the following:

  ```jsx
  return <button onClick={(e) => props.onClick(e)}>{props.children}</button>; // fixed!
  ```

<!-- <details><summary>Less common patterns...</summary>

- **Static props**

  Sometimes, you are _certain_ that a particular prop will _never change._ This is fragile and not
  recommended in most cases.

</details> -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->
 
<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
const Component = () => {
  const [signal] = createSignal(5);
  console.log(signal());
  return null;
};
 
const Component = () => {
  const [signal] = createSignal(5);
  console.log(signal());
  return <div>{signal()}</div>;
};
 
const Component = (props) => {
  const value = props.value;
  return <div>{value()}</div>;
};
 
const Component = (props) => {
  const { value: valueProp } = props;
  const value = createMemo(() => valueProp || "default");
  return <div>{value()}</div>;
};
 
const Component = (props) => {
  const valueProp = props.value;
  const value = createMemo(() => valueProp || "default");
  return <div>{value()}</div>;
};
 
const Component = (props) => {
  const derived = () => props.value;
  const oops = derived();
  return <div>{oops}</div>;
};
 
function Component(something) {
  console.log(something.a);
  return <div />;
}
 
const Component = () => {
  const [signal] = createSignal();
  const d = () => {
    // <-- d becomes a derived signal
    signal();
  };
  d(); // not ok
};
 
const Component = () => {
  const [signal] = createSignal();
  function d() {
    // <-- d becomes a derived signal
    signal();
  }
  d(); // not ok
};
 
const Component = () => {
  const [signal] = createSignal();
  const d = () => {
    // <-- d becomes a derived signal
    const e = () => {
      // <-- e becomes a derived signal
      signal();
    };
    e();
  };
  d(); // not ok
};
 
const Component = () => {
  const [signal1] = createSignal();
  const d = () => {
    // <-- d becomes a derived signal
    const [signal2] = createSignal();
    const e = () => {
      // <-- e becomes a derived signal
      signal1();
      signal2();
    };
    e(); // not ok, signal2 is in scope
  };
};
 
const Component = () => {
  const [signal] = createSignal();
  const foo = () => {
    // foo becomes a derived signal
    signal();
  };
  const bar = () => {
    // bar becomes a derived signal
    foo();
  };
  bar(); // not ok
};
 
const Component = () => {
  createSignal();
};
 
const Component = () => {
  const [, setSignal] = createSignal();
};
 
const Component = () => {
  createMemo(() => 5);
};
 
const Component = () => {
  const [signal] = createSignal();
  return <div>{signal}</div>;
};
 
const Component = () => {
  const memo = createMemo(() => 5);
  return <div>{memo}</div>;
};
 
const Component = () => {
  const [signal] = createSignal();
  return <button type={signal}>Button</button>;
};
 
const Component = () => {
  const [signal] = createSignal();
  return <div>{signal}</div>;
};
 
const Component = () => {
  const [signal] = createSignal("world");
  const memo = createMemo(() => "hello " + signal);
};
 
const Component = () => {
  const [signal] = createSignal("world");
  const memo = createMemo(() => `hello ${signal}`);
};
 
const Component = () => {
  const [signal] = createSignal(5);
  const memo = createMemo(() => -signal);
};
 
const Component = (props) => {
  const [signal] = createSignal(5);
  const memo = createMemo(() => props.array[signal]);
};
 
const Component = (props) => {
  return <div onClick={props.onClick} />;
};
 
const Component = (props) => {
  createEffect(props.theEffect);
};
 
const Component = (props) => {
  return (
    <SomeContext.Provider value={props.value}>
      {props.children}
    </SomeContext.Provider>
  );
};
 
const Component = (props) => {
  return <SomeProvider value={props.value}>{props.children}</SomeProvider>;
};
 
const Component = (props) => {
  const [signal] = createSignal();
  return (
    <SomeContext.Provider value={signal()} someOtherProp={props.foo}>
      {props.children}
    </SomeContext.Provider>
  );
};
 
const owner = getOwner();
const [signal] = createSignal();
createEffect(() => runWithOwner(owner, () => console.log(signal())));
 
function Component() {
  const owner = getOwner();
  const [signal] = createSignal();
  createEffect(() => runWithOwner(owner, () => console.log(signal())));
}
 
const [count, setCount] = createSignal(0);
createEffect(async () => {
  await Promise.resolve();
  console.log(count());
});
 
const [photos, setPhotos] = createSignal([]);
createEffect(async () => {
  const res = await fetch(
    "https://jsonplaceholder.typicode.com/photos?_limit=20"
  );
  setPhotos(await res.json());
});
 
const [signal] = createSignal("red");
css`
  color: ${signal};
`;
 
const [signal] = createSignal("red");
const f = () => signal();
css`
  color: ${f};
`;
 
function createCustomStore() {
  const [store, updateStore] = createStore({});
  return mapArray([], (item) => store.path.to.field);
}
 
const [array] = createSignal([]);
const result = mapArray(array, (item, i) => {
  i();
});
 
const [array] = createSignal([]);
const result = indexArray(array, (item) => {
  item();
});
 
```

### Valid Examples

These snippets don't cause lint errors.

```js
function MyComponent(props) {
  return <div>Hello {props.name}</div>;
}
let el = <MyComponent name="Solid" />;

const [first, setFirst] = createSignal("JSON");
const [last, setLast] = createSignal("Bourne");
createEffect(() => console.log(`${first()} ${last()}`));

let Component = (props) => {
  return <div>{props.value || "default"}</div>;
};

let Component = (props) => {
  const value = () => props.value || "default";
  return <div>{value()}</div>;
};

let Component = (props) => {
  const value = createMemo(() => props.value || "default");
  return <div>{value()}</div>;
};

let Component = (_props) => {
  const props = mergeProps({ value: "default" }, _props);
  return <div>{props.value}</div>;
};

let Component = (_props) => {
  const [foo, bar, baz] = splitProps(_props, ["foo"], ["bar"]);
  return (
    <div>
      {foo.foo} {bar.bar} {baz.baz}
    </div>
  );
};

let Component = () => {
  const [a, setA] = createSignal(1);
  const [b, setB] = createSignal(1);

  createEffect(() => {
    console.log(a(), untrack(b));
  });
};

function Component(props) {
  const [value, setValue] = createSignal();
  return <div class={props.class}>{value()}</div>;
}

function Component(props) {
  const [value, setValue] = createSignal();
  createEffect(() => console.log(value()));
  return <div class={props.class}>{value()}</div>;
}

const [value, setValue] = createSignal();
on(value, () => console.log("hello"));

const [value, setValue] = createSignal();
on([value], () => console.log("hello"));

function Component(props) {
  return <div {...props} />;
}

function Component(props) {
  return <div {...props.nestedProps} />;
}

function Component() {
  const [signal, setSignal] = createSignal({});
  return <div {...signal()} />;
}

let c = () => {
  const [signal] = createSignal();
  const d = () => {
    function e() {
      // <-- e becomes a derived signal
      signal();
    }
  }; // <-- d never uses it
  d(); // <-- this is fine
};

const [signal] = createSignal();
createEffect(() => console.log(signal()));

const [signal] = createSignal();
const memo = createMemo(() => signal());

const el = (
  <button onClick={() => toggleShow(!show())}>
    {show() ? "Hide" : "Show"}
  </button>
);

const [count] = createSignal();
createEffect(() => {
  (() => count())();
});

const [count] = createSignal();
const el = <div>{(() => count())()}</div>;

const el = <div />;

const [signal] = createSignal();
createEffect(() => {
  const owner = getOwner();
  runWithOwner(owner, () => console.log(signal()));
});

const [signal] = createSignal();
createEffect(() => {
  [1, 2].forEach(() => console.log(signal()));
});

function Component(props) {
  createEffect(() => {
    [1, 2].forEach(() => console.log(props.foo));
  });
  return <div />;
}

function Component(bleargh /* doesn't match props regex */) {
  createEffect(() => {
    [1, 2].forEach(() => console.log(bleargh.foo));
  });
  return <div />;
}

const [signal] = createSignal(5);
setTimeout(() => console.log(signal()), 500);
setInterval(() => console.log(signal()), 600);
setImmediate(() => console.log(signal()));
requestAnimationFrame(() => console.log(signal()));
requestIdleCallback(() => console.log(signal()));

const [photos, setPhotos] = createSignal([]);
onMount(async () => {
  const res = await fetch(
    "https://jsonplaceholder.typicode.com/photos?_limit=20"
  );
  setPhotos(await res.json());
});

const [a, setA] = createSignal(1);
const [b] = createSignal(2);
on(b, async () => {
  await delay(1000);
  setA(a() + 1);
});

const Component = (props) => {
  const localRef = () => props.ref;
  const composedRef1 = useComposedRefs(localRef);
  const composedRef2 = useComposedRefs(() => props.ref);
  const composedRef3 = createComposedRefs(localRef);
};

function createFoo(v) {}
const [bar, setBar] = createSignal();
createFoo({ onBar: () => bar() });

const [bar, setBar] = createSignal();
X.createFoo(() => bar());

const [bar, setBar] = createSignal();
X.Y.createFoo(() => bar());

const [signal, setSignal] = createSignal(1);
const element = document.getElementById("id");
element.addEventListener(
  "click",
  () => {
    console.log(signal());
  },
  { once: true }
);

const [signal, setSignal] = createSignal(1);
const element = document.getElementById("id");
element.onclick = () => {
  console.log(signal());
};

function Component() {
  const [signal, setSignal] = createSignal(1);
  return <div onClick={() => console.log(signal())} />;
}

function Component() {
  const [signal, setSignal] = createSignal(1);
  const handler = () => console.log(signal());
  return <div onClick={handler} />;
}

function Component() {
  const [signal, setSignal] = createSignal(1);
  return <div onClick={signal} />;
}

function Component() {
  const [signal, setSignal] = createSignal(1);
  return <div on:click={() => console.log(signal())} />;
}

const Parent = (props) => {
  return <Child onClick={props.onClick} />;
};

const Component = (props) => {
  const [signal] = createSignal();
  return (
    <SomeContext.Provider value={signal}>{props.children}</SomeContext.Provider>
  );
};

function Component(props) {
  const [count, setCount] = useSignal(props.initialCount);
  return <div>{count()}</div>;
}

function Component(props) {
  const [count, setCount] = useSignal(props.defaultCount);
  return <div>{count()}</div>;
}

const [state, setState] = createStore({
  firstName: "Will",
  lastName: "Smith",
  get fullName() {
    return state.firstName + " " + state.lastName;
  },
});

const [signal] = createSignal(5);
untrack(() => {
  console.log(signal());
});

function notAComponent(something) {
  console.log(something.a);
  return <div />;
}

css`
  color: ${(props) => props.color};
`;

html`<div>${(props) => props.name}</div>`;

styled.css`
  color: ${(props) => props.color};
`;

function Component() {
  let canvas;
  return <canvas ref={canvas} />;
}

function Component() {
  let canvas;
  return (
    <canvas
      ref={(c) => {
        canvas = c;
      }}
    />
  );
}

function Component() {
  const [index] = createSignal(0);
  let canvas;
  return (
    <canvas
      ref={(c) => {
        index();
        canvas = c;
      }}
    />
  );
}

function createCustomStore() {
  const [store, updateStore] = createStore({});

  return mapArray(
    // the first argument to mapArray is a tracked scope
    () => store.path.to.field,
    (item) => ({})
  );
}

function createCustomStore() {
  const [store, updateStore] = createStore({});

  return indexArray(
    // the first argument to mapArray is a tracked scope
    () => store.path.to.field,
    (item) => ({})
  );
}

const m = createMemo(() => 5) as Accessor<number>;

const m = createMemo(() => 5)!;

const m = createMemo(() => 5)! as Accessor<number>;

function Component(props) {
  return (
    <div>
      {() => {
        console.log("hello");
        return props.greeting;
      }}
    </div>
  );
}

```
<!-- AUTO-GENERATED-CONTENT:END -->

## Implementation

We analyze in a single pass but take advantage of ESLint's ":exit" selector
to take action both on the way down the tree and on the way back up. At any
point in the traversal, the current node is either at the program scope or
nested in one or more functions (omitting class members). We keep track of
information about reactive primitives and tracked scopes in each function in
the functionStack variable, populating arrays on the way down and analyzing
the information on the way back up. We rely heavily on ESLint's scope analysis
utilities, which lets us look at how each reference of a variable is used.
Luckily, all scope analysis is ready before rules traverse the tree.

Notes:

- Destructuring props in the parameter list breaks reactivity, but isn't
  handled here. The solid/no-destructure rule handles it separately.
- Signals (and memos, and derived signals, functions containing signals) need
  to be called wherever they're used.
- It's not okay to access signals in the same scope they're declared in, but
  it's okay to use them one or more nested functions down. However, that
  makes the nested functions derived signals. Deriving signals doesn't
  "bubble up" forever, though; as soon as you reach a scope where one
  contained reactive primitive was declared, the current function should
  match a tracked scope that expects a function.
- This rule ignores classes. Solid is based on functions/closures only, and
  it's uncommon to see classes with reactivity in Solid code.

## Implementation v2 (in progress)

`solid/reactivity` has been public for exactly one year (!) at the time of writing, and after lots
of feedback, testing, and changes, I've noticed a few problems with its first implementation:

- **Hard to change.** All of the data structure, analysis, and reporting code is colocated in a
  single file with all the cases for detecting signals, props, and tracked scopes based on Solid
  APIs. There's a few edge cases where detection code is mixed with analysis code. This makes it
  hard for contributors to make PRs and hard for others to be able to maintain it.
- **Limited to variables.** The analysis code relies heavily on ESLint's `ScopeManager` and scope
  utilities, and therefore it can only deal with variable references, not implicitly reactive
  expressions.
- **Non-extensible.** Since detection code is hardcoded in the `reactivity.ts` file, it is plainly
  not possible for users to mark certain APIs as reactive in some way.
- **Susceptible to timing issues.** I'm very proud of the rule's stack-based algorithm for running
  signal/props/tracked scope detection and reactivity analysis in a single pass. Its performance is
  going to be extremely difficult to beat. But the single-pass approach puts complex requirements on
  the detection phase—signals and props have to be marked before nested `function:exit`s, relying on
  initialization before usage in source order. That's not a requirement I feel comfortable putting on
  plugin authors, or really even myself in a few months.

So, I've decided to partially rewrite the rule with a plugin architecture to alleviate these issues.
Both the core detection code and any plugins to alter detection will use the same API.

### Ease of change and extensibility: Plugins (Customizations)

`solid/reactivity`, itself part of an ESLint plugin, will support plugins of its own.

`eslint-plugin-solid` will expose a CLI command `eslint-plugin-solid` that searches
`package.json` files in the current working directory and its `node_modules` for a
`"solid/reactivity"` key at the top level (raw string search first for perf). This key will be expected to
contain a relative path to a CommonJS or native ESM file, accessible from requiring a subpath of the
module. For example:

```ts
const packageJson = { "solid/reactivity": "./reactivity-plugin.js" };
require.resolve(`${packageJson.name}/${packageJson["solid/reactivity"]}`);
// path to reactivity plugin
```

The command will not run any code in `node_modules`; it will just print out an example ESLint config for
the `solid/reactivity` rule, configured to load all plugins found. For example:

```json
"solid/reactivity": [1, {
  "plugins": ["./node_modules/some-module-with-plugin/solid-reactivity-plugin.cjs"]
}]
```

This code can be inspected to ensure it matches expections, or edited to add additional paths to
more plugins. You can manually configure a particular path as a plugin without running the CLI at
all. At runtime, any plugins configured will be loaded and run alongside the base rules. Custom
hooks (`use*`/`create*`) from imported from these packages will not be treated permissively, others
will.

> `eslint-plugin-solid` will **not** automatically load plugins. They must be preconfigured in an
> ESLint config file.

### Expression Support

Having detection code being moved to plugins and an API boundary lets us put reference tracking into
the analysis code, so analyzing arbitrary expressions for reactivity becomes easier. Instead of
using `TSESLint.Scope.Reference`s only, a custom data structure can be built to handle any `Node` from
the plugin API.

### Timing

This is a good opportunity to transition from a stack-based algorithm, where information is lost
after the exit pass, to a tree-based algorithm that can capture all reactivity information in a data
structure. By using the built tree to walk through the final analysis, and colocating references
with their associated scopes, performance should stay good. The reactivity rule could then power
an editor plugin to show signals, tracked scopes, etc.
