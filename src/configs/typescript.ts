/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

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
    "solid/jsx-no-undef": [2, { typescriptEnabled: true }],
    // namespaces taken care of by TS
    "solid/no-unknown-namespaces": 0,
  },
};

export = typescript;
