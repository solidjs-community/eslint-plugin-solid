import componentsReturnOnce from "./rules/components-return-once";
import eventHandlers from "./rules/event-handlers";
import imports from "./rules/imports";
import jsxNoDuplicateProps from "./rules/jsx-no-duplicate-props";
import jsxNoScriptUrl from "./rules/jsx-no-script-url";
import jsxNoUndef from "./rules/jsx-no-undef";
import jsxUsesVars from "./rules/jsx-uses-vars";
import noDestructure from "./rules/no-destructure";
import noInnerHTML from "./rules/no-innerhtml";
import noProxyApis from "./rules/no-proxy-apis";
import noReactDeps from "./rules/no-react-deps";
import noReactSpecificProps from "./rules/no-react-specific-props";
import noUnknownNamespaces from "./rules/no-unknown-namespaces";
import preferClasslist from "./rules/prefer-classlist";
import preferFor from "./rules/prefer-for";
import preferShow from "./rules/prefer-show";
import reactivity from "./rules/reactivity";
import selfClosingComp from "./rules/self-closing-comp";
import styleProp from "./rules/style-prop";
import noArrayHandlers from "./rules/no-array-handlers";
// import validateJsxNesting from "./rules/validate-jsx-nesting";

const allRules = {
  "components-return-once": componentsReturnOnce,
  "event-handlers": eventHandlers,
  imports,
  "jsx-no-duplicate-props": jsxNoDuplicateProps,
  "jsx-no-undef": jsxNoUndef,
  "jsx-no-script-url": jsxNoScriptUrl,
  "jsx-uses-vars": jsxUsesVars,
  "no-destructure": noDestructure,
  "no-innerhtml": noInnerHTML,
  "no-proxy-apis": noProxyApis,
  "no-react-deps": noReactDeps,
  "no-react-specific-props": noReactSpecificProps,
  "no-unknown-namespaces": noUnknownNamespaces,
  "prefer-classlist": preferClasslist,
  "prefer-for": preferFor,
  "prefer-show": preferShow,
  reactivity,
  "self-closing-comp": selfClosingComp,
  "style-prop": styleProp,
  "no-array-handlers": noArrayHandlers,
  // "validate-jsx-nesting": validateJsxNesting
};

export type AllRules = keyof typeof allRules;

const plugin = {
  rules: allRules,
  configs: {
    recommended: {
      plugins: ["solid"],
      env: {
        browser: true,
        es6: true,
      },
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
          impliedStrict: true,
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
    },
    typescript: {
      plugins: ["solid"],
      env: {
        browser: true,
        es6: true,
      },
      rules: {
        // identifier usage is important
        "solid/jsx-no-duplicate-props": 2,
        "solid/jsx-no-undef": [2, { typescriptEnabled: true }],
        "solid/jsx-uses-vars": 2,
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
        // namespaces taken care of by TS
        "solid/no-unknown-namespaces": 0,
        // handled by Solid compiler, opt-in style suggestion
        "solid/prefer-show": 0,
        // only necessary for resource-constrained environments
        "solid/no-proxy-apis": 0,
        // deprecated
        "solid/prefer-classlist": 0,
      },
    },
  },
};
// Must be module.exports for eslint to load everything
module.exports = plugin;

export type Configs = keyof typeof plugin.configs;
