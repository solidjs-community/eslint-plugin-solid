import { run } from "../ruleTester";
import rule from "../../src/rules/no-browser-globals-in-server-function";

export const cases = run("no-browser-globals-in-server-function", rule, {
  valid: [
    // server runtimes provide the web platform APIs that matter
    `export async function getUser(id) {
  "use server";
  const res = await fetch("https://api.example.com/users/" + id);
  const url = new URL(res.url);
  console.log(crypto.randomUUID(), url.hostname);
  return res.json();
}`,
    // browser globals are fine outside server functions
    `function Component() {
  const save = () => localStorage.setItem("draft", "1");
  return save;
}`,
    // typeof guards are intentional, if pointless, here
    `export async function getUser(id) {
  "use server";
  if (typeof window !== "undefined") throw new Error("impossible");
  return db.get(id);
}`,
    // a shadowing binding is the user's own variable
    `export async function render(document) {
  "use server";
  return document.title;
}`,
    // module-level directive file using server-safe APIs
    `"use server";
export async function getUser(id) {
  const res = await fetch("https://api.example.com/users/" + id);
  return res.json();
}`,
    // object/class methods are never extracted; valid-use-server owns those
    `const api = {
  async leak() {
    "use server";
    return document.title;
  },
};`,
  ],
  invalid: [
    {
      code: `export async function saveDraft(text) {
  "use server";
  localStorage.setItem("draft", text);
  return db.save(text);
}`,
      errors: [{ messageId: "browserGlobal", data: { name: "localStorage" } }],
    },
    {
      code: `export async function getOrigin() {
  "use server";
  return window.location.origin;
}`,
      errors: [{ messageId: "browserGlobal", data: { name: "window" } }],
    },
    // references in nested closures inside the server function still count
    {
      code: `export async function renderTitles(ids) {
  "use server";
  return ids.map((id) => document.getElementById(id).textContent);
}`,
      errors: [{ messageId: "browserGlobal", data: { name: "document" } }],
    },
    // module-level directive: the whole file runs on the server
    {
      code: `"use server";
export async function getTheme() {
  return document.body.dataset.theme;
}`,
      errors: [{ messageId: "browserGlobal", data: { name: "document" } }],
    },
    {
      code: `"use server";
const width = matchMedia("(min-width: 600px)");
export async function isWide() {
  return width.matches;
}`,
      errors: [{ messageId: "browserGlobal", data: { name: "matchMedia" } }],
    },
  ],
});
