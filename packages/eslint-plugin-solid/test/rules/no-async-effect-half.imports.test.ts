import { vi } from "vitest";

// The global vitest setup mocks trackImports so most rule tests can skip
// import boilerplate. These cases exercise the real import gating — foreign
// createEffects excluded, Solid aliases resolved — so restore it here. This
// file is intentionally not named `<rule>.test.ts`: scripts/docs.mts imports
// test files by that name to build docs and cannot load files using vitest
// APIs.
vi.unmock("../../src/utils");

import { run } from "../ruleTester";
import rule from "../../src/rules/no-async-effect-half";

export const cases = run("no-async-effect-half", rule, {
  valid: [
    // not Solid's createEffect
    `const createEffect = (compute, effect) => effect(compute());
createEffect(() => count(), async (value) => save(value));`,
    `import { createEffect } from "another-library";
createEffect(() => count(), async (value) => save(value));`,
  ],
  invalid: [
    {
      code: `import { createEffect as effect } from "solid-js";
effect(() => count(), async (value) => save(value));`,
      errors: [{ messageId: "asyncEffect" }],
    },
  ],
});
