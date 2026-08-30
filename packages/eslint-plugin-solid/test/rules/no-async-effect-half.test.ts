import { run } from "../ruleTester";
import rule from "../../src/rules/no-async-effect-half";

export const cases = run("no-async-effect-half", rule, {
  valid: [
    `import { createEffect } from "solid-js";
createEffect(() => count(), (value) => console.log(value));`,
    // async computations are first-class; only the effect half must be sync
    `import { createEffect } from "solid-js";
createEffect(async () => (await fetch(url())).json(), (data) => setData(data));`,
    `import { createEffect } from "solid-js";
createEffect(() => query(), (q) => {
  const controller = new AbortController();
  fetch(q, { signal: controller.signal }).then(handle);
  return () => controller.abort();
});`,
    // single-argument form is solid/no-single-arg-create-effect's territory
    `import { createEffect } from "solid-js";
createEffect(async () => console.log(await promise));`,
    `import { createEffect } from "solid-js";
const log = (value) => console.log(value);
createEffect(() => count(), log);`,
  ],
  invalid: [
    {
      code: `import { createEffect } from "solid-js";
createEffect(() => query(), async (q) => {
  const data = await fetch(q);
  setData(data);
});`,
      errors: [{ messageId: "asyncEffect" }],
    },
    {
      code: `import { createEffect } from "solid-js";
createEffect(() => query(), async function (q) {
  await save(q);
});`,
      errors: [{ messageId: "asyncEffect" }],
    },
    {
      code: `import { createRenderEffect } from "solid-js";
createRenderEffect(() => count(), async (value) => update(await value));`,
      errors: [{ messageId: "asyncEffect" }],
    },
    {
      code: `import { createEffect } from "solid-js";
async function persist(value) {
  await save(value);
}
createEffect(() => count(), persist);`,
      errors: [{ messageId: "asyncEffect" }],
    },
    {
      code: `import { createEffect } from "solid-js";
const persist = async (value) => save(value);
createEffect(() => count(), persist);`,
      errors: [{ messageId: "asyncEffect" }],
    },
  ],
});
