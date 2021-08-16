import noUnused from "eslint/lib/rules/no-unused-vars";
import rule from "../../src/rules/jsx-uses-vars";
import eslint, { RuleTester } from "eslint";

// Since we have to activate the no-unused-vars rule, create a new ruleTester with the default parser
const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});
// @ts-expect-error accessing internal property 'linter' for test
(ruleTester.linter || eslint.linter).defineRule("jsx-uses-vars", rule);

// The bulk of the testing of this rule is done in eslint-plugin-react,
// so we just test the custom directives part of it here.
ruleTester.run("no-unused-vars", noUnused, {
  valid: [
    `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<div use:X />)`,
    `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<X />)`,
    `/* eslint jsx-uses-vars: 1 */ (X => <div use:X />)()`,
    `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<div use:X={{}} />)`,
    `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<div use={X} />)`,
  ],
  invalid: [
    {
      code: `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<div useX />)`,
      errors: [{ message: "'X' is defined but never used." }],
    },
    {
      code: `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<div X />)`,
      errors: [{ message: "'X' is defined but never used." }],
    },
    {
      code: `/* eslint jsx-uses-vars: 1 */ let X; markUsed(<div used:X />)`,
      errors: [{ message: "'X' is defined but never used." }],
    },
  ],
});
