<!-- AUTO-GENERATED-CONTENT:START (HEADER) -->
# solid/reactivity
Enforce that reactive expressions (props, signals, memos, etc.) are only used in tracked scopes; otherwise, they won't update the view as expected.
This rule is **a warning** by default.

[View source](../src/rules/reactivity.ts) · [View tests](../test/rules/reactivity.test.ts)

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (OPTIONS) -->

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- AUTO-GENERATED-CONTENT:START (CASES) -->
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
  const [signal] = createSignal();
  const memo = createMomo(() => signal());
};
 
const [signal] = createSignal();
const memo = createMomo(() => signal());
 
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
 
const owner = getOwner();
const [signal] = createSignal();
createEffect(() => runWithOwner(owner, () => console.log(signal())));
 
function Component() {
  const owner = getOwner();
  const [signal] = createSignal();
  createEffect(() => runWithOwner(owner, () => console.log(signal())));
}
 
const [photos, setPhotos] = createSignal([]);
createEffect(async () => {
  const res = await fetch(
    "https://jsonplaceholder.typicode.com/photos?_limit=20"
  );
  setPhotos(await res.json());
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

let c = () => {
  const [signal] = createSignal();
  const d = () => {
    const e = () => {
      // <-- e becomes a derived signal
      signal();
    };
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

```
<!-- AUTO-GENERATED-CONTENT:END -->

### Details and Implementation

This rule is the most important rule in the plugin, aiming to significantly
ease Solid's learning curve. Solid's core principle is fine-grained
reactivity, a system of state, memos, and effects that work together to
efficiently update a UI from incoming events. Solid's reactive primitives,
like props, signals, memos, and stores, have to be used in certain lexical
scopes called "tracked scopes" so Solid can understand how to react to any
changes. While this system is more flexible than some other solutions like
React's Rules of Hooks, it can be confusing.

In this rule, we ensure that Solid's reactive primitives are always accessed
in tracked scopes, so changes always propagate as intended.

We do this in a single pass but take advantage of ESLint's ":exit" selector
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
  handled here. The solid/reactivity rule handles it separately.
- Signals (and memos, and derived signals, functions containing signals) eed
  to be called wherever they're used. This rule enforces this because it's
  the only rule that tracks all of these variables.
- On tracking scopes: "Tracking scopes are functions that are passed to
  computations like createEffect or JSX expressions. All callback/render
  function children of control flow are non-tracking. This allows for nesting
  state creation, and better isolates reactions. Solid's compiler uses a
  simple heuristic for reactive wrapping and lazy evaluation of JSX
  expressions. Does it contain a function call, a property access, or JSX?"
- It's not okay to access signals in the same scope they're declared in, but
  it's okay to use them one or more nested functions down. However, that
  makes the nested functions derived signals. Deriving signals doesn't
  "bubble up" forever, though; as soon as you reach a scope where one
  contained reactive primitive was declared, the current function should
  match a tracked scope that expects a function.
- This rule ignores object and class methods completely. Solid is based on
  functions/closures only, and it's uncommon to see methods in Solid code.
