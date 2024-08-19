// @ts-check

import tseslint from "typescript-eslint";
import globals from "globals";
import solid from "eslint-plugin-solid";

export default tseslint.config({
  files: ["{valid,invalid}/**/*.{js,jsx,ts,tsx}"],
  ...solid.configs["flat/recommended"],
  languageOptions: {
    globals: globals.browser,
    parser: tseslint.parser,
    parserOptions: {
      project: null,
    },
  },
});
