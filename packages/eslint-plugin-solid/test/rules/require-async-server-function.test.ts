import { run } from "../ruleTester";
import rule from "../../src/rules/require-async-server-function";

export const cases = run("require-async-server-function", rule, {
  valid: [
    // async server functions in every eligible form
    `export const getUser = async (id) => {
  "use server";
  return db.get(id);
};`,
    `export async function getUser(id) {
  "use server";
  return db.get(id);
}`,
    // async generators are async
    `export async function* streamUsers() {
  "use server";
  yield* db.stream();
}`,
    // sync functions without a directive are none of this rule's business
    `export function totalPrice(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`,
    // object/class methods are never extracted; valid-use-server owns those
    `const api = {
  getUser(id) {
    "use server";
    return db.get(id);
  },
};`,
    // module-level directive: async exports
    `"use server";
export async function getUser(id) {
  return db.get(id);
}
export const listUsers = async () => db.all();`,
    // non-exported helpers in a module-level file only ever run in-process
    `"use server";
function normalize(user) {
  return { ...user, name: user.name.trim() };
}
export async function getUser(id) {
  return normalize(await db.get(id));
}`,
    // directives nested inside a server function are ignored by the transform
    `export async function outer() {
  "use server";
  const inner = () => {
    "use server";
    return 1;
  };
  return inner();
}`,
  ],
  invalid: [
    {
      code: `export const getUser = (id) => {
  "use server";
  return db.get(id);
};`,
      output: `export const getUser = async (id) => {
  "use server";
  return db.get(id);
};`,
      errors: [{ messageId: "asyncServerFunction" }],
    },
    {
      code: `export function getUser(id) {
  "use server";
  return db.get(id);
}`,
      output: `export async function getUser(id) {
  "use server";
  return db.get(id);
}`,
      errors: [{ messageId: "asyncServerFunction" }],
    },
    // module-level directive: every exported function crosses the network
    {
      code: `"use server";
export function getUser(id) {
  return db.get(id);
}`,
      output: `"use server";
export async function getUser(id) {
  return db.get(id);
}`,
      errors: [{ messageId: "asyncServerFunction" }],
    },
    {
      code: `"use server";
export const listUsers = () => db.all();`,
      output: `"use server";
export const listUsers = async () => db.all();`,
      errors: [{ messageId: "asyncServerFunction" }],
    },
    // export specifiers resolve to their top-level declarations
    {
      code: `"use server";
function getUser(id) {
  return db.get(id);
}
export { getUser };`,
      output: `"use server";
async function getUser(id) {
  return db.get(id);
}
export { getUser };`,
      errors: [{ messageId: "asyncServerFunction" }],
    },
    {
      code: `"use server";
export default function getUser(id) {
  return db.get(id);
}`,
      output: `"use server";
export default async function getUser(id) {
  return db.get(id);
}`,
      errors: [{ messageId: "asyncServerFunction" }],
    },
  ],
});
