import type { TSESLint } from "@typescript-eslint/utils";
import { Linter } from "eslint";

import recommended from "./recommended";

const typescript = {
  // no files; either apply to all files, or let users spread in this config
  // and specify matching patterns. This is eslint-plugin-react's take.
  plugins: recommended.plugins,
  // no languageOptions; ESLint's default parser can't parse TypeScript,
  // and parsers are configured in languageOptions, so let the user handle
  // this rather than cause potential conflicts
  rules: {
    ...recommended.rules,
    "solid/jsx-no-undef": [2, { typescriptEnabled: true }] satisfies Linter.RuleEntry,
    // namespaces taken care of by TS
    "solid/no-unknown-namespaces": 0,
  },
} satisfies TSESLint.FlatConfig.Config;

export = typescript;
