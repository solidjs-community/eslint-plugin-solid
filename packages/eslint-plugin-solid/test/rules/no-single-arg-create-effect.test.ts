import { run } from "../ruleTester.js";
import rule from "../../src/rules/no-single-arg-create-effect.js";

export const cases = run("no-single-arg-create-effect", rule, {
  valid: [
    `import { createEffect } from "solid-js";
createEffect(() => count(), (value) => console.log(value));`,
    `import { createEffect } from "solid-js";
createEffect(count, (value) => console.log(value), { name: "logger" });`,
    `import { createRenderEffect } from "solid-js";
createRenderEffect(() => count(), (value) => update(value));`,
  ],
  invalid: [
    {
      code: `import { createEffect } from "solid-js";
createEffect(() => console.log(count()));`,
      errors: [{ messageId: "singleArgEffect" }],
    },
    {
      code: `import { createRenderEffect } from "solid-js";
createRenderEffect(() => update(count()));`,
      errors: [{ messageId: "singleArgRenderEffect" }],
    },
  ],
});
