/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import rules from "./rules";
import recommended from "./configs/recommended";
import typescript from "./configs/typescript";
import type { Linter } from "eslint";

const plugin = {
  configs: {},
  rules,
};

const configs = {
  "flat/recommended": { plugins: { solid: plugin }, ...recommended.flat } as unknown as Linter.FlatConfig,
  "flat/typescript": { plugins: { solid: plugin }, ...typescript.flat } as unknown as Linter.FlatConfig,
  recommended: { plugins: ["solid"], ...recommended.legacy } as Linter.Config,
  typescript: { plugins: ["solid"], ...typescript.legacy } as Linter.Config,
};
plugin.configs = configs;

// Must be `export = ` for eslint to load everything
export = plugin as typeof plugin & { configs: typeof configs };
