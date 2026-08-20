// Local template vetting harness: runs the solid v2 config over the real
// Solid 2.0 templates in a sibling checkout. Expected result: zero errors and
// zero warnings. Not run in CI (CI uses the fixture copies in templates-v2/);
// run manually with `node lint-templates.mjs [path-to-templates-checkout]`.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import globals from "globals";
import v2Config from "eslint-plugin-solid/configs/v2";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesRoot = path.resolve(dirname, process.argv[2] ?? "../../templates");

if (!fs.existsSync(templatesRoot)) {
  console.error(`Templates checkout not found at ${templatesRoot}`);
  process.exit(2);
}

// Only solid-v2/* targets Solid 2.0. The solid-start-v2/* directory is
// SolidStart 2.0, which still runs Solid 1.x — linting it with the v2 config
// correctly reports its 1.x patterns, which is noise here. (When SolidStart
// moves to Solid 2.0, add "solid-start-v2" back.)
const groups = ["solid-v2"].filter((g) => fs.existsSync(path.join(templatesRoot, g)));

const eslint = new ESLint({
  cwd: templatesRoot,
  overrideConfigFile: true,
  overrideConfig: [
    // generated files (e.g. TanStack Router route trees) are not template code
    { ignores: ["**/*.gen.ts", "**/*.d.ts"] },
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      ...v2Config,
      languageOptions: {
        ...v2Config.languageOptions,
        globals: globals.browser,
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
  ],
});

let errorCount = 0;
let warningCount = 0;
for (const group of groups) {
  const templates = fs
    .readdirSync(path.join(templatesRoot, group), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const template of templates) {
    const srcDir = path.join(templatesRoot, group, template, "src");
    if (!fs.existsSync(srcDir)) continue;
    const results = await eslint.lintFiles(path.join(srcDir, "**/*.{js,jsx,ts,tsx}"));
    for (const result of results) {
      errorCount += result.errorCount;
      warningCount += result.warningCount;
      for (const message of result.messages) {
        const rel = path.relative(templatesRoot, result.filePath);
        const severity = message.severity === 2 ? "error" : "warn";
        console.log(
          `${rel}:${message.line}:${message.column} [${severity}] ${message.ruleId ?? "parse"}: ${message.message}`
        );
      }
    }
  }
}

console.log(`\n${errorCount} errors, ${warningCount} warnings`);
process.exit(errorCount + warningCount > 0 ? 1 : 0);
