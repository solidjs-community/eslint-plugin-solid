// @ts-check

import tseslint from "typescript-eslint";
import globals from "globals";
import v2Config from "eslint-plugin-solid/configs/v2";

export default tseslint.config({
  files: ["templates-v2/**/*.{js,jsx,ts,tsx}"],
  ...v2Config,
  languageOptions: {
    globals: globals.browser,
    parser: tseslint.parser,
    parserOptions: {
      project: null,
    },
  },
});
