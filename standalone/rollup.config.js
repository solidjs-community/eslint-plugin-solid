// lifted from @typescript-eslint/website-eslint/rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";

import replace from "./rollup-plugin-replace";

module.exports = {
  input: "index.js",
  output: {
    format: "module",
    interop: "auto",
    freeze: false,
    sourcemap: true,
    file: "dist.mjs",
  },
  external: ["vs/language/typescript/tsWorker", "typescript"],
  plugins: [
    replace({
      verbose: true,
      alias: [
        // import eslint from eslint-plugin-solid deps for consistency with ../dist
        {
          match: /^eslint$/,
          target: "../node_modules/eslint",
        },
        {
          // those files should be omitted, we do not want them to be exposed to web
          match: [
            /\beslint\/lib\/(rule-tester|eslint|cli-engine|init|unsupported-api)\//u,
            /\beslint\/lib\/cli\.js$/,
            /\bts-eslint\/ESLint\.js/,
            /\brule-tester\b|\bRuleTester\.js\b/,
            /\bCLIEngine\.js\b/,
            /^typescript-estree\/dist\/create-program\/createWatchProgram\.js/,
            /^typescript-estree\/dist\/create-program\/createProjectProgram\.js/,
            /^typescript-estree\/dist\/create-program\/createIsolatedProgram\.js/,
            /^eslint\/lib\/shared\/ajv$/,
            "eslint/lib/shared/runtime-info.js",
            /\bajv\/lib\/definition_schema\.js/,
            /^stream$/,
            /^os$/,
            // /\bresolve\b/,
            /^fs$/,
            /\bmodule\b/,
            /^crypto$/,
          ],
          target: "./mock/empty.js",
        },
        {
          // assert for web
          match: /^assert$/u,
          target: "./mock/assert.js",
        },
        {
          // path for web
          match: /^path$|^path\/posix$/u,
          target: "./mock/path.js",
        },
        {
          // util for web
          match: /^util$/u,
          target: "./mock/util.js",
        },
        {
          // semver simplified, solve issue with circular dependencies
          match: /semver$/u,
          target: "./mock/semver.js",
        },
        {
          match: /^globby$/u,
          target: "./mock/globby.js",
        },
        {
          match: /^is-glob$/u,
          target: "./mock/is-glob.js",
        },
        {
          match: /^glob-parent$/,
          target: "./mock/glob-parent.js",
        },
      ],
      replace: [
        {
          // we do not want dynamic imports
          match: /eslint\/lib\/linter\/rules\.js$/u,
          test: /require\(this\._rules\[ruleId\]\)/g,
          replace: "null",
        },
        {
          // esquery has both browser and node versions, we are bundling browser version that has different export
          test: /esquery\.parse\(/g,
          replace: "esquery.default.parse(",
        },
        {
          // esquery has both browser and node versions, we are bundling browser version that has different export
          test: /esquery\.matches\(/g,
          replace: "esquery.default.matches(",
        },
        {
          // replace these env vars with false
          test: /process\.env\.(?:DEBUG|NODE_DEBUG|TIMING)/g,
          replace: "false",
        },
        {
          // replace all process.env.IGNORE_TEST_WIN32 with true
          test: /process\.env\.IGNORE_TEST_WIN32/g,
          replace: "true",
        },
        {
          // mock all other env vars as unset
          test: /process\.env\.\w+/gu,
          replace: "undefined",
        },
        {
          test: /process.cwd\(\)/g,
          replace: "'~'",
        },
        {
          test: /process\.emitWarning/g,
          replace: "console.log",
        },
        {
          test: /__filename/g,
          replace: "''",
        },
      ],
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json({ preferConst: true }),
  ],
};
