<!-- doc-gen HEADER -->
# solid/action-yield-after-await
Require a bare yield after await in Solid action generators.
This rule is **off** by default.

[View source](../src/rules/action-yield-after-await.ts) · [View tests](../test/rules/action-yield-after-await.test.ts)
<!-- end-doc-gen -->

Solid 2 actions re-enter their transaction after a `yield`. An async generator's internal
`await` continuation runs outside that transaction, so writes and reader creation there can
commit early or hang. Enable this rule explicitly:

```js
{
  rules: { "solid/action-yield-after-await": "error" }
}
```

```js
import { action } from "solid-js";

const save = action(async function* () {
  const result = await api.save();
  yield;
  setResult(result);
  yield until(ready);
});
```

The rule recognizes direct async generator arguments to `action` imported from Solid module
sources, including `solid-js`, `@solidjs/signals`, and modules registered through
`settings.solid.moduleSources`. Named aliases and namespace imports are supported. Shadowed
bindings and awaits in nested functions are ignored. Transparent TypeScript `as`, `satisfies`,
and non-null wrappers around the generator or await do not change the checks. Separately
declared generators and wrapper APIs are outside its scope. Re-export modules must be
registered through the existing module-source setting. No preset enables this rule.

A following `yield value` is not a bare yield: its operand executes before the transaction is
re-entered. Only a directly yielded await is allowed (`yield await promise`, also with
transparent TypeScript wrappers). Calls such as `yield until(await ready())` and
`yield setFoo(await api())` are reported without autofixes: their calls run after the await
and before generator re-entry. Delegated `yield* await promise` is not this exception.

Autofixes insert `yield;` after standalone `await` statements, single identifier declarations
initialized by an await, or plain assignments to declared local identifiers (`r = await api()`),
in blocks or switch cases. A following bare yield makes those forms valid, including local
assignments in try/catch blocks. Semicolons are inserted when needed. Member assignments can
invoke setters before the boundary and are reported without fixes, even with a following yield.
Other forms are reported without autofixes or suggestions: unbraced branches, labels, loop
headers with explicit awaits, return/throw, destructuring, multiple declarators, compound or
unresolved identifier assignments, and expressions that do more work after an await. Refactor
those manually so that reactive work happens after a bare yield. Nested awaits may require separate suspension points;
a yield after the enclosing statement does not protect work between them.

This rule covers explicit await expressions. Implicit suspension in `for await` iteration,
async generator delegation, and `await using` disposal is outside its scope; a clean lint result
does not validate transaction boundaries for those operations. Explicit awaits inside their
bodies or initializers are still checked. Handling implicit suspension requires a separate
contract and analysis.

