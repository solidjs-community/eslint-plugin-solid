# Contributing to `eslint-plugin-solid`

Thanks for your interest in improving this project! We welcome questions, bug reports, and feature
requests. Please file an issue before submitting a PR, and fill out applicable details in the chosen
issue template.

> Please see our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

## Development

This project uses `pnpm` for package management. Run `pnpm i` to install dependencies after cloning
the repo.

To type-check and build the code, run `pnpm build`. This will also regenerate the docs from source
code descriptions and test cases, using `scripts/docs.ts`.

`pnpm lint` runs ESLint on the repo (so meta!).

Testing is _extremely_ important to maintaining the quality of this project, so we require
comprehensive tests for every rule, and we check against example code provided in the docs. To run
tests for individual rules as well as integration/e2e tests, run `pnpm test`. To run tests for a
specific rule like `reactivity`, run `pnpm test reactivity` or `pnpm test reactivity --watch`.
Before releasing new versions, we run tests against various ESLint parsers with `pnpm test:all`.

### Adding a new rule

For each rule, there's a few things to do for it to be ready for release. Let's say you have
received approval to add a rule named `solid/some-name` in an issue:

1. Create `src/rules/some-name.ts`. Add the necessary imports and a default export of the form `{
   meta: { ... }, create() { ... } }`.
   [`solid/no-react-specific-props`](./src/rules/no-react-specific-props.ts) is a good, brief
   example of what's necessary.
2. Create `test/rules/some-name.test.ts`. Add `valid` and `invalid` test cases, using other files
   for inspiration. Be sure to `export const cases` so `scripts/docs.ts` can pick up the test cases.
3. Create `docs/rules/some-name.md`. You can copy the content of
   `docs/rules/no-react-specific-props.md` directly, as all of its content is auto-generated. Run
   `pnpm build` and then verify that the content has been updated to reflect the new rule.
4. When good tests are written and passing, open `src/index.ts` and import your new rule. Add it to
   `allRules` and the `recommended` and `typescript` configs as appropriate.
5. Submit your PR and await feedback. When any necessary changes have been made, it will be merged.
   Congratulations!

## Publishing

Publishing is currently done manually by @joshwilsonvu. When publishing a new version of
`eslint-plugin-solid`, we also publish a corresponding version of `eslint-plugin-standalone`, which
is a package primarily intended to support linting on https://playground.solidjs.com.
