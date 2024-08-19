// @ts-check
import path from "node:path";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginEslintPlugin from "eslint-plugin-eslint-plugin";

const tsconfigPath = path.resolve("tsconfig.json");

export default tseslint.config(
  {
    ignores: ["**/dist/", "**/dist.*", "**/.tsup/", "**/eslint.config.mjs", "test/"],
  },
  js.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: tsconfigPath,
      },
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "warn",
      "no-extra-semi": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-new-native-nonconstructor": 1,
      "no-new-symbol": "off",
      "object-shorthand": "warn",
    },
  },
  {
    files: ["packages/eslint-plugin-solid/src/rules/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      "eslint-plugin": pluginEslintPlugin,
    },
    rules: {
      ...pluginEslintPlugin.configs.recommended.rules,
      "eslint-plugin/meta-property-ordering": "error",
      "eslint-plugin/report-message-format": ["error", "^[A-Z\\{'].*\\.$"],
      "eslint-plugin/test-case-property-ordering": "error",
      "eslint-plugin/require-meta-docs-description": [
        "error",
        { pattern: "^(Enforce|Require|Disallow)" },
      ],
      "eslint-plugin/require-meta-docs-url": [
        "error",
        {
          pattern:
            "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/{{name}}.md",
        },
      ],
    },
  }
);
