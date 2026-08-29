import { run } from "../ruleTester";
import rule from "../../src/rules/valid-use-server";

export const cases = run("valid-use-server", rule, {
  valid: [
    // function-level directive in the prologue of an eligible function
    `export const getUser = async (id) => {
  "use server";
  return db.get(id);
};`,
    `export async function getUser(id) {
  "use server";
  return db.get(id);
}`,
    // other directives may precede it in the prologue
    `async function getUser(id) {
  "use strict";
  "use server";
  return db.get(id);
}`,
    // function-valued properties are eligible (unlike object methods)
    `const api = {
  getUser: async function (id) {
    "use server";
    return db.get(id);
  },
};`,
    // a "use server" string in expression (non-statement) position is just a string
    `const mode = "use server";
function describe() {
  return "use server";
}`,
    // module-level directive with async function exports
    `"use server";
export async function getUser(id) {
  return db.get(id);
}
export const listUsers = async () => db.all();`,
    // wrappers around function-level server functions are the supported pattern
    `import { query } from "@solidjs/router";
export const getUser = query(async (id) => {
  "use server";
  return db.get(id);
}, "user");`,
    // wrapper calls inside functions of a module-level file are server-side code
    `"use server";
import { query } from "@solidjs/router";
export async function setup() {
  return query(async (id) => db.get(id), "user");
}`,
    // re-exports are not statically analyzable; give them the benefit of the doubt
    `"use server";
export { helper } from "./helpers";`,
    // directives nested inside a server function are ignored but harmless
    `export async function outer() {
  "use server";
  const helpers = {
    inner() {
      "use server";
      return 1;
    },
  };
  return helpers.inner();
}`,
  ],
  invalid: [
    // directive after other statements is an ordinary expression statement
    {
      code: `async function getUser(id) {
  const table = "users";
  "use server";
  return db.get(table, id);
}`,
      errors: [{ messageId: "misplacedDirective" }],
    },
    // a directive inside a plain block is never a directive
    {
      code: `async function getUser(id) {
  if (id) {
    "use server";
    return db.get(id);
  }
}`,
      errors: [{ messageId: "misplacedDirective" }],
    },
    // template literals are never directives
    {
      code: "async function getUser(id) {\n  `use server`;\n  return db.get(id);\n}",
      errors: [{ messageId: "templateDirective" }],
    },
    {
      code: "`use server`;\nexport async function getUser(id) {\n  return db.get(id);\n}",
      errors: [{ messageId: "templateDirective" }],
    },
    // object methods are silently skipped by the compiler
    {
      code: `const api = {
  async getUser(id) {
    "use server";
    return db.get(id);
  },
};`,
      errors: [{ messageId: "ineligiblePosition", data: { position: "an object method" } }],
    },
    // getters and setters too
    {
      code: `const api = {
  get user() {
    "use server";
    return db.get(1);
  },
};`,
      errors: [{ messageId: "ineligiblePosition", data: { position: "a getter or setter" } }],
    },
    // and class methods
    {
      code: `class Api {
  async getUser(id) {
    "use server";
    return db.get(id);
  }
}`,
      errors: [{ messageId: "ineligiblePosition", data: { position: "a class method" } }],
    },
    // every export of a module-level directive file must be a function
    {
      code: `"use server";
export const LIMIT = 10;
export async function getUsers() {
  return db.all();
}`,
      errors: [{ messageId: "nonFunctionExport", data: { name: "LIMIT" } }],
    },
    {
      code: `"use server";
export default { version: 1 };`,
      errors: [{ messageId: "nonFunctionExport", data: { name: "default" } }],
    },
    // client wrappers are compiled out of the client in module-level files
    {
      code: `"use server";
import { query } from "@solidjs/router";
export const getUser = query(async (id) => db.get(id), "user");`,
      errors: [{ messageId: "clientWrapper", data: { name: "query" } }],
    },
    {
      code: `"use server";
import { GET } from "@solidjs/web";
export const listUsers = GET(async () => db.all());`,
      errors: [{ messageId: "clientWrapper", data: { name: "GET" } }],
    },
    {
      code: `"use server";
import { action } from "@solidjs/router";
export const save = action(async (data) => db.save(data));`,
      errors: [{ messageId: "clientWrapper", data: { name: "action" } }],
    },
    // custom wrappers via the clientWrappers option, incl. wildcards
    {
      code: `"use server";
export const getUser = defineLoader(async (id) => db.get(id));`,
      options: [{ clientWrappers: ["define*"] }],
      errors: [{ messageId: "clientWrapper", data: { name: "defineLoader" } }],
    },
  ],
});
