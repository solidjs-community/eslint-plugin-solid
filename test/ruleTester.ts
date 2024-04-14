/* eslint-disable @typescript-eslint/ban-ts-comment */
import { RuleTester } from "eslint";
// @ts-ignore
import { RuleTester as RuleTester_v6 } from "eslint-v6";
// @ts-ignore
import { RuleTester as RuleTester_v7 } from "eslint-v7";
// @ts-ignore
import { RuleTester as RuleTester_v8 } from "eslint-v8";
import type { TSESLint } from "@typescript-eslint/utils";

// The default parser
const jsxTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

// spread ...tsOnlyTest into a test case to enforce it always runs with the TS parser
export const tsOnlyTest = {
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
};

// TypeScript's ESLint parser
const tsTester = new RuleTester(tsOnlyTest);

// Babel's ESLint parser
const babelTester = new RuleTester({
  parser: require.resolve("@babel/eslint-parser"),
  parserOptions: {
    sourceType: "module",
    // @ts-ignore
    requireConfigFile: false,
    babelOptions: {
      parserOpts: {
        plugins: ["jsx", "typescript"],
      },
    },
  },
});

const v6Tester = new RuleTester_v6({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const v7Tester = new RuleTester_v7({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const v8Tester = new RuleTester_v8({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

interface Tests {
  valid?: Array<(RuleTester.ValidTestCase & { tsOnly?: boolean }) | string>;
  invalid?: Array<RuleTester.InvalidTestCase & { tsOnly?: boolean }>;
}
export const run = (
  name: string,
  rule: TSESLint.RuleModule<never, Array<unknown>>,
  tests: Tests
) => {
  const jsOnlyPredicate = (test: { tsOnly?: boolean } | string) =>
    !(typeof test === "object" && test.tsOnly);
  const jsTests = {
    valid: tests.valid?.filter(jsOnlyPredicate) as Array<RuleTester.ValidTestCase | string>,
    invalid: tests.invalid?.filter(jsOnlyPredicate) as Array<RuleTester.InvalidTestCase>,
  };
  switch (process.env.PARSER) {
    case "ts":
      describe("@typescript-eslint/parser", () => tsTester.run(name, rule, tests));
      break;
    case "babel":
      describe("@babel/eslint-parser", () => babelTester.run(name, rule, tests));
      break;
    case "v6":
      describe("eslint v6", () => v6Tester.run(name, rule, jsTests));
      break;
    case "v7":
      describe("eslint v7", () => v7Tester.run(name, rule, jsTests));
      break;
    case "v8":
      describe("eslint v8", () => v8Tester.run(name, rule, jsTests));
      break;
    case "all":
      describe("esprima", () => jsxTester.run(name, rule, jsTests));
      describe("@typescript-eslint/parser", () => tsTester.run(name, rule, tests));
      describe("@babel/eslint-parser", () => babelTester.run(name, rule, tests));
      describe("eslint v6", () => v6Tester.run(name, rule, jsTests));
      describe("eslint v7", () => v7Tester.run(name, rule, jsTests));
      describe("eslint v8", () => v8Tester.run(name, rule, jsTests));
      break;
    case "none":
      break;
    default:
      describe("esprima", () => jsxTester.run(name, rule, jsTests));
      break;
  }
  return tests;
};
