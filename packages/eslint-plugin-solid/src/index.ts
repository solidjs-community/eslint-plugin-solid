/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { plugin } from "./plugin";
import recommendedConfig from "./configs/recommended";
import typescriptConfig from "./configs/typescript";

const pluginLegacy = {
  rules: plugin.rules,
  configs: {
    recommended: {
      plugins: ["solid"],
      env: {
        browser: true,
        es6: true,
      },
      parserOptions: recommendedConfig.languageOptions.parserOptions,
      rules: recommendedConfig.rules,
    },
    typescript: {
      plugins: ["solid"],
      env: {
        browser: true,
        es6: true,
      },
      parserOptions: {
        sourceType: "module",
      },
      rules: typescriptConfig.rules,
    },
    "flat/recommended": recommendedConfig,
    "flat/typescript": typescriptConfig,
  },
};

// Must be `export = ` for eslint to load everything
export = pluginLegacy;
