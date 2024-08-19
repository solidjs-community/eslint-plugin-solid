// @ts-check

import tseslint from "typescript-eslint";
import globals from "globals";
import recommendedConfig from "eslint-plugin-solid/configs/recommended";

export default tseslint.config({
  files: ["{valid,invalid}/**/*.{js,jsx,ts,tsx}"],
  ...recommendedConfig,
  languageOptions: {
    globals: globals.browser,
    parser: tseslint.parser,
    parserOptions: {
      project: null,
    },
  },
});
