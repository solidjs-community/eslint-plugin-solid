# eslint-plugin-solid

[![npm version](https://img.shields.io/npm/v/eslint-plugin-solid)](https://npmjs.com/packages/eslint-plugin-solid)
[![GitHub package version](https://img.shields.io/github/package-json/v/joshwilsonvu/eslint-plugin-solid)](https://github.com/joshwilsonvu/eslint-plugin-solid)
[![CI](https://github.com/joshwilsonvu/eslint-plugin-solid/actions/workflows/ci.yml/badge.svg)](https://github.com/joshwilsonvu/eslint-plugin-solid/actions/workflows/ci.yml)
![ESLint peer dependency](https://img.shields.io/npm/dependency-version/eslint-plugin-solid/peer/eslint)

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

Use our preset to get reasonable defaults.

```json
{
  "extends": ["eslint/recommended", "plugin:solid/recommended"]
}
```

> Pre-1.0.0, the `recommended` config will be stable across patch (`0.0.x`) versions,
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

<!-- AUTO-GENERATED-CONTENT:START (RULES) -->
<!-- AUTO-GENERATED-CONTENT:END -->
