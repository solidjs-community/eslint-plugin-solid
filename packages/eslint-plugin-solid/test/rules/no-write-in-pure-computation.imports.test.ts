import { vi } from "vitest";

// The global vitest setup mocks trackImports so most rule tests can skip
// import boilerplate. These cases exercise the real import gating — foreign
// createMemos excluded, Solid aliases resolved — so restore it here. This
// file is intentionally not named `<rule>.test.ts`: scripts/docs.mts imports
// test files by that name to build docs and cannot load files using vitest
// APIs.
vi.unmock("../../src/utils");

import { run } from "../ruleTester";
import rule from "../../src/rules/no-write-in-pure-computation";

export const cases = run("no-write-in-pure-computation", rule, {
  valid: [
    // not Solid's createMemo
    `import { createSignal } from "solid-js";
import { createMemo } from "another-library";
const [count, setCount] = createSignal(0);
const bad = createMemo(() => setCount(1));`,
  ],
  invalid: [
    {
      code: `import { createSignal as signal, createMemo as memo } from "solid-js";
const [count, setCount] = signal(0);
const bad = memo(() => {
  setCount(count() + 1);
  return count();
});`,
      errors: [{ messageId: "writeInMemo" }],
    },
  ],
});
