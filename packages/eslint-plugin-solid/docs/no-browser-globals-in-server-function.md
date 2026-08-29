<!-- doc-gen HEADER -->
# solid/no-browser-globals-in-server-function
Disallow browser-only globals inside server functions, which run exclusively on the server.
This rule is **off** by default.

[View source](../src/rules/no-browser-globals-in-server-function.ts) · [View tests](../test/rules/no-browser-globals-in-server-function.test.ts)
<!-- end-doc-gen -->

Server functions only ever execute on the server, where browser globals like `window`, `document`, and `localStorage` do not exist — referencing them throws at request time. This mistake is easy to make because server functions are written inline next to client code, and easy for AI-generated code to make because the surrounding component uses those globals legitimately.

The rule checks the body of every server function (and every reference in a module-level `"use server"` file) for unambiguous browser-only globals: `window`, `document`, `alert`, `confirm`, `prompt`, `localStorage`, `sessionStorage`, `history`, `location`, `matchMedia`, `getComputedStyle`, `requestAnimationFrame`, `cancelAnimationFrame`, and `customElements`.

The list is deliberately conservative. Server runtimes (Node, Deno, Bun, edge workers) provide much of the web platform — `fetch`, `Response`, `FormData`, `URL`, `crypto`, and even `navigator` — so those are never flagged. Shadowing bindings (a parameter named `document`) and `typeof window` guards are also ignored.

To act on client state in a server function, pass it as an argument; arguments are serialized across the network on every call.

<!-- doc-gen OPTIONS -->
<!-- end-doc-gen -->

<!-- doc-gen CASES -->
## Tests

### Invalid Examples

These snippets cause lint errors.

```js
export async function saveDraft(text) {
  "use server";
  localStorage.setItem("draft", text);
  return db.save(text);
}

export async function getOrigin() {
  "use server";
  return window.location.origin;
}

export async function renderTitles(ids) {
  "use server";
  return ids.map((id) => document.getElementById(id).textContent);
}

"use server";
export async function getTheme() {
  return document.body.dataset.theme;
}

"use server";
const width = matchMedia("(min-width: 600px)");
export async function isWide() {
  return width.matches;
}

```

### Valid Examples

These snippets don't cause lint errors.

```js
export async function getUser(id) {
  "use server";
  const res = await fetch("https://api.example.com/users/" + id);
  const url = new URL(res.url);
  console.log(crypto.randomUUID(), url.hostname);
  return res.json();
}

function Component() {
  const save = () => localStorage.setItem("draft", "1");
  return save;
}

export async function getUser(id) {
  "use server";
  if (typeof window !== "undefined") throw new Error("impossible");
  return db.get(id);
}

export async function render(document) {
  "use server";
  return document.title;
}

"use server";
export async function getUser(id) {
  const res = await fetch("https://api.example.com/users/" + id);
  return res.json();
}

const api = {
  async leak() {
    "use server";
    return document.title;
  },
};

```
<!-- end-doc-gen -->
