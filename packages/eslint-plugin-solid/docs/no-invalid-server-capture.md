<!-- doc-gen HEADER -->
# solid/no-invalid-server-capture
Disallow server functions from capturing variables in enclosing non-module scopes, mirroring the compiler's build-time validation.
This rule is **off** by default.

[View source](../src/rules/no-invalid-server-capture.ts) · [View tests](../test/rules/no-invalid-server-capture.test.ts)
<!-- end-doc-gen -->

An extracted server function runs in a different closure environment than the one it was written in. On the server it is hoisted to module top level; on the client it is replaced by a network proxy. Either way, a variable captured from an *intermediate* scope — anything declared between module top level and the server function itself, like component state or an enclosing function's parameters — does not exist where the function actually runs.

The Solid compiler rejects these captures at build time. This rule reports the same captures as you type, so the feedback arrives in the editor at the moment the capture is written rather than minutes later in a failed build.

Server functions may freely reference:

- their own parameters and local variables,
- module top-level bindings and imports,
- globals,
- their own name (for named function expressions), and
- TypeScript types from any scope, since type references are erased from the output.

To pass request-specific data into a server function, use parameters — they are serialized across the network on every call.

The rule mirrors the compiler's scope: module-level `"use server"` files are unaffected (the whole module runs on the server with its closures intact), functions the compiler never extracts (object and class methods) are not validated, and directives nested inside an already-extracted server function are ignored.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
function Component() {
  const [count, setCount] = createSignal(0);
  const save = async () => {
    "use server";
    return db.save(count());
  };
  return save;
}

function makeGetter(table) {
  return async (id) => {
    "use server";
    return db.get(table, id);
  };
}

if (DEV) {
  const label = "dev";
  window.save = async () => {
    "use server";
    return db.save(label);
  };
}

function Component(props) {
  const upload = async (files) => {
    "use server";
    return Promise.all(files.map((file) => db.store(props.bucket, file)));
  };
  return upload;
}

```

### Valid Examples

These snippets don't cause lint errors.

```js
import { db } from "./db";
const TABLE = "users";
export async function getUser(id) {
  "use server";
  const key = TABLE + ":" + id;
  const cached = await cache.get(key);
  return cached || db.get(TABLE, id);
}

function Component(props) {
  const [count, setCount] = createSignal(0);
  const increment = () => setCount(count() + 1);
  return increment;
}

export const fact = async function self(n) {
  "use server";
  return n <= 1 ? 1 : n * (await self(n - 1));
};

"use server";
export function makeCounter() {
  let count = 0;
  return async () => ++count;
}

function Component() {
  const secret = 1;
  const api = {
    async leak() {
      "use server";
      return secret;
    },
  };
  return api;
}

export async function outer(id) {
  "use server";
  const rows = await db.get(id);
  const pick = async () => {
    "use server";
    return rows[0];
  };
  return pick();
}

function makeApi() {
  interface User {
    name: string;
  }
  return async (raw: unknown) => {
    "use server";
    return raw as User;
  };
}

```
<!-- end-doc-gen -->
