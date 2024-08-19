import { Linter } from "eslint/linter";
import * as parser from "@typescript-eslint/parser";
import plugin from "eslint-plugin-solid";
import { version as pluginVersion } from "eslint-plugin-solid/package.json";
import memoizeOne from "memoize-one";

// Create linter instance
const linter = new Linter({ configType: "flat" });

const getConfig = memoizeOne((ruleSeverityOverrides) => {
  const config = [
    {
      languageOptions: {
        parser,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      ...plugin.configs["flat/typescript"],
    },
  ];
  if (ruleSeverityOverrides) {
    // change severity levels of rules based on rules: Record<string, 0 | 1 | 2> arg
    Object.keys(ruleSeverityOverrides).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(config[0].rules, key)) {
        if (Array.isArray(config[0].rules[key])) {
          config[0].rules[key] = [ruleSeverityOverrides[key], ...config[0].rules[key].slice(1)];
        } else {
          config[0].rules[key] = ruleSeverityOverrides[key];
        }
      }
    });
  }
  return config;
});

linter.verify = memoizeOne(linter.verify);
linter.verifyAndFix = memoizeOne(linter.verifyAndFix);

export { plugin, pluginVersion };
export const eslintVersion = linter.version;

export function verify(code, ruleSeverityOverrides) {
  const config = getConfig(ruleSeverityOverrides);
  return linter.verify(code, config);
}

export function verifyAndFix(code, ruleSeverityOverrides) {
  const config = getConfig(ruleSeverityOverrides);
  return linter.verifyAndFix(code, config);
}
