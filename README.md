<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=ESLint%20Plugin&background=tiles&project=%20" alt="Solid ESLint Extension">
</p>

# Solid ESLint Plugin

[![npm version](https://img.shields.io/npm/v/eslint-plugin-solid?style=for-the-badge)](https://npmjs.com/package/eslint-plugin-solid)
[![GitHub package version](https://img.shields.io/github/package-json/v/solidjs-community/eslint-plugin-solid/main?filename=packages%2Feslint-plugin-solid%2Fpackage.json&style=for-the-badge)](https://github.com/solidjs-community/eslint-plugin-solid)
![ESLint peer dependency](https://img.shields.io/badge/eslint-9.x--10.x-blue?style=for-the-badge)
[![CI](https://github.com/solidjs-community/eslint-plugin-solid/actions/workflows/ci.yml/badge.svg?style=for-the-badge)](https://github.com/solidjs-community/eslint-plugin-solid/actions/workflows/ci.yml)

This package contains [Solid](https://www.solidjs.com/)-specific linting rules for ESLint. It can
ease Solid's learning curve by finding and fixing problems around Solid's reactivity system, and can
migrate some React patterns to Solid code.

It supports both Solid 1.x and Solid 2.0 APIs, requires ESLint v9 or v10 and Node.js 20+, and also
runs under [Oxlint](#oxlint) as a JS plugin.

<!-- doc-gen TOC -->
- [Solid ESLint Plugin](#solid-eslint-plugin)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [TypeScript](#typescript)
    - [Manual Configuration](#manual-configuration)
    - [Oxlint](#oxlint)
  - [Rules](#rules)
  - [Troubleshooting](#troubleshooting)
  - [Versioning](#versioning)
<!-- end-doc-gen -->

## Installation

Install `eslint` and `eslint-plugin-solid` locally.

```sh
npm install --save-dev eslint eslint-plugin-solid
# or
pnpm add --save-dev eslint eslint-plugin-solid
yarn add --dev eslint eslint-plugin-solid

# optional, to create an ESLint config file
npx eslint --init
# or
pnpm eslint --init
yarn eslint --init
```

If you're using VSCode, you'll want to install the [ESLint
extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint). You're
encouraged to enable auto-fixing problems on save by adding the following to your `settings.json`
file.

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

If you're using Vite, you may want to install
[vite-plugin-eslint](https://github.com/gxmari007/vite-plugin-eslint).

You may also want to check out
[eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), which provides
useful rules for writing accessible HTML.

## Configuration

Create an `eslint.config.js` file at the root of your project ([flat
config](https://eslint.org/docs/latest/use/configure/configuration-files) is the only configuration
system supported by ESLint v9+, and by this plugin as of v0.15.0), and use the `recommended`
configuration to get reasonable defaults as shown [below](#rules).

```js
import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/recommended";

export default [
  js.configs.recommended, // replaces eslint:recommended
  solid,
];
```

### TypeScript

If you're using TypeScript, use the `typescript` configuration instead.
This disables some features that overlap with type checking.

```js
import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/typescript";
import * as tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
      },
    },
  },
];
```

Both configs are also available on the plugin's root export, as `solid.configs.recommended` and
`solid.configs.typescript`, after using `import solid from 'eslint-plugin-solid'`. (The
`configs["flat/recommended"]` and `configs["flat/typescript"]` names from v0.14.x still work as
aliases.)

These configurations do not configure global variables in ESLint. You can do this yourself manually
or with a package like [globals](https://www.npmjs.com/package/globals) by creating a configuration
with a `languageOptions.globals` object. We recommend setting up global variables for Browser APIs
as well as at least ES2015.

### Manual Configuration

If you don't want to use a preset, you can configure rules individually. Add the `solid` plugin,
enable JSX with the parser options (or use the equivalent options for `@typescript-eslint/parser` or
`@babel/eslint-parser`), and configure the rules you would like to use. Some rules have additional
options you can set.

```js
import solid from "eslint-plugin-solid";

export default [
  {
    plugins: { solid },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "solid/reactivity": "warn",
      "solid/no-destructure": "warn",
      "solid/jsx-no-undef": "error",
    },
  },
];
```

### Oxlint

The plugin's rules are AST-based, so they run under [Oxlint's JS
plugin support](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) without modification. Add
the plugin to `jsPlugins` in your `.oxlintrc.json` and enable the rules you want:

```json
{
  "jsPlugins": ["eslint-plugin-solid"],
  "rules": {
    "solid/reactivity": "warn",
    "solid/no-destructure": "error",
    "solid/jsx-no-undef": "error"
  }
}
```

## Rules

✔: Enabled in the `recommended` configuration.

🔧: Fixable with [`eslint --fix`](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems)/IDE auto-fix.

<!-- doc-gen RULES -->
| ✔ | 🔧 | Rule | Description |
| :---: | :---: | :--- | :--- |
| ✔ | 🔧 | [solid/components-return-once](/packages/eslint-plugin-solid/docs/components-return-once.md) | Disallow early returns in components. Solid components only run once, and so conditionals should be inside JSX. |
| ✔ | 🔧 | [solid/event-handlers](/packages/eslint-plugin-solid/docs/event-handlers.md) | Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler. |
| ✔ | 🔧 | [solid/imports](/packages/eslint-plugin-solid/docs/imports.md) | Enforce consistent imports from "solid-js", "solid-js/web", and "solid-js/store". |
| ✔ |  | [solid/jsx-no-duplicate-props](/packages/eslint-plugin-solid/docs/jsx-no-duplicate-props.md) | Disallow passing the same prop twice in JSX. |
| ✔ |  | [solid/jsx-no-script-url](/packages/eslint-plugin-solid/docs/jsx-no-script-url.md) | Disallow javascript: URLs. |
| ✔ | 🔧 | [solid/jsx-no-undef](/packages/eslint-plugin-solid/docs/jsx-no-undef.md) | Disallow references to undefined variables in JSX. Handles custom directives. |
| ✔ |  | [solid/jsx-uses-vars](/packages/eslint-plugin-solid/docs/jsx-uses-vars.md) | Prevent variables used in JSX from being marked as unused. |
|  |  | [solid/no-array-handlers](/packages/eslint-plugin-solid/docs/no-array-handlers.md) | Disallow usage of type-unsafe event handlers. |
| ✔ | 🔧 | [solid/no-destructure](/packages/eslint-plugin-solid/docs/no-destructure.md) | Disallow destructuring props. In Solid, props must be used with property accesses (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the parameter list. |
| ✔ | 🔧 | [solid/no-innerhtml](/packages/eslint-plugin-solid/docs/no-innerhtml.md) | Disallow usage of the innerHTML attribute, which can often lead to security vulnerabilities. |
|  |  | [solid/no-proxy-apis](/packages/eslint-plugin-solid/docs/no-proxy-apis.md) | Disallow usage of APIs that use ES6 Proxies, only to target environments that don't support them. |
| ✔ | 🔧 | [solid/no-react-deps](/packages/eslint-plugin-solid/docs/no-react-deps.md) | Disallow usage of dependency arrays in `createEffect` and `createMemo`. |
| ✔ | 🔧 | [solid/no-react-specific-props](/packages/eslint-plugin-solid/docs/no-react-specific-props.md) | Disallow usage of React-specific `className`/`htmlFor` props, which were deprecated in v1.4.0. |
| ✔ |  | [solid/no-unknown-namespaces](/packages/eslint-plugin-solid/docs/no-unknown-namespaces.md) | Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`). |
|  | 🔧 | [solid/prefer-classlist](/packages/eslint-plugin-solid/docs/prefer-classlist.md) | Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames. |
| ✔ | 🔧 | [solid/prefer-for](/packages/eslint-plugin-solid/docs/prefer-for.md) | Enforce using Solid's `<For />` component for mapping an array to JSX elements. |
|  | 🔧 | [solid/prefer-show](/packages/eslint-plugin-solid/docs/prefer-show.md) | Enforce using Solid's `<Show />` component for conditionally showing content. Solid's compiler covers this case, so it's a stylistic rule only. |
| ✔ |  | [solid/reactivity](/packages/eslint-plugin-solid/docs/reactivity.md) | Enforce that reactivity (props, signals, memos, etc.) is properly used, so changes in those values will be tracked and update the view as expected. |
| ✔ | 🔧 | [solid/self-closing-comp](/packages/eslint-plugin-solid/docs/self-closing-comp.md) | Disallow extra closing tags for components without children. |
| ✔ | 🔧 | [solid/style-prop](/packages/eslint-plugin-solid/docs/style-prop.md) | Require CSS properties in the `style` prop to be valid and kebab-cased (ex. 'font-size'), not camel-cased (ex. 'fontSize') like in React, and that property values with dimensions are strings, not numbers with implicit 'px' units. |
<!-- end-doc-gen -->

## Troubleshooting

The rules in this plugin provide sensible guidelines as well as possible, but there may be times
where you know better than the rule and want to ignore a warning. To do that, [add a
comment](https://eslint.org/docs/latest/user-guide/configuring/rules#disabling-rules) like the
following:

```jsx
// eslint-disable-next-line solid/reactivity
const [editedValue, setEditedValue] = createSignal(props.value);
```

_Please note_: there may also be times where a rule correctly warns about a subtle problem,
even if it looks like a false positive at first. With `solid/reactivity`, please look at the
[reactivity docs](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/reactivity.md#troubleshooting) before deciding to disable the rule.

When in doubt, feel free to [file an
issue](https://github.com/solidjs-community/eslint-plugin-solid/issues/new/choose).

## Versioning

Pre-1.0.0, the rules and the `recommended` and `typescript` configuations will be
stable across patch (`0.0.x`) versions, but may change across minor (`0.x`) versions.
If you want to pin a minor version, use a tilde in your `package.json`.

<!-- doc-gen TILDE -->
```diff
- "eslint-plugin-solid": "^0.15.0"
+ "eslint-plugin-solid": "~0.15.0"
```
<!-- end-doc-gen -->
