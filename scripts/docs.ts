import path from "path";
import fs from "fs/promises";
import markdownMagic from "markdown-magic";
import prettier from "prettier";
import plugin from "../src/index";
import type { Cases } from "../test/ruleTester";

const { rules, configs } = plugin;

const recommendedRules = Object.keys(configs.recommended.rules);
const ruleTableRows = Object.keys(rules)
  .sort()
  .map((id) => {
    const { fixable, docs } = rules[id].meta;
    return [
      recommendedRules.includes(`solid/${id}`) ? "✔" : "",
      fixable ? "🔧" : "",
      `[solid/${id}](docs/rules/${id}.md)`,
      docs.description,
    ].join(" | ");
  });

const formatLevel = (options) => {
  if (Array.isArray(options)) {
    return formatLevel(options[0]);
  } else {
    return {
      "0": "off",
      "1": "a warning",
      "2": "an error",
      warn: "a warning",
      error: "an error",
    }[options];
  }
};
const getLevelForRule = (ruleName) =>
  ruleName in configs.recommended.rules ? formatLevel(configs.recommended.rules[ruleName]) : "off";

const buildRulesTable = (rows) => {
  const header = "✔ | 🔧 | Rule | Description";
  const separator = ":---: | :---: | :--- | :---";

  return [header, separator, ...rows].map((row) => `| ${row} |`).join("\n");
};

const buildHeader = (filename) => {
  const ruleName = filename.replace(/\.md$/, "");
  if (!rules[ruleName]) return;
  const description = rules[ruleName].meta.docs.description;
  return [
    `# solid/${ruleName}`,
    description,
    `This rule is **${getLevelForRule(`solid/${ruleName}`)}** by default.\n`,
    `[View source](../src/rules/${ruleName}.ts) · [View tests](../test/rules/${ruleName}.test.ts)\n`,
  ].join("\n");
};

const buildOptions = (filename) => {
  const ruleName = filename.replace(/\.md$/, "");
  if (!rules[ruleName]) return;
  const properties = rules[ruleName].meta.schema?.[0]?.properties;
  if (!properties) return;
  return [
    "## Rule Options\n",
    "```\n" + `  "${ruleName}": ["error", { "<key>": "<value>" }]\n` + "```\n",
    "Key | Type | Description",
    ":--- | :---: | :---",
    ...Object.keys(properties).map((prop) => {
      let type = properties[prop].type;
      const default_ = properties[prop].default;
      if (type === "array") {
        type = `Array<${properties[prop].items.type}>`;
      }
      return `${prop} | \`${type}\` | ${properties[prop].description ?? ""} ${
        default_ ? `*Default \`${default_}\`*.` : ""
      }`;
    }),
  ].join("\n");
};

const pretty = (code) => prettier.format(code, { parser: "babel" }).trim();
const options = (options) =>
  options
    .map((o) =>
      JSON.stringify(o)
        .replace(/([,{:])/g, "$1 ")
        .replace(/[}]/g, " }")
    )
    .join(", ");

const buildCases = (content, filename) => {
  const ruleName = filename.replace(/\.md$/, "");
  const testPath = path.resolve(__dirname, "..", "test", "rules", `${ruleName}.test.ts`);
  let cases: Cases | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cases = require(testPath)?.cases;
  } catch {
    return content;
  }
  if (!cases) {
    return content;
  }
  const valid = cases.valid.map((c) => (typeof c === "string" ? { code: c } : c)) ?? [];
  const invalid = cases.invalid ?? [];

  const markdown = [
    "### Valid Examples\n",
    "These snippets don't cause lint errors.\n",
    "```js",
    valid.map((c) => [
      c.options && `/* eslint solid/${ruleName}: ["error", ${options(c.options)}] */`,
      pretty(c.code) + "\n",
    ]),
    "```\n",
    "### Invalid Examples\n",
    "These snippets cause lint errors, and some can be auto-fixed.\n",
    "```js",
    invalid.map((c) => [
      c.options && `/* eslint solid/${ruleName}: ["error", ${options(c.options)}] */`,
      pretty(c.code),
      c.output && "// after eslint --fix:\n" + pretty(c.output),
      " ",
    ]),
    "```",
  ]
    .flat(3)
    .filter(Boolean)
    .join("\n");
  return markdown;
};

async function run() {
  markdownMagic(path.join(__dirname, "..", "README.md"), {
    transforms: {
      RULES: () => buildRulesTable(ruleTableRows),
    },
  });

  const docRoot = path.resolve(__dirname, "..", "docs");
  const docFiles = (await fs.readdir(docRoot)).filter((p) => p.endsWith(".md"));
  for (const docFile of docFiles) {
    markdownMagic(path.join(docRoot, docFile), {
      transforms: {
        HEADER: () => buildHeader(docFile),
        OPTIONS: () => buildOptions(docFile),
        CASES: (content) => buildCases(content, docFile),
      },
    });
  }
}

run();
