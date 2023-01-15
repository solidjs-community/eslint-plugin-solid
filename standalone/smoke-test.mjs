/* eslint-env node */
import { verifyAndFix } from "./dist.mjs";
import assert from "assert";

const p = global.process;
global.process = {};

try {
  // ensure that dist.mjs runs without crashing and returns results
  assert.deepStrictEqual(verifyAndFix('let el = <div className="red" />'), {
    fixed: true,
    messages: [],
    output: 'let el = <div class="red" />',
  });
} finally {
  global.process = p;
}
