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
import noAccessorAsProp from "./rules/no-accessor-as-prop";
import noBrowserGlobalsInServerFunction from "./rules/no-browser-globals-in-server-function";
import noDestructure from "./rules/no-destructure";
import noInnerHTML from "./rules/no-innerhtml";
import noInvalidServerCapture from "./rules/no-invalid-server-capture";
import noModuleScopeReactivePrimitive from "./rules/no-module-scope-reactive-primitive";
import noProxyApis from "./rules/no-proxy-apis";
import noReactDeps from "./rules/no-react-deps";
import noReactSpecificProps from "./rules/no-react-specific-props";
import noRestatedDefaultOptions from "./rules/no-restated-default-options";
import noSingleArgCreateEffect from "./rules/no-single-arg-create-effect";
import noUnknownNamespaces from "./rules/no-unknown-namespaces";
import preferClasslist from "./rules/prefer-classlist";
import preferFor from "./rules/prefer-for";
import preferOnSettledForSideEffects from "./rules/prefer-onSettled-for-side-effects";
import preferShow from "./rules/prefer-show";
import preferStructuredClass from "./rules/prefer-structured-class";
import reactivity from "./rules/reactivity";
import removedApi from "./rules/removed-api";
import requireAsyncServerFunction from "./rules/require-async-server-function";
import selfClosingComp from "./rules/self-closing-comp";
import styleProp from "./rules/style-prop";
import validUseServer from "./rules/valid-use-server";
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
  "no-accessor-as-prop": noAccessorAsProp,
  "no-browser-globals-in-server-function": noBrowserGlobalsInServerFunction,
  "no-destructure": noDestructure,
  "no-innerhtml": noInnerHTML,
  "no-invalid-server-capture": noInvalidServerCapture,
  "no-module-scope-reactive-primitive": noModuleScopeReactivePrimitive,
  "no-proxy-apis": noProxyApis,
  "no-react-deps": noReactDeps,
  "no-react-specific-props": noReactSpecificProps,
  "no-restated-default-options": noRestatedDefaultOptions,
  "no-single-arg-create-effect": noSingleArgCreateEffect,
  "no-unknown-namespaces": noUnknownNamespaces,
  "prefer-classlist": preferClasslist,
  "prefer-for": preferFor,
  "prefer-onSettled-for-side-effects": preferOnSettledForSideEffects,
  "prefer-show": preferShow,
  "prefer-structured-class": preferStructuredClass,
  reactivity,
  "removed-api": removedApi,
  "require-async-server-function": requireAsyncServerFunction,
  "self-closing-comp": selfClosingComp,
  "style-prop": styleProp,
  "valid-use-server": validUseServer,
  "no-array-handlers": noArrayHandlers,
  // "validate-jsx-nesting": validateJsxNesting
};

export const plugin = { meta, rules: allRules };
