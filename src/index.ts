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

const plugin = {
  configs: {},
  rules,
};

const configs = {
  "flat/recommended": { plugins: { solid: plugin }, ...recommended.flat },
  "flat/typescript": { plugins: { solid: plugin }, ...typescript.flat },
  recommended: { plugins: ["solid"], ...recommended.legacy },
  typescript: { plugins: ["solid"], ...typescript.legacy },
};

plugin.configs = configs;

// Must be `export = ` for eslint to load everything
export = plugin;
