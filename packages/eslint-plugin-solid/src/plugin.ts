/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */

import type { TSESLint } from "@typescript-eslint/utils";

import componentsReturnOnce from "./rules/components-return-once.js";
import eventHandlers from "./rules/event-handlers.js";
import imports from "./rules/imports.js";
import jsxNoDuplicateProps from "./rules/jsx-no-duplicate-props.js";
import jsxNoScriptUrl from "./rules/jsx-no-script-url.js";
import jsxNoUndef from "./rules/jsx-no-undef.js";
import jsxUsesVars from "./rules/jsx-uses-vars.js";
import noAccessorAsProp from "./rules/no-accessor-as-prop.js";
import noBrowserGlobalsInServerFunction from "./rules/no-browser-globals-in-server-function.js";
import noDestructure from "./rules/no-destructure.js";
import noInnerHTML from "./rules/no-innerhtml.js";
import noInvalidServerCapture from "./rules/no-invalid-server-capture.js";
import noModuleScopeReactivePrimitive from "./rules/no-module-scope-reactive-primitive.js";
import noProxyApis from "./rules/no-proxy-apis.js";
import noReactDeps from "./rules/no-react-deps.js";
import noReactSpecificProps from "./rules/no-react-specific-props.js";
import noRestatedDefaultOptions from "./rules/no-restated-default-options.js";
import noSingleArgCreateEffect from "./rules/no-single-arg-create-effect.js";
import noUnknownNamespaces from "./rules/no-unknown-namespaces.js";
import preferClasslist from "./rules/prefer-classlist.js";
import preferFor from "./rules/prefer-for.js";
import preferOnSettledForSideEffects from "./rules/prefer-onSettled-for-side-effects.js";
import preferShow from "./rules/prefer-show.js";
import preferStructuredClass from "./rules/prefer-structured-class.js";
import reactivity from "./rules/reactivity.js";
import removedApi from "./rules/removed-api.js";
import requireAsyncServerFunction from "./rules/require-async-server-function.js";
import selfClosingComp from "./rules/self-closing-comp.js";
import styleProp from "./rules/style-prop.js";
import validUseServer from "./rules/valid-use-server.js";
import noArrayHandlers from "./rules/no-array-handlers.js";
// import validateJsxNesting from "./rules/validate-jsx-nesting.js";

import packageJson from "../package.json" with { type: "json" };

const { name, version } = packageJson;
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

export const plugin = {
  meta,
  rules: allRules,
  configs: {} as Record<string, TSESLint.FlatConfig.Config>,
};