See the [Solid action contract](https://github.com/solidjs/solid/blob/next/packages/signals/src/core/action.ts)
and [issue #229](https://github.com/solidjs-community/eslint-plugin-solid/issues/229).

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and some can be auto-fixed.

```js
import { action } from "solid-js";
action(async function* () {
  await api();
  write();
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
  write();
});

import { action } from "solid-js";
action(async function* () {
  await api([, 1]);
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api([, 1]);
  yield;
});

import { action } from "solid-js";
action(async function* () {
  await run(async () => {
    await api();
  });
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await run(async () => {
    await api();
  });
  yield;
});

import { action } from "solid-js";
action(async function* () {
  const r = await api();
  write(r);
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  const r = await api();
  yield;
  write(r);
});

import { action } from "solid-js";
action(async function* () {
  await api();
  yield until(ready);
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
  yield until(ready);
});

import { action } from "solid-js";
action(async function* () {
  await api();
  write();
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
  write();
});

import { action } from "solid-js";
action(async function* () {
  await api(); // comment
  write();
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield; // comment
  write();
});

import { action } from "solid-js";
action(async function* () {
  if (ok) {
    await api();
  }
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  if (ok) {
    await api();
    yield;
  }
});

import { action } from "solid-js";
action(async function* () {
  while (ok) {
    await api();
  }
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  while (ok) {
    await api();
    yield;
  }
});

import { action } from "solid-js";
action(async function* () {
  switch (key) {
    case 1:
      await api();
      break;
  }
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  switch (key) {
    case 1:
      await api();
      yield;
      break;
  }
});

import { action } from "solid-js";
action(async function* () {
  try {
    await api();
  } finally {
    clean();
  }
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  try {
    await api();
    yield;
  } finally {
    clean();
  }
});

import { action } from "solid-js";
action(async function* () {
  if (await api()) {
    write();
  }
  yield;
});

import { action } from "solid-js";
action(async function* () {
  while (await api()) {
    write();
  }
});

import { action } from "solid-js";
action(async function* () {
  for (; await api(); ) {
    write();
  }
});

import { action } from "solid-js";
action(async function* () {
  return await api();
});

import { action } from "solid-js";
action(async function* () {
  throw await api();
});

import { action } from "solid-js";
action(async function* () {
  use(await api());
  yield;
});

import { action } from "solid-js";
action(async function* () {
  const r = (await api()) + write();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  const r = await api(),
    s = write();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  if (ok) await api();
});

import { action } from "solid-js";
action(async function* () {
  label: await api();
});

import { action } from "solid-js";
action(async function* () {
  const { r } = await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  if (ok) await api();
  else other();
});

import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
  yield;
});

import { action } from "solid-js";
action(async function* () {
  await api();
  yield* other();
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
  yield* other();
});

import { action } from "solid-js";
action(async function* () {
  for (let r = await api(); ok; next()) {}
});

import { action } from "solid-js";
action(async function* () {
  do {} while (await api());
});

import { action } from "solid-js";
action(async function* () {
  switch (await api()) {
    default:
      break;
  }
});

import { action } from "solid-js";
action(async function* () {
  const r = await api(await other());
});

import { action } from "solid-js";
action(async function* () {
  yield until(await ready());
});

import { action } from "solid-js";
action(async function* () {
  yield setFoo(await api());
});

import { action } from "solid-js";
action(async function* () {
  yield await api(await other());
});

import { action } from "solid-js";
action(async function* () {
  yield* await api();
});

import { action } from "solid-js";
action(async function* () {
  r = await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  obj[key()] = await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  let r;
  try {
    r = await api();
  } catch (e) {
    recover(e);
  }
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  let r;
  try {
    r = await api();
    yield;
  } catch (e) {
    recover(e);
  }
});

import { action } from "my-renderer";
action(async function* () {
  await api();
});
// after eslint --fix:
import { action } from "my-renderer";
action(async function* () {
  await api();
  yield;
});

import { action } from "solid-js";
action(
  (async function* () {
    const r = (await api())!;
  } satisfies Function)!
);
// after eslint --fix:
import { action } from "solid-js";
action(
  (async function* () {
    const r = (await api())!;
    yield;
  } satisfies Function)!
);

import { action } from "solid-js";
action(async function* () {
  yield (await api()) + write();
});

import { action } from "solid-js";
action(async function* () {
  obj.r = await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  let r;
  r += await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  let r;
  r = await api();
  write(r);
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  let r;
  r = await api();
  yield;
  write(r);
});

import { action } from "solid-js";
action(async function* () {
  for await (const r of stream) {
    await api();
  }
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  for await (const r of stream) {
    await api();
    yield;
  }
});

import { action as act } from "@solidjs/signals";
act(async function* () {
  await api();
});
// after eslint --fix:
import { action as act } from "@solidjs/signals";
act(async function* () {
  await api();
  yield;
});

import * as Solid from "my-renderer";
Solid.action(async function* () {
  await api();
});
// after eslint --fix:
import * as Solid from "my-renderer";
Solid.action(async function* () {
  await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  await api();
} as any);
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
} as any);

import { action } from "solid-js";
action(async function* () {
  yield until((await ready()) as boolean);
});

import { action as act } from "solid-js";
act(async function* () {
  await api();
});
// after eslint --fix:
import { action as act } from "solid-js";
act(async function* () {
  await api();
  yield;
});

import * as Solid from "solid-js";
Solid.action(async function* () {
  await api();
});
// after eslint --fix:
import * as Solid from "solid-js";
Solid.action(async function* () {
  await api();
  yield;
});

import * as Solid from "solid-js";
Solid["action"](async function* () {
  await api();
});
// after eslint --fix:
import * as Solid from "solid-js";
Solid["action"](async function* () {
  await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  const r = (await api()) as string;
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  const r = (await api()) as string;
  yield;
});

import { action } from "solid-js";
action(async function* () {
  await api();
  await other();
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
  await other();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  const r = await await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  action(async function* () {
    await api();
  });
});
// after eslint --fix:
import { action } from "solid-js";
action(async function* () {
  action(async function* () {
    await api();
    yield;
  });
});

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { action } from "solid-js";
action(async function* () {
  let r;
  try {
    r = await api();
    yield;
  } catch (e) {
    r = await fallback();
    yield;
  }
  write(r);
});

import { action } from "solid-js";
action(async function* () {
  for await (const r of stream) {
    write(r);
  }
});

import { action } from "solid-js";
action(async function* () {
  yield (await api()) as string;
});

import { action } from "solid-js";
action(async function* () {
  await api();
  yield;
} as any);

import { action } from "solid-js";
action(async function* () {
  const r = await api();
  yield;
  write(r);
});

import { action } from "solid-js";
action(async function* () {
  await api();
  /* boundary */ yield;
  yield until(ready);
});

import { action } from "solid-js";
action(async function* () {
  yield api();
  const r = yield api();
  yield await api();
});

import { action } from "solid-js";
action(async function* () {
  if (ok) {
    await api();
    yield;
  } else {
    await other();
    yield;
  }
});

import { action } from "solid-js";
action(async function* () {
  async function callback() {
    await api();
  }
  const f = async () => {
    await api();
  };
  async function* nested() {
    await api();
  }
});

import { action } from "other";
action(async function* () {
  await api();
});

const action = (f) => f;
action(async function* () {
  await api();
});

import { action } from "solid-js";
function f(action) {
  action(async function* () {
    await api();
  });
}

import * as Solid from "solid-js";
function f(Solid) {
  Solid.action(async function* () {
    await api();
  });
}

import action from "solid-js";
action(async function* () {
  await api();
});

import { action } from "solid-js";
const f = async function* () {
  await api();
};
action(f);

import { action } from "solid-js";
action(async function* () {
  yield await api();
});

import { action } from "solid-js";
action(async function* () {
  let r;
  r = await api();
  yield;
});

import { action } from "solid-js";
action(async function* () {
  action(async function* (r) {
    r = await api();
    yield;
  });
});

import { action } from "solid-js";
action(async function* () {
  let r;
  r = ((await api()) as string)!;
  yield;
});

import { action } from "solid-js";
action(
  (async function* () {
    await api();
    yield;
  } satisfies Function)!
);

import { action } from "my-renderer";
action(async function* () {
  await api();
});

import { action } from "my-renderer-extra";
action(async function* () {
  await api();
});

import { action } from "my-renderer";
function f(action) {
  action(async function* () {
    await api();
  });
}

import { action } from "solid-js";
action(async function* () {
  const o = {
    async method() {
      await api();
    },
  };
  class C {
    async method() {
      await api();
    }
  }
});

import { action } from "solid-js";
action(async function* () {
  await run(async () => {
    await api();
  });
  yield;
});

import { action as act } from "solid-js";
function f(act) {
  act(async function* () {
    await api();
  });
}

import { action } from "solid-js";
action(async () => {
  await api();
});

import { action } from "solid-js";
action(async function* () {
  for (const r of stream) {
    async function nested() {
      await api();
    }
  }
});

```
<!-- end-doc-gen -->
