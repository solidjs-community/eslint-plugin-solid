import { test, expect } from "vitest";

import path from "path";
import { ESLint } from "eslint";

const cwd = __dirname;
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

test.concurrent('fixture (.configs["flat/recommended"])', async () => {
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: "./eslint.config.prefixed.js",
  } as any);
  const results = await eslint.lintFiles("{valid,invalid}/**/*.{js,jsx,ts,tsx}");

  results.forEach(checkResult);

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});

test.concurrent("fixture (/configs/recommended)", async () => {
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: "./eslint.config.js",
    // ignorePatterns: ["eslint.*"],
  } as any);

  const results = await eslint.lintFiles("{valid,invalid}/**/*.{js,jsx,ts,tsx}");

  results.forEach(checkResult);

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});
