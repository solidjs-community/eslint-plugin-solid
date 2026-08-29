import type { TSESLint } from "@typescript-eslint/utils";

import { plugin } from "../plugin.js";
import recommended from "./recommended.js";

// The Solid 2.0 config. Sets `settings.solid.version: 2`, which switches
// version-aware rules (reactivity, imports, no-unknown-namespaces,
// event-handlers, jsx-no-undef) into strict 2.0 semantics, and enables the
// 2.0-specific rules. Errors are reserved for near-certain bugs; heuristics
// stay warnings. This is the config the official templates ship.
const v2 = {
  plugins: {
    solid: plugin,
  },
  languageOptions: {
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  settings: {
    solid: { version: 2 },
  },
  rules: {
    ...recommended.rules,
    // 1.x APIs that no longer exist; prescriptive migration guidance
    "solid/removed-api": 2,
    // 2.0 requires the split createEffect(compute, effect) form
    "solid/no-single-arg-create-effect": 2,
    // uncalled accessors as DOM attributes render stringified functions
    "solid/no-accessor-as-prop": 2,
    // manual class-string building works but defeats granular class toggling
    "solid/prefer-structured-class": 1,
    // graduated from style to correctness in 2.0: only camelCase `onClick` is
    // an event handler; lowercase forms are literal attributes
    "solid/event-handlers": 2,
    // className/htmlFor pass through as literal attributes the DOM ignores
    "solid/no-react-specific-props": 2,
    // premise no longer exists in 2.0 (rule also self-gates on version)
    "solid/no-react-deps": 0,
    // anti-advice in 2.0: classList was removed in favor of class objects/arrays
    "solid/prefer-classlist": 0,
  },
} satisfies TSESLint.FlatConfig.Config;

export default v2;
