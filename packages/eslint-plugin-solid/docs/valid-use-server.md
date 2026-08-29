<!-- doc-gen HEADER -->
# solid/valid-use-server
Enforce that "use server" directives are placed where the compiler honors them, and that module-level directive files export working server functions.
This rule is **off** by default.

[View source](../src/rules/valid-use-server.ts) · [View tests](../test/rules/valid-use-server.test.ts)
<!-- end-doc-gen -->

Solid 2.0 makes server functions part of core: a function whose body begins with the `"use server"` directive is extracted to run only on the server, and client calls to it become network requests. The compiler only honors the directive in specific positions, and when it doesn't, the code silently stays on the client — often shipping database access or secrets to the browser without any error.

This rule catches the placement mistakes the compiler ignores silently:

- **Misplaced directives.** `"use server"` is only a directive as part of the directive prologue — the string statements at the very top of a function body or module. After any other statement, or inside an `if`/`for` block, it's an ordinary expression that does nothing.
- **Template literals.** `` `use server` `` is never a directive; only plain string literals are.
- **Ineligible positions.** The compiler never extracts object-literal methods, getters, setters, or class methods, so directives inside them are silently ignored. Standalone functions, function-valued properties (`{ getUser: async () => { ... } }`), and block-bodied arrows all work.

It also validates module-level `"use server"` files, where every export is registered as a server function:

- **Non-function exports.** Exporting a constant from a directive module fails at server boot, since the export's value is registered as a callable server function.
- **Client wrapper calls.** Declaration wrappers like `GET`, `live`, and `withMeta` from `@solidjs/web`, or `query`, `action`, and `liveQuery` from `@solidjs/router`, add behavior in the *client* bundle. In a module-level directive file the client build replaces every export with a bare server reference, so the wrapper never runs on the client: `GET` calls silently go over POST, router caching and submission tracking never happen. Wrap the imported server function in a shared (non-directive) module instead, or use a function-level directive inside the wrapper call.

<!-- doc-gen OPTIONS -->
## Rule Options

Options shown here are the defaults. Manually configuring an array will *replace* the defaults.

```js
{
  "solid/valid-use-server": ["off", { 
    // Additional function names treated as client-side declaration wrappers that must not be called inside a module-level "use server" file. Supports exact names, '*' wildcards, and regexes given as '/pattern/' strings. GET, live, withMeta, query, action, and liveQuery are always included.
    clientWrappers: [], // Array<string>
  }]
}
```
<!-- end-doc-gen -->

The `clientWrappers` option adds project-specific wrapper names (with `*` wildcards or `/regex/` strings) to the built-in list.

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
async function getUser(id) {
  const table = "users";
  ("use server");
  return db.get(table, id);
}

async function getUser(id) {
  if (id) {
    ("use server");
    return db.get(id);
  }
}

async function getUser(id) {
  `use server`;
  return db.get(id);
}

`use server`;
export async function getUser(id) {
  return db.get(id);
}

const api = {
  async getUser(id) {
    "use server";
    return db.get(id);
  },
};

const api = {
  get user() {
    "use server";
    return db.get(1);
  },
};

class Api {
  async getUser(id) {
    "use server";
    return db.get(id);
  }
}

"use server";
export const LIMIT = 10;
export async function getUsers() {
  return db.all();
}

"use server";
export default { version: 1 };

"use server";
import { query } from "@solidjs/router";
export const getUser = query(async (id) => db.get(id), "user");

"use server";
import { GET } from "@solidjs/web";
export const listUsers = GET(async () => db.all());

"use server";
import { action } from "@solidjs/router";
export const save = action(async (data) => db.save(data));

/* eslint solid/valid-use-server: ["error", { "clientWrappers": ["define*"] }] */
"use server";
export const getUser = defineLoader(async (id) => db.get(id));

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

async function getUser(id) {
  "use strict";
  "use server";
  return db.get(id);
}

const api = {
  getUser: async function (id) {
    "use server";
    return db.get(id);
  },
};

const mode = "use server";
function describe() {
  return "use server";
}

"use server";
export async function getUser(id) {
  return db.get(id);
}
export const listUsers = async () => db.all();

import { query } from "@solidjs/router";
export const getUser = query(async (id) => {
  "use server";
  return db.get(id);
}, "user");

"use server";
import { query } from "@solidjs/router";
export async function setup() {
  return query(async (id) => db.get(id), "user");
}

"use server";
export { helper } from "./helpers";

export async function outer() {
  "use server";
  const helpers = {
    inner() {
      "use server";
      return 1;
    },
  };
  return helpers.inner();
}

```
<!-- end-doc-gen -->
