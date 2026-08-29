<!-- doc-gen HEADER -->
# solid/require-async-server-function
Require server functions to be async, matching their client-side contract.
This rule is **off** by default.

[View source](../src/rules/require-async-server-function.ts) · [View tests](../test/rules/require-async-server-function.test.ts)
<!-- end-doc-gen -->

A server function's client half is always asynchronous — every call crosses the network and resolves a `Promise`. The server half deliberately preserves synchronous entry so in-process SSR calls stay fast. That means a non-`async` server function returns `T` during server rendering but `Promise<T>` on the client, and its declared TypeScript type is only right in one of those environments. TypeScript can't catch this: it types the source declaration, not the compiled client proxy.

Making the function `async` gives both environments the same contract, which is why this rule reports every non-`async` server function and autofixes by inserting `async`.

The rule covers both directive forms: functions with their own `"use server"` directive, and every export of a module-level `"use server"` file — including `export { name }` specifiers that resolve to top-level function declarations. Non-exported helpers in a module-level file are left alone; they only ever run in-process on the server, where synchronous returns are meaningful.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors, and all of them can be auto-fixed.

```js
export const getUser = (id) => {
  "use server";
  return db.get(id);
};
// after eslint --fix:
export const getUser = async (id) => {
  "use server";
  return db.get(id);
};

export function getUser(id) {
  "use server";
  return db.get(id);
}
// after eslint --fix:
export async function getUser(id) {
  "use server";
  return db.get(id);
}

"use server";
export function getUser(id) {
  return db.get(id);
}
// after eslint --fix:
"use server";
export async function getUser(id) {
  return db.get(id);
}

"use server";
export const listUsers = () => db.all();
// after eslint --fix:
"use server";
export const listUsers = async () => db.all();

"use server";
function getUser(id) {
  return db.get(id);
}
export { getUser };
// after eslint --fix:
"use server";
async function getUser(id) {
  return db.get(id);
}
export { getUser };

"use server";
export default function getUser(id) {
  return db.get(id);
}
// after eslint --fix:
"use server";
export default async function getUser(id) {
  return db.get(id);
}

```

### Valid Examples

These snippets don't cause lint errors.

```js
export const getUser = async (id) => {
  "use server";
  return db.get(id);
};

export async function getUser(id) {
  "use server";
  return db.get(id);
}

export async function* streamUsers() {
  "use server";
  yield* db.stream();
}

export function totalPrice(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

const api = {
  getUser(id) {
    "use server";
    return db.get(id);
  },
};

"use server";
export async function getUser(id) {
  return db.get(id);
}
export const listUsers = async () => db.all();

"use server";
function normalize(user) {
  return { ...user, name: user.name.trim() };
}
export async function getUser(id) {
  return normalize(await db.get(id));
}

export async function outer() {
  "use server";
  const inner = () => {
    "use server";
    return 1;
  };
  return inner();
}

```
<!-- end-doc-gen -->
