import { expectTypeOf } from "expect-type";
import tseslint from "typescript-eslint";
import plugin from "eslint-plugin-solid";

import type { Linter } from "eslint";

test.concurrent("typing", () => {
  expectTypeOf([
    plugin.configs["flat/recommended"],
    plugin.configs["flat/typescript"],
  ]).toMatchTypeOf<Linter.FlatConfig[]>();

  tseslint.config(plugin.configs["flat/recommended"], plugin.configs["flat/typescript"]);

  tseslint.config({
    extends: [plugin.configs["flat/recommended"], plugin.configs["flat/typescript"]],
  });
});
