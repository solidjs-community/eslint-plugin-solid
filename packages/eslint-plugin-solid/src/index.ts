import { plugin } from "./plugin.js";
import recommendedConfig from "./configs/recommended.js";
import typescriptConfig from "./configs/typescript.js";
import v2Config from "./configs/v2.js";
import v2StrictConfig from "./configs/v2-strict.js";

// Do not make a new object here as ESLint compares by reference and will
// think this is a different plugin to the one inside the configs
export const configs = {
  recommended: recommendedConfig,
  typescript: typescriptConfig,
  v2: v2Config,
  "v2-strict": v2StrictConfig,
  // aliases kept for compatibility with the 0.14.x flat config names
  "flat/recommended": recommendedConfig,
  "flat/typescript": typescriptConfig,
} as const;

plugin.configs = configs;

export default plugin;
