import { run } from "../ruleTester";
import rule from "../../src/rules/no-react-deps";

export const cases = run("no-react-deps", rule, {
  valid: [
    `createEffect(() => {
      console.log(signal());
    });`,
    `createEffect((prev) => {
      console.log(signal());
      return prev + 1;
    }, 0);`,
    `createEffect((prev) => {
      console.log(signal());
      return (prev || 0) + 1;
    });`,
    `createEffect((prev) => {
      console.log(signal());
      return prev ? prev + 1 : 1;
    }, undefined);`,
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
      code: `const deps = [signal];
      createEffect(() => {
        console.log(signal());
      }, deps);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createEffect" } }],
      // no `output`
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
    {
      code: `const deps = [a, b];
      const value = createMemo(() => computeExpensiveValue(a(), b()), deps);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createMemo" } }],
      // no `output`
    },
    {
      code: `const deps = [a, b];
      const memoFn = () => computeExpensiveValue(a(), b());
      const value = createMemo(memoFn, deps);`,
      errors: [{ messageId: "noUselessDep", data: { name: "createMemo" } }],
      // no `output`
    },
  ],
});
