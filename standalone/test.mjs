/* eslint-env node */
import path from "node:path";
import fs from "node:fs";
import assert from "node:assert";
import vm from "node:vm";
import typescript from "typescript";

/**
 * Test that dist.js can be run in a clean environment without Node or browser APIs, that it won't
 * crash, and that it will produce expected results. Code in, lints/fixes out is all it needs to do.
 */

// inject assert and a hidden _TYPESCRIPT_GLOBAL into global scope
const context = vm.createContext({
  assert,
  structuredClone,
  _TYPESCRIPT_GLOBAL: typescript,
});

// create a module with the standalone build
const code = fs.readFileSync(path.resolve("dist.js"), "utf-8");
const dist = new vm.SourceTextModule(code, { identifier: "dist.js", context });

// create a module reexporting typescript, a peer dependency of the standalone build
const ts = new vm.SourceTextModule("export default _TYPESCRIPT_GLOBAL", {
  identifier: "typescript",
  context,
});

// create a module that tests the build with `assert`
const test = new vm.SourceTextModule(
  `
import { plugin, pluginVersion, eslintVersion, verify, verifyAndFix } from "dist.js";

// check no Node APIs are present, except injected 'assert' and '_TYPESCRIPT_GLOBAL'
assert.equal(Object.keys(globalThis).length, 3);
assert.equal(typeof assert, 'function');
assert.equal(typeof process, 'undefined');
assert.equal(typeof __dirname, 'undefined');

// check for presence of exported variables
assert.equal(typeof plugin, "object");
assert.equal(typeof pluginVersion, "string");
assert.equal(typeof eslintVersion, "string");
assert.equal(typeof verify, "function");
assert.equal(typeof verifyAndFix, "function");

// ensure that the standalone runs without crashing and returns results
assert.deepStrictEqual(
  verify('let el = <div className="red" />', { 'solid/no-react-specific-props': 2 }), 
  [{
    ruleId: "solid/no-react-specific-props",
    severity: 2,
    message: "Prefer the \`class\` prop over the deprecated \`className\` prop.",
    line: 1,
    column: 15,
    nodeType: "JSXAttribute",
    messageId: "prefer",
    endLine: 1,
    endColumn: 30,
    fix: { range: [14, 23], text: "class" },
  }],
);
assert.deepStrictEqual(verifyAndFix('let el = <div className="red" />'), {
  fixed: true,
  messages: [],
  output: 'let el = <div class="red" />',
});
`,
  { identifier: "test.mjs", context }
);

// resolve imports to created modules, disallow any other attempts to import
const linker = (specifier) => {
  const mod = {
    typescript: ts,
    "dist.js": dist,
  }[specifier];
  if (!mod) {
    throw new Error("can't import other modules");
  }
  return mod;
};
await Promise.all([dist.link(linker), test.link(linker), ts.link(linker)]);

// run the test module
await test.evaluate({ timeout: 10 * 1000 });
assert.equal(test.status, "evaluated");
