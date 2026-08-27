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
import v2Config from "./configs/v2";
import v2StrictConfig from "./configs/v2-strict";

const pluginWithConfigs = {
  ...plugin,
  configs: {
    recommended: recommendedConfig,
    typescript: typescriptConfig,
    v2: v2Config,
    "v2-strict": v2StrictConfig,
    // aliases kept for compatibility with the 0.14.x flat config names
    "flat/recommended": recommendedConfig,
    "flat/typescript": typescriptConfig,
  },
};

// Must be `export = ` for eslint to load everything
export = pluginWithConfigs;
