import { test, expect } from "vitest";

import path from "path";
import { ESLint as FlatESLint } from "eslint";
import { ESLint as LegacyESLint } from "eslint-v8";

// import * as tsParser from "@typescript-eslint/parser";
// import recommendedConfig from "eslint-plugin-solid/configs/recommended";
// import typescriptConfig from "eslint-plugin-solid/configs/typescript";

const cwd = path.resolve("test", "fixture");
const validDir = path.join(cwd, "valid");
const jsxUndefPath = path.join(cwd, "invalid", "jsx-undef.jsx");

const checkResult = (result: LegacyESLint.LintResult | FlatESLint.LintResult) => {
  if (result.filePath.startsWith(validDir)) {
    expect(result.messages).toEqual([]);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.usedDeprecatedRules).toEqual([]);
  } else {
    expect(result.messages).not.toEqual([]);
    expect(result.warningCount + result.errorCount).toBeGreaterThan(0);
    expect(result.usedDeprecatedRules).toEqual([]);

    if (result.filePath === jsxUndefPath) {
      // test for one specific error message
      expect(result.messages.some((message) => /'Component' is not defined/.test(message.message)));
    }
  }
};

test.concurrent("fixture (legacy)", async () => {
  const eslint = new LegacyESLint({
    baseConfig: {
      root: true,
      parser: "@typescript-eslint/parser",
      env: { browser: true },
      plugins: ["solid"],
      extends: "plugin:solid/recommended",
    },
    useEslintrc: false,
  });
  const results = await eslint.lintFiles("test/fixture/**/*.{js,jsx,ts,tsx}");

  results.forEach(checkResult);

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});

test.concurrent("fixture (flat)", async () => {
  const eslint = new FlatESLint();
  const results = await eslint.lintFiles("test/fixture/**/*.{js,jsx,ts,tsx}");

  results.forEach(checkResult);

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});
