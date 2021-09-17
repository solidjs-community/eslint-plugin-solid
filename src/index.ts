import jsxNoUndef from "./rules/jsx-no-undef";
import jsxUsesVars from "./rules/jsx-uses-vars";
// import noDestructure from './rules/no-destructure';
import noInnerHTML from "./rules/no-innerhtml";
import noReactSpecificProps from "./rules/no-react-specific-props";
import noUnknownNamespaces from "./rules/no-unknown-namespaces";
// import noUselessKeys from './rules/no-useless-keys';
import preferClasslist from "./rules/prefer-classlist";
import preferFor from "./rules/prefer-for";
// import reactivity from './rules/reactivity';
import styleProp from "./rules/style-prop";

const allRules = {
  "jsx-no-undef": jsxNoUndef,
  "jsx-uses-vars": jsxUsesVars,
  // 'no-destructure': noDestructure,
  "no-innerhtml": noInnerHTML,
  "no-react-specific-props": noReactSpecificProps,
  "no-unknown-namespaces": noUnknownNamespaces,
  // noUselessKeys,
  "prefer-classlist": preferClasslist,
  "prefer-for": preferFor,
  // reactivity,
  "style-prop": styleProp,
};

// Must be module.exports for eslint to load everything
module.exports = {
  rules: allRules,
  configs: {
    recommended: {
      plugins: ["solid"],
      env: {
        browser: true,
        es6: true,
      },
      parserOptions: {
        ecmaVersion: 6,
        ecmaFeatures: {
          jsx: true,
          impliedStrict: true,
        },
      },
      rules: {
        // identifier usage is important
        "solid/jsx-no-undef": 2,
        "solid/jsx-uses-vars": 2,
        "solid/no-unknown-namespaces": 2,
        // incorrect usages of innerHTML, <For />, and style are security or logic errors
        "solid/no-innerhtml": [2, { allowStatic: true }],
        "solid/prefer-for": 2,
        "solid/style-prop": 2,
        // these rules are mostly style suggestions
        "solid/no-react-specific-props": 1,
        "solid/prefer-classlist": 1,
      },
    },
  },
};
