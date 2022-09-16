# eslint-plugin-solid

[![npm version](https://img.shields.io/npm/v/eslint-plugin-solid)](https://npmjs.com/packages/eslint-plugin-solid)
[![GitHub package version](https://img.shields.io/github/package-json/v/joshwilsonvu/eslint-plugin-solid)](https://github.com/joshwilsonvu/eslint-plugin-solid)
[![CI](https://github.com/joshwilsonvu/eslint-plugin-solid/actions/workflows/ci.yml/badge.svg)](https://github.com/joshwilsonvu/eslint-plugin-solid/actions/workflows/ci.yml)
![ESLint peer dependency](https://img.shields.io/badge/eslint-6.x--8.x-blue)

This package contains [Solid](https://www.solidjs.com/)-specific linting rules for ESLint.
It can ease Solid's learning curve by finding and fixing problems around Solid's reactivity system,
and can migrate some React patterns to Solid code.

It's approaching a `1.0.0` release, and it's well tested and should
be helpful in Solid projects today.

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

If you're using VSCode, you'll want to install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).
If you're using Vite, you may want to install [vite-plugin-eslint](https://github.com/gxmari007/vite-plugin-eslint).

You may also want to check out [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), which provides useful rules for keeping HTML accessible.

## Configuration

Use the `"plugin:solid/recommended"` configuration to get reasonable defaults as shown [below](#rules).

```json
{
  "plugins": ["solid"],
  "extends": ["eslint:recommended", "plugin:solid/recommended"]
}
```

### TypeScript

If you're using TypeScript, use the `"plugin:solid/typescript"` configuration instead.
This disables some features that overlap with type checking.

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["solid"],
  "extends": ["eslint:recommended", "plugin:solid/typescript"]
}
```

### Manual Configuration

If you don't want to use a preset, you can configure rules individually. Add the `"solid"`
plugin, enable JSX with the parser options (or use the equivalent options for
`@typescript-eslint/parser` or `@babel/eslint-parser`), and configure the rules you
would like to use.

```json
{
  "plugins": ["solid"],
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "solid/reactivity": "warn",
    "solid/no-destructure": "warn",
    "solid/jsx-no-undef": "error"
  }
}
```

## Rules

✔: Enabled in the `recommended` configuration.

🔧: Fixable with [`eslint --fix`](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).

<!-- AUTO-GENERATED-CONTENT:START (RULES) -->
| ✔ | 🔧 | Rule | Description |
| :---: | :---: | :--- | :--- |
| ✔ | 🔧 | [solid/components-return-once](docs/components-return-once.md) | Disallow early returns in components. Solid components only run once, and so conditionals should be inside JSX. |
| ✔ | 🔧 | [solid/event-handlers](docs/event-handlers.md) | Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler. |
| ✔ |  | [solid/jsx-no-duplicate-props](docs/jsx-no-duplicate-props.md) | Disallow passing the same prop twice in JSX. |
| ✔ |  | [solid/jsx-no-script-url](docs/jsx-no-script-url.md) | Disallow javascript: URLs. |
| ✔ | 🔧 | [solid/jsx-no-undef](docs/jsx-no-undef.md) | Disallow references to undefined variables in JSX. Handles custom directives. |
| ✔ |  | [solid/jsx-uses-vars](docs/jsx-uses-vars.md) | Prevent variables used in JSX from being marked as unused. |
| ✔ | 🔧 | [solid/no-destructure](docs/no-destructure.md) | Disallow destructuring props. In Solid, props must be used with property accesses (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the parameter list. |
| ✔ | 🔧 | [solid/no-innerhtml](docs/no-innerhtml.md) | Disallow usage of the innerHTML attribute, which can often lead to security vulnerabilities. |
| ✔ | 🔧 | [solid/no-react-specific-props](docs/no-react-specific-props.md) | Disallow usage of React-specific `className`/`htmlFor` props, which were deprecated in v1.4.0. |
| ✔ |  | [solid/no-unknown-namespaces](docs/no-unknown-namespaces.md) | Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`). |
| ✔ | 🔧 | [solid/prefer-classlist](docs/prefer-classlist.md) | Enforce using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames. |
| ✔ | 🔧 | [solid/prefer-for](docs/prefer-for.md) | Enforce using Solid's `<For />` component for mapping an array to JSX elements. |
| ✔ | 🔧 | [solid/prefer-show](docs/prefer-show.md) | Enforce using Solid's `<Show />` component for conditionally showing content. Solid's compiler covers this case, so it's a stylistic rule only. |
| ✔ |  | [solid/reactivity](docs/reactivity.md) | Enforce that reactive expressions (props, signals, memos, etc.) are only used in tracked scopes; otherwise, they won't update the view as expected. |
| ✔ | 🔧 | [solid/self-closing-comp](docs/self-closing-comp.md) | Disallow extra closing tags for components without children. |
| ✔ | 🔧 | [solid/style-prop](docs/style-prop.md) | Require CSS properties in the `style` prop to be valid and kebab-cased (ex. 'font-size'), not camel-cased (ex. 'fontSize') like in React, and that property values with dimensions are strings, not numbers with implicit 'px' units. |
<!-- AUTO-GENERATED-CONTENT:END -->

## Versioning

Pre-1.0.0, the rules and the `recommended` and `typescript` configuations will be
stable across patch (`0.0.x`) versions, but may change across minor (`0.x`) versions.
If you want to pin a minor version, use a tilde in your `package.json`.

<!-- AUTO-GENERATED-CONTENT:START (TILDE) -->
```diff
- "eslint-plugin-solid": "^0.7.3"
+ "eslint-plugin-solid": "~0.7.3"
```
<!-- AUTO-GENERATED-CONTENT:END -->
