import { run } from "../ruleTester";
import rule from "../../src/rules/no-react-deps";

export const cases = run("no-react-deps", rule, {
  valid: [
    `createEffect(() => {
      console.log(signal());
    });`,
    `createEffect((prev) => {
      console.log(signal() + prev);
    }, 0);`,
    `const value = createMemo(() => computeExpensiveValue(a(), b()));`,
    `const sum = createMemo((prev) => input() + prev, 0);`,
    `const args = [() => { console.log(signal()); }, [signal()]];
    createEffect(...args);`,
  ],
  invalid: [
    {
      code: `createEffect(() => {
        console.log(signal());
      }, [signal()]);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createEffect" } }],
      output: `createEffect(() => {
        console.log(signal());
      }, );`,
    },
    {
      code: `createEffect(() => {
        console.log(signal());
      }, [signal]);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createEffect" } }],
      output: `createEffect(() => {
        console.log(signal());
      }, );`,
    },
    {
      code: `const value = createMemo(() => computeExpensiveValue(a(), b()), [a(), b()]);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createMemo" } }],
      output: `const value = createMemo(() => computeExpensiveValue(a(), b()), );`,
    },
    {
      code: `const value = createMemo(() => computeExpensiveValue(a(), b()), [a, b]);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createMemo" } }],
      output: `const value = createMemo(() => computeExpensiveValue(a(), b()), );`,
    },
    {
      code: `const value = createMemo(() => computeExpensiveValue(a(), b()), [a, b()]);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createMemo" } }],
      output: `const value = createMemo(() => computeExpensiveValue(a(), b()), );`,
    },
  ],
});
