# eslint-solid-standalone

This package bundles ESLint, eslint-plugin-solid, and necessary tooling
together into one package that can be used on the web or in a web worker.

It mainly exists to power ESLint support in the Solid playground.

Heavily inspired/lifted from [@typescript-eslint](https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/website-eslint)'s equivalent setup.

## API

```ts
export function verify(
  code: string,
  ruleSeverityOverrides?: Record<string, Linter.Severity>
): Linter.LintMessage[];

export function verifyAndFix(
  code: string,
  ruleSeverityOverrides?: Record<string, Linter.Severity>
): Linter.FixReport;

export { plugin }; // eslint-plugin-solid
export { pluginVersion, eslintVersion };
```

`code`: a string of source code, supports TS and JSX

`ruleSeverityOverrides`: an optional record of rule id (i.e. "solid/reactivity") to severity (i.e. 0, 1, or 2)
