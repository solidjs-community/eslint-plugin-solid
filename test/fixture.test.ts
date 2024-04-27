import { test, expect } from "vitest";

import path from "path";
// @ts-expect-error Type definitions not updated to include FlatESLint
import { ESLint as FlatESLint } from "eslint";
import { ESLint as ESLint } from "eslint-v8";

import * as tsParser from "@typescript-eslint/parser";
import recommendedConfig from "eslint-plugin-solid/configs/recommended";
import typescriptConfig from "eslint-plugin-solid/configs/typescript";

const cwd = path.resolve("test", "fixture");
const validDir = path.join(cwd, "valid");
const jsxUndefPath = path.join(cwd, "invalid", "jsx-undef.jsx");

const checkResult = (result: ESLint.LintResult) => {
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

test.concurrent("fixture", async () => {
  const eslint = new ESLint({ cwd });
  const results = await eslint.lintFiles("**/*.{js,jsx,ts,tsx}");

  results.forEach(checkResult);

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});

test.concurrent("fixture (flat)", async () => {
  const eslint = new FlatESLint({
    cwd,
    overrideConfigFile: true,
    ignore: false,
    overrideConfig: [
      {
        files: ["**/*.{js,jsx}"],
        ...recommendedConfig,
      },
      {
        files: ["**/*.{ts,tsx}"],
        ...typescriptConfig,
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            project: "tsconfig.json",
          },
        },
      },
    ],
  });
  const results: Array<ESLint.LintResult> = await eslint.lintFiles("**/*.{js,jsx,ts,tsx}");

  results.forEach(checkResult);

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});
