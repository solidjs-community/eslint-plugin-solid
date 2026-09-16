import { vi } from "vitest";

// The global vitest setup mocks trackImports so most rule tests can skip
// import boilerplate. These cases exercise the real import gating — foreign
// createSignals excluded, Solid aliases resolved — so restore it here. This
// file is intentionally not named `<rule>.test.ts`: scripts/docs.mts imports
// test files by that name to build docs and cannot load files using vitest
// APIs.
vi.unmock("../../src/utils");

import { run } from "../ruleTester";
import rule from "../../src/rules/no-unused-signal";

export const cases = run("no-unused-signal", rule, {
  valid: [
    // not Solid's createSignal
    `const createSignal = (v) => [() => v, () => {}];
const [count, setCount] = createSignal(0);
console.log(count());`,
    `import { createSignal } from "another-library";
const [count, setCount] = createSignal(0);
console.log(count());`,
  ],
  invalid: [
    {
      code: `import { createSignal as signal } from "solid-js";
const [count, setCount] = signal(0);
setCount(5);`,
      errors: [{ messageId: "neverRead" }],
    },
  ],
});
