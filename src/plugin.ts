/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

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

// Use require() so that `package.json` doesn't get copied to `dist`
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { name, version } = require("../package.json");
const meta = { name, version };

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

export const plugin = { meta, rules: allRules };
