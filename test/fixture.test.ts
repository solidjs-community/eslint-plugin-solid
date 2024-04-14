import path from "path";
import { ESLint } from "eslint";
// @ts-expect-error Type definitions not updated to include FlatESLint
import { FlatESLint } from "eslint/use-at-your-own-risk";

import * as tsParser from "@typescript-eslint/parser";
import recommendedConfig from "eslint-plugin-solid/configs/recommended";
import typescriptConfig from "eslint-plugin-solid/configs/typescript";
import plugin from "eslint-plugin-solid";

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

describe("config format", () => {
  test("flat config has meta", () => {
    expect(recommendedConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
    expect(recommendedConfig.plugins.solid.meta.version).toEqual(expect.any(String));
    expect(typescriptConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
    expect(typescriptConfig.plugins.solid.meta.version).toEqual(expect.any(String));
  });

  test('flat configs are also exposed on plugin.configs["flat/*"]', () => {
    // include flat configs on legacy config object with `flat/` prefix. The `fixture (flat)` test
    // passing means that an equivalent config using `configs["flat/*"]` will also pass.
    expect(plugin.configs["flat/recommended"]).toBe(recommendedConfig);
    expect(plugin.configs["flat/typescript"]).toBe(typescriptConfig);
  });

  test("legacy configs use strings, not modules", () => {
    expect(plugin.configs.recommended.plugins).toStrictEqual(["solid"]);
    expect(plugin.configs.typescript.plugins).toStrictEqual(["solid"]);
  });
});
