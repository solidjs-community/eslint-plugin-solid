import type { TSESLint } from "@typescript-eslint/utils";

import v2 from "./v2";

// Everything in the v2 config, plus opinionated rules that are valid patterns
// in some apps (e.g. client-only) but hazards in others. Intended for teams
// that want the plugin's strongest opinions.
const v2Strict = {
  plugins: v2.plugins,
  languageOptions: v2.languageOptions,
  settings: v2.settings,
  rules: {
    ...v2.rules,
    // module-scope reactive state is shared across SSR requests
    "solid/no-module-scope-reactive-primitive": 2,
    // side-effectful setup in component bodies belongs in onSettled;
    // warn-level because detection is a heuristic over a known-call list
    "solid/prefer-onSettled-for-side-effects": 1,
    // restating default prop/option values is noise
    "solid/no-restated-default-options": 2,
    // graduate the class-string heuristic to an error
    "solid/prefer-structured-class": 2,
  },
} satisfies TSESLint.FlatConfig.Config;

export = v2Strict;
