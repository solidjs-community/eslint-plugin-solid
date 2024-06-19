import { RuleTester } from "eslint";
import { RuleTester as RuleTester_v6 } from "eslint-v6";
import { RuleTester as RuleTester_v7 } from "eslint-v7";
import { RuleTester as RuleTester_v8 } from "eslint-v8";
import type { TSESLint } from "@typescript-eslint/utils";
import tseslint from "typescript-eslint";
// @ts-expect-error no types here
import * as babelEslintParser from "@babel/eslint-parser";
import { describe } from "vitest";

// add `[tsOnly]: true` into a test case to enforce it only runs with a TS parser
export const tsOnly = Symbol("ts only");

// The default parser
const v9Tester = new RuleTester({
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

const tsV8Tester = new RuleTester_v8({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
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

const babelV8Tester = new RuleTester_v8({
  parser: require.resolve("@babel/eslint-parser"),
  parserOptions: {
    sourceType: "module",
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
  if (all || parser === "ts_v8") {
    describe("@typescript-eslint/parser", () => tsV8Tester.run(name, rule as any, tests as any));
  }
  if (all || parser === "babel") {
    describe("@babel/eslint-parser", () => babelTester.run(name, rule as any, tests as any));
  }
  if (all || parser === "babel_v8") {
    describe("@babel/eslint-parser v8", () => babelV8Tester.run(name, rule as any, tests as any));
  }
  if (all || parser === "v6") {
    describe("eslint v6", () => v6Tester.run(name, rule as any, jsTests as any));
  }
  if (all || parser === "v7") {
    describe("eslint v7", () => v7Tester.run(name, rule as any, jsTests as any));
  }
  if (all || parser === "v8") {
    describe("eslint v8", () => v8Tester.run(name, rule as any, jsTests));
  }
  if (all || parser === "v9") {
    describe("eslint v9", () => v9Tester.run(name, rule as any, jsTests));
  }

  return tests;
};
