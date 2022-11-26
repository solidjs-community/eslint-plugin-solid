<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/reactivity
Enforce that reactive expressions (props, signals, memos, etc.) are only used in tracked scopes; otherwise, they won't update the view as expected.
This rule is **a warning** by default.

[View source](../src/rules/reactivity.ts) · [View tests](../test/rules/reactivity.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

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

```
<!-- AUTO-GENERATED-CONTENT:END -->

### Implementation

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
- This rule ignores object and class methods completely. Solid is based on
  functions/closures only, and it's uncommon to see methods in Solid code.
