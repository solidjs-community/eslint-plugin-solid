import { verifyAndFix } from "./dist.mjs";
import assert from "assert";

// ensure that dist.mjs runs without crashing and returns results
assert.deepStrictEqual(verifyAndFix('let el = <div className="red" />'), {
  fixed: true,
  messages: [],
  output: 'let el = <div class="red" />',
});
