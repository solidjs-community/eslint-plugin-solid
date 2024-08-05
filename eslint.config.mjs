// @ts-check
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginEslintPlugin from "eslint-plugin-eslint-plugin";
import solid from "./dist/index.js";

export default tseslint.config(
  {
    ignores: ["dist", "**/dist.*", "./configs", "node_modules", "eslint.config.mjs"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: "tsconfig.json",
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
    files: ["src/rules/*.ts", "configs/*"],
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
  },
  // standalone is designed not to need any Node or browser APIs
  {
    files: ["standalone/index.js"],
    languageOptions: {
      globals: {},
    },
  },
  // fixture gets tested with the plugin
  {
    files: ["test/fixture/**/*.{js,jsx,ts,tsx}"],
    ...solid.configs["flat/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...solid.configs["flat/recommended"].rules,
      "@typescript-eslint/ban-ts-comment": 0,
      "@typescript-eslint/no-unused-expressions": 0,
      "@typescript-eslint/no-unused-vars": 0,
    },
  }
);
