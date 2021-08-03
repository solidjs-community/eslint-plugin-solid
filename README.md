# eslint-plugin-solid

[![npm version](https://img.shields.io/npm/v/eslint-plugin-solid)](https://npmjs.com/packages/eslint-plugin-solid)
[![GitHub package version](https://img.shields.io/github/package-json/v/joshwilsonvu/eslint-plugin-solid)](https://github.com/joshwilsonvu/eslint-plugin-solid)
[![CI](https://github.com/joshwilsonvu/eslint-plugin-solid/actions/workflows/ci.yml/badge.svg)](https://github.com/joshwilsonvu/eslint-plugin-solid/actions/workflows/ci.yml)
![ESLint peer dependency](https://img.shields.io/badge/eslint-6.x--7.x-blue)

This package contains [Solid](https://www.solidjs.com/)-specific linting rules for ESLint.

It is not yet stable, and **some rules may change**, but it's well tested and should
be helpful in Solid projects today.

Once finalized, it will help find and fix problems around Solid's reactivity system,
and migrate React code to Solid code in many cases.

## Installation

Install `eslint` and `eslint-plugin-solid` locally.

```sh
npm install --save-dev eslint eslint-plugin-solid
# or
yarn add --dev eslint eslint-plugin-solid
```

## Configuration

Use our preset configuration to get reasonable defaults.

```json
{
  "plugins": ["solid"],
  "extends": ["eslint/recommended", "plugin:solid/recommended"]
}
```

> Pre-1.0.0, the `recommended` configuation will be stable across patch (`0.0.x`) versions,
> but may change across minor (`0.x`) versions. If you want to pin a minor version,
> use a tilde in your `package.json`.

```diff
- "eslint-plugin-solid": "^0.1.0"
+ "eslint-plugin-solid": "~0.1.0"
```

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
    "solid/jsx-no-undef": 2
  }
}
```

## Rules

✔: Enabled in the `recommended` configuration.

🔧: Fixable with [`eslint --fix`](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).

<!-- AUTO-GENERATED-CONTENT:START (RULES) -->
| ✔ | 🔧 | Rule | Description |
| :---: | :---: | :--- | :--- |
| ✔ | 🔧 | [solid/jsx-no-undef](docs/rules/jsx-no-undef.md) | Prevents references to undefined variables in JSX. |
| ✔ |  | [solid/jsx-uses-vars](docs/rules/jsx-uses-vars.md) | Prevent variables used in JSX from being marked as unused. |
| ✔ | 🔧 | [solid/no-innerhtml](docs/rules/no-innerhtml.md) | Prevents usage of the innerHTML attribute, which can often lead to security vulnerabilities |
| ✔ | 🔧 | [solid/no-react-specific-props](docs/rules/no-react-specific-props.md) | Prevents usage of React-specific `className`/`htmlFor` props (though they are supported for compatibility). |
| ✔ |  | [solid/no-unknown-namespaces](docs/rules/no-unknown-namespaces.md) | Ensures that only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`) are used. |
| ✔ | 🔧 | [solid/prefer-classlist](docs/rules/prefer-classlist.md) | Recommends using the classlist prop over importing a classnames helper. The classlist prop accepts an object `{ [class: string]: boolean }` just like classnames. |
| ✔ | 🔧 | [solid/prefer-for](docs/rules/prefer-for.md) | Recommends using Solid's `<For />` component for mapping an array to JSX elements. |
| ✔ | 🔧 | [solid/style-prop](docs/rules/style-prop.md) | Ensures CSS properties in the `style` prop are valid and kebab-cased (ex. 'font-size'), not camel-cased (ex. 'fontSize') like in React, and that property values are strings, not numbers with implicit 'px' units. |
<!-- AUTO-GENERATED-CONTENT:END -->
