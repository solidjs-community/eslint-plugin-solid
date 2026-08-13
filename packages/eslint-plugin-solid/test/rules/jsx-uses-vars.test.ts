import { RuleTester } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import rule from "../../src/rules/jsx-uses-vars";

const noUnused = builtinRules.get("no-unused-vars");

// Since we have to activate the no-unused-vars rule, create a new ruleTester with the default parser
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    solid: { rules: { "jsx-uses-vars": rule as never } },
  },
});

// The bulk of the testing of this rule is done in eslint-plugin-react,
// so we just test the custom directives part of it here.
if (noUnused) {
  ruleTester.run("no-unused-vars", noUnused, {
    valid: [
      `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<div use:X />)`,
      `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<X />)`,
      `/* eslint solid/jsx-uses-vars: 1 */ (X => <div use:X />)()`,
      `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<div use:X={{}} />)`,
      `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<div use={X} />)`,
    ],
    invalid: [
      {
        code: `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<div useX />)`,
        errors: [{ message: "'X' is defined but never used.", suggestions: 1 }],
      },
      {
        code: `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<div X />)`,
        errors: [{ message: "'X' is defined but never used.", suggestions: 1 }],
      },
      {
        code: `/* eslint solid/jsx-uses-vars: 1 */ let X; markUsed(<div used:X />)`,
        errors: [{ message: "'X' is defined but never used.", suggestions: 1 }],
      },
    ],
  });
} else {
  throw new Error("ESLint no-unused-vars rule is undefined!");
}
