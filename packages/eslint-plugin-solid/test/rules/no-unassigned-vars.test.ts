import { run, tsOnly } from "../ruleTester";
import rule from "../../src/rules/no-unassigned-vars";

export const cases = run("no-unassigned-vars", rule, {
  valid: [
    `let el; <div ref={el} onClick={() => el.focus()} />;`,
    `let api; <Dialog ref={api} />; api.open();`,
    {
      code: `let el!: HTMLDivElement; <div ref={el} onClick={() => el.focus()} />;`,
      [tsOnly]: true,
    },
    {
      code: `let el: HTMLDivElement | undefined; <div ref={el!} />; el?.focus();`,
      [tsOnly]: true,
    },
    `let x; x = 1; use(x);`,
    `let x = 1; use(x);`,
    `let x;`,
    { code: `declare let x: number; use(x);`, [tsOnly]: true },
  ],
  invalid: [
    {
      code: `let x; use(x);`,
      errors: [{ messageId: "unassigned", data: { name: "x" } }],
    },
    {
      code: `let el; <div ref={() => el} />;`,
      errors: [{ messageId: "unassigned", data: { name: "el" } }],
    },
    {
      code: `let el; <Comp elRef={el} />;`,
      errors: [{ messageId: "unassigned", data: { name: "el" } }],
    },
  ],
});
