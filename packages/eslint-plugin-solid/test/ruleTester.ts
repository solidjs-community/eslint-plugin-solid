import { RuleTester } from "eslint";
import type { TSESLint } from "@typescript-eslint/utils";
import tseslint from "typescript-eslint";
import { describe } from "vitest";
import * as babelEslintParser from "@babel/eslint-parser";

// add `[tsOnly]: true` into a test case to enforce it only runs with a TS parser
export const tsOnly = Symbol("ts only");

// The default parser
const espreeTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

// TypeScript's ESLint parser
const tsTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

// Babel's ESLint parser
const babelTester = new RuleTester({
  languageOptions: {
    parser: babelEslintParser,
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        parserOpts: {
          plugins: ["jsx", "typescript"],
        },
      },
    },
  },
});

interface Tests {
  valid?: Array<(TSESLint.ValidTestCase<unknown[]> & { [tsOnly]?: boolean }) | string>;
  invalid?: Array<TSESLint.InvalidTestCase<string, unknown[]> & { [tsOnly]?: boolean }>;
}
export const run = (
  name: string,
  rule: TSESLint.RuleModule<string, Array<unknown>>,
  tests: Tests
) => {
  const jsOnlyPredicate = (test: { [tsOnly]?: boolean } | string) =>
    !(typeof test === "object" && test[tsOnly]);
  const jsTests = {
    valid: tests.valid?.filter(jsOnlyPredicate) as Array<RuleTester.ValidTestCase | string>,
    invalid: tests.invalid?.filter(jsOnlyPredicate) as Array<RuleTester.InvalidTestCase>,
  };

  const parser = process.env.PARSER ?? "ts";
  const all = parser === "all";

  if (all || parser === "ts") {
    describe("typescript-eslint", () => tsTester.run(name, rule as any, tests as any));
  }
  if (all || parser === "babel") {
    describe("@babel/eslint-parser", () => babelTester.run(name, rule as any, tests as any));
  }
  if (all || parser === "espree") {
    describe("espree (default parser)", () => espreeTester.run(name, rule as any, jsTests));
  }

  return tests;
};
