import { run, tsOnly } from "../ruleTester";
import rule from "../../src/rules/action-yield-after-await";

const wrap = (body: string) =>
  `import { action } from "solid-js"; action(async function* () { ${body} });`;
const error = { messageId: "missingYield" };
const invalid = (body: string, output: string | null = null) => ({
  code: wrap(body),
  errors: [error],
  output: output === null ? null : wrap(output),
});

export const cases = run("action-yield-after-await", rule, {
  valid: [
    wrap(
      "let r; try { r = await api(); yield; } catch (e) { r = await fallback(); yield; } write(r);"
    ),
    wrap("for await (const r of stream) { write(r); }"),
    { code: wrap("yield ((await api()) as string);"), [tsOnly]: true },
    {
      code: `import { action } from "solid-js"; action((async function* () { await api(); yield; }) as any);`,
      [tsOnly]: true,
    },
    wrap("const r = await api(); yield; write(r);"),
    wrap("await api(); /* boundary */ yield; yield until(ready);"),
    wrap("yield api(); const r = yield api(); yield await api();"),
    wrap("if (ok) { await api(); yield; } else { await other(); yield; }"),
    wrap(
      "async function callback() { await api(); } const f = async () => { await api(); }; async function* nested() { await api(); }"
    ),
    `import { action } from "other"; action(async function* () { await api(); });`,
    `const action = f => f; action(async function* () { await api(); });`,
    `import { action } from "solid-js"; function f(action) { action(async function* () { await api(); }); }`,
    `import * as Solid from "solid-js"; function f(Solid) { Solid.action(async function* () { await api(); }); }`,
    `import action from "solid-js"; action(async function* () { await api(); });`,
    `import { action } from "solid-js"; const f = async function* () { await api(); }; action(f);`,
    wrap("yield (await api());"),
    wrap("let r; r = await api(); yield;"),
    wrap("action(async function* (r) { r = await api(); yield; });"),
    { code: wrap("let r; r = ((await api()) as string)!; yield;"), [tsOnly]: true },
    {
      code: `import { action } from "solid-js"; action(((async function* () { await api(); yield; }) satisfies Function)!);`,
      [tsOnly]: true,
    },
    `import { action } from "my-renderer"; action(async function* () { await api(); });`,
    {
      code: `import { action } from "my-renderer-extra"; action(async function* () { await api(); });`,
      settings: { solid: { moduleSources: ["my-renderer"] } },
    },
    {
      code: `import { action } from "my-renderer"; function f(action) { action(async function* () { await api(); }); }`,
      settings: { solid: { moduleSources: ["my-renderer"] } },
    },
    wrap(
      "const o = { async method() { await api(); } }; class C { async method() { await api(); } }"
    ),
    wrap("await run(async () => { await api(); }); yield;"),
    `import { action as act } from "solid-js"; function f(act) { act(async function* () { await api(); }); }`,
    `import { action } from "solid-js"; action(async () => { await api(); });`,
    wrap("for await (const r of stream) { async function nested() { await api(); } }").replace(
      "for await",
      "for"
    ),
  ],
  invalid: [
    invalid("await api(); write();", "await api(); yield; write();"),
    invalid("await api([, 1]);", "await api([, 1]); yield;"),
    invalid(
      "await run(async () => { await api(); });",
      "await run(async () => { await api(); }); yield;"
    ),
    invalid("const r = await api(); write(r);", "const r = await api(); yield; write(r);"),
    invalid("await api(); yield until(ready);", "await api(); yield; yield until(ready);"),
    invalid("await api()\nwrite();", "await api(); yield;\nwrite();"),
    invalid("await api(); // comment\nwrite();", "await api(); yield; // comment\nwrite();"),
    invalid("if (ok) { await api(); }", "if (ok) { await api(); yield; }"),
    invalid("while (ok) { await api(); }", "while (ok) { await api(); yield; }"),
    invalid(
      "switch (key) { case 1: await api(); break; }",
      "switch (key) { case 1: await api(); yield; break; }"
    ),
    invalid(
      "try { await api(); } finally { clean(); }",
      "try { await api(); yield; } finally { clean(); }"
    ),
    invalid("if (await api()) { write(); } yield;"),
    invalid("while (await api()) { write(); }"),
    invalid("for (; await api(); ) { write(); }"),
    invalid("return await api();"),
    invalid("throw await api();"),
    invalid("use(await api()); yield;"),
    invalid("const r = (await api()) + write(); yield;"),
    invalid("const r = await api(), s = write(); yield;"),
    invalid("if (ok) await api();"),
    invalid("label: await api();"),
    invalid("const { r } = await api(); yield;"),
    invalid("if (ok) await api(); else other();"),
    invalid("await api(); ; yield;", "await api(); yield; ; yield;"),
    invalid("await api(); yield* other();", "await api(); yield; yield* other();"),
    invalid("for (let r = await api(); ok; next()) {}"),
    invalid("do {} while (await api());"),
    invalid("switch (await api()) { default: break; }"),
    { code: wrap("const r = await api(await other());"), errors: [error, error], output: null },
    invalid("yield until(await ready());"),
    invalid("yield setFoo(await api());"),
    invalid("yield await api(await other());"),
    invalid("yield* await api();"),
    invalid("r = await api(); yield;"),
    invalid("obj[key()] = await api(); yield;"),
    invalid(
      "let r; try { r = await api(); } catch (e) { recover(e); }",
      "let r; try { r = await api(); yield; } catch (e) { recover(e); }"
    ),
    {
      code: `import { action } from "my-renderer"; action(async function* () { await api(); });`,
      settings: { solid: { moduleSources: ["my-renderer"] } },
      errors: [error],
      output: `import { action } from "my-renderer"; action(async function* () { await api(); yield; });`,
    },
    {
      code: `import { action } from "solid-js"; action(((async function* () { const r = (await api())!; }) satisfies Function)!);`,
      [tsOnly]: true,
      errors: [error],
      output: `import { action } from "solid-js"; action(((async function* () { const r = (await api())!; yield; }) satisfies Function)!);`,
    },
    invalid("yield (await api()) + write();"),
    invalid("obj.r = await api(); yield;"),
    invalid("let r; r += await api(); yield;"),
    invalid("let r; r = await api(); write(r);", "let r; r = await api(); yield; write(r);"),
    invalid(
      "for await (const r of stream) { await api(); }",
      "for await (const r of stream) { await api(); yield; }"
    ),
    {
      code: `import { action as act } from "@solidjs/signals"; act(async function* () { await api(); });`,
      errors: [error],
      output: `import { action as act } from "@solidjs/signals"; act(async function* () { await api(); yield; });`,
    },
    {
      code: `import * as Solid from "my-renderer"; Solid.action(async function* () { await api(); });`,
      settings: { solid: { moduleSources: ["my-renderer"] } },
      errors: [error],
      output: `import * as Solid from "my-renderer"; Solid.action(async function* () { await api(); yield; });`,
    },
    {
      code: `import { action } from "solid-js"; action((async function* () { await api(); }) as any);`,
      [tsOnly]: true,
      errors: [error],
      output: `import { action } from "solid-js"; action((async function* () { await api(); yield; }) as any);`,
    },
    { ...invalid("yield until((await ready()) as boolean);"), [tsOnly]: true },
    {
      code: `import { action as act } from "solid-js"; act(async function* () { await api(); });`,
      errors: [error],
      output: `import { action as act } from "solid-js"; act(async function* () { await api(); yield; });`,
    },
    {
      code: `import * as Solid from "solid-js"; Solid.action(async function* () { await api(); });`,
      errors: [error],
      output: `import * as Solid from "solid-js"; Solid.action(async function* () { await api(); yield; });`,
    },
    {
      code: `import * as Solid from "solid-js"; Solid["action"](async function* () { await api(); });`,
      errors: [error],
      output: `import * as Solid from "solid-js"; Solid["action"](async function* () { await api(); yield; });`,
    },
    {
      ...invalid("const r = (await api()) as string;", "const r = (await api()) as string; yield;"),
      [tsOnly]: true,
    },
    {
      code: wrap("await api(); await other();"),
      errors: [error, error],
      output: wrap("await api(); yield; await other(); yield;"),
    },
    {
      code: wrap("const r = await (await api()); yield;"),
      errors: [error],
      output: null,
    },
    {
      code: wrap("action(async function* () { await api(); });"),
      errors: [error],
      output: wrap("action(async function* () { await api(); yield; });"),
    },
  ],
});
