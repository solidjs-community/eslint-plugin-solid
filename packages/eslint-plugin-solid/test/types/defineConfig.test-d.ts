/**
 * Type-level regression test for #233: every public export must be assignable
 * to ESLint's own `defineConfig()` from "eslint/config". This file is checked
 * with `tsc -p test/types` (no emit, no runtime); it imports the *built*
 * package through its package.json exports, exactly like a consumer with a
 * type-checked eslint.config.ts does, so it fails if the published `.d.(m)ts`
 * surface regresses to types ESLint's `Plugin`/`RuleDefinition` reject.
 */
import { defineConfig } from "eslint/config";

import plugin from "eslint-plugin-solid";
import recommended from "eslint-plugin-solid/configs/recommended";
import typescript from "eslint-plugin-solid/configs/typescript";
import v2 from "eslint-plugin-solid/configs/v2";
import v2Strict from "eslint-plugin-solid/configs/v2-strict";

// Each config spread into a files-scoped entry (the issue's repro).
defineConfig({ files: ["**/*.jsx"], ...recommended });
defineConfig({ files: ["**/*.tsx"], ...typescript });
defineConfig({ files: ["**/*.jsx"], ...v2 });
defineConfig({ files: ["**/*.jsx"], ...v2Strict });

// Each config passed directly.
defineConfig(recommended);
defineConfig(typescript);
defineConfig(v2);
defineConfig(v2Strict);

// The root plugin export used as a plugin, and its attached configs.
defineConfig({
  files: ["**/*.jsx"],
  plugins: { solid: plugin },
  rules: { "solid/reactivity": "warn" },
});
defineConfig(plugin.configs.recommended);
defineConfig(plugin.configs.typescript);
defineConfig(plugin.configs.v2);
defineConfig(plugin.configs["v2-strict"]);
defineConfig(plugin.configs["flat/recommended"]);
defineConfig(plugin.configs["flat/typescript"]);
