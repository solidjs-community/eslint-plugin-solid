/* global describe */

import { RuleTester } from "eslint";

// The default parser
const jsxTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

// TypeScript's ESLint parser
const tsTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});
// Babel's ESLint parser
const babelTester = new RuleTester({
  parser: require.resolve("@babel/eslint-parser"),
  parserOptions: {
    sourceType: "module",
    requireConfigFile: false,
    babelOptions: {
      parserOpts: {
        plugins: ["jsx", "typescript"], //
      },
    },
  },
});

export const run: typeof RuleTester.prototype.run = (name, rule, tests) => {
  switch (process.env.PARSER) {
    case "ts":
      describe("@typescript-eslint/parser", () =>
        tsTester.run(name, rule, tests));
      break;
    case "babel":
      describe("@babel/eslint-parser", () =>
        babelTester.run(name, rule, tests));
      break;
    case "all":
      describe("esprima", () => jsxTester.run(name, rule, tests));
      describe("@typescript-eslint/parser", () =>
        tsTester.run(name, rule, tests));
      describe("@babel/eslint-parser", () =>
        babelTester.run(name, rule, tests));
      break;
    default:
      describe("esprima", () => jsxTester.run(name, rule, tests));
      break;
  }
};
