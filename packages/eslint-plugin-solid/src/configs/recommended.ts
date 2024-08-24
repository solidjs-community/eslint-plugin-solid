import type { TSESLint } from "@typescript-eslint/utils";

import { plugin } from "../plugin";

const recommended = {
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
  rules: {
    // identifier usage is important
    "solid/jsx-no-duplicate-props": 2,
    "solid/jsx-no-undef": 2,
    "solid/jsx-uses-vars": 2,
    "solid/no-unknown-namespaces": 2,
    // security problems
    "solid/no-innerhtml": 2,
    "solid/jsx-no-script-url": 2,
    // reactivity
    "solid/components-return-once": 1,
    "solid/no-destructure": 2,
    "solid/prefer-for": 2,
    "solid/reactivity": 1,
    "solid/event-handlers": 1,
    // these rules are mostly style suggestions
    "solid/imports": 1,
    "solid/style-prop": 1,
    "solid/no-react-deps": 1,
    "solid/no-react-specific-props": 1,
    "solid/self-closing-comp": 1,
    "solid/no-array-handlers": 0,
    // handled by Solid compiler, opt-in style suggestion
    "solid/prefer-show": 0,
    // only necessary for resource-constrained environments
    "solid/no-proxy-apis": 0,
    // deprecated
    "solid/prefer-classlist": 0,
  },
} satisfies TSESLint.FlatConfig.Config;

export = recommended;
