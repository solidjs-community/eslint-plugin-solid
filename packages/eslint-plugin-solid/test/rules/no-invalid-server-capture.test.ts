import { run, tsOnly } from "../ruleTester";
import rule from "../../src/rules/no-invalid-server-capture";

export const cases = run("no-invalid-server-capture", rule, {
  valid: [
    // module top-level bindings, imports, params, locals, and globals are fine
    `import { db } from "./db";
const TABLE = "users";
export async function getUser(id) {
  "use server";
  const key = TABLE + ":" + id;
  const cached = await cache.get(key);
  return cached || db.get(TABLE, id);
}`,
    // functions without a directive can capture anything
    `function Component(props) {
  const [count, setCount] = createSignal(0);
  const increment = () => setCount(count() + 1);
  return increment;
}`,
    // a named function expression may reference itself
    `export const fact = async function self(n) {
  "use server";
  return n <= 1 ? 1 : n * (await self(n - 1));
};`,
    // module-level directive files keep their closures intact on the server
    `"use server";
export function makeCounter() {
  let count = 0;
  return async () => ++count;
}`,
    // object/class methods are never extracted; valid-use-server owns those
    `function Component() {
  const secret = 1;
  const api = {
    async leak() {
      "use server";
      return secret;
    },
  };
  return api;
}`,
    // directives nested inside a server function are ignored by the transform
    `export async function outer(id) {
  "use server";
  const rows = await db.get(id);
  const pick = async () => {
    "use server";
    return rows[0];
  };
  return pick();
}`,
    // TS type-only references are erased from the output and never captured
    {
      code: `function makeApi() {
  interface User {
    name: string;
  }
  return async (raw: unknown) => {
    "use server";
    return raw as User;
  };
}`,
      [tsOnly]: true,
    },
  ],
  invalid: [
    // capturing component state
    {
      code: `function Component() {
  const [count, setCount] = createSignal(0);
  const save = async () => {
    "use server";
    return db.save(count());
  };
  return save;
}`,
      errors: [{ messageId: "invalidCapture", data: { name: "count", kind: "function" } }],
    },
    // capturing an enclosing function's parameter
    {
      code: `function makeGetter(table) {
  return async (id) => {
    "use server";
    return db.get(table, id);
  };
}`,
      errors: [{ messageId: "invalidCapture", data: { name: "table", kind: "function" } }],
    },
    // capturing a block-scoped binding
    {
      code: `if (DEV) {
  const label = "dev";
  window.save = async () => {
    "use server";
    return db.save(label);
  };
}`,
      errors: [{ messageId: "invalidCapture", data: { name: "label", kind: "block" } }],
    },
    // captures in nested closures inside the server function still count
    {
      code: `function Component(props) {
  const upload = async (files) => {
    "use server";
    return Promise.all(files.map((file) => db.store(props.bucket, file)));
  };
  return upload;
}`,
      errors: [{ messageId: "invalidCapture", data: { name: "props", kind: "function" } }],
    },
  ],
});
