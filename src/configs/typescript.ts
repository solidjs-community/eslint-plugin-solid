import { plugin } from "../plugin";
import recommended from "./recommended";

const typescript = {
  files: ["**/*.ts?(x)"],
  plugins: {
    solid: plugin,
  },
  languageOptions: {
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
        impliedStrict: true,
      },
    },
  },
  rules: Object.assign({}, recommended.rules, {
    "solid/jsx-no-undef": [2, { typescriptEnabled: true }],
    // namespaces taken care of by TS
    "solid/no-unknown-namespaces": 0,
  }),
};

export = typescript;
