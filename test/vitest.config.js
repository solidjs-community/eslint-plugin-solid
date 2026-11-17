import { defaultExclude } from "vitest/config";

export default {
  test: {
    globals: true,
    // These are integration tests: each one starts ESLint (or oxlint) and lints
    // whole fixture trees with every rule on. CI runs them while turbo runs the
    // plugin's own test suite in parallel, and with validate-jsx-nesting enabled
    // a single fixture run has taken 2-5s there, over vitest's 5s default.
    testTimeout: 30_000,
    // templates-v2/ contains lint fixtures copied from the Solid templates
    // repo, including a *.test.tsx file that is not a test of this package
    exclude: [...defaultExclude, "templates-v2/**"],
  },
};
