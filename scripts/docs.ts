/* eslint-disable @typescript-eslint/no-var-requires */
import path from "path";
import fs from "fs-extra";
import markdownMagic from "markdown-magic";
import prettier from "prettier";
import type { TSESLint } from "@typescript-eslint/utils";
const plugin = require("../src/index");

const { rules, configs } = plugin;

const ruleTableRows = Object.keys(rules)
  .sort()
  .map((id) => {
    const { fixable, docs } = rules[id].meta;
    return [
      configs.recommended.rules[`solid/${id}`] ? "✔" : "",
      fixable ? "🔧" : "",
      `[solid/${id}](docs/${id}.md)`,
      docs.description,
    ].join(" | ");
  });

type Level = 0 | 1 | 2 | "off" | "warn" | "error";
type Options = Level | [Level, ...unknown[]];

const formatLevel = (options: Options): string => {
  if (Array.isArray(options)) {
    return formatLevel(options[0]);
  } else {
    return {
      "0": "off",
      "1": "a warning",
      "2": "an error",
      off: "off",
      warn: "a warning",
      error: "an error",
    }[options];
  }
};
const configLevel = (options: Options): Extract<Level, string> => {
  if (Array.isArray(options)) {
    return configLevel(options[0]);
  } else {
    return typeof options === "number" ? (["off", "warn", "error"] as const)[options] : options;
  }
};
const getLevelForRule = (ruleName: string, formatter: (options: Options) => string) =>
  ruleName in configs.recommended.rules
    ? formatter(configs.recommended.rules[ruleName])
    : formatter(0);

const buildRulesTable = (rows: Array<string>) => {
  const header = "✔ | 🔧 | Rule | Description";
  const separator = ":---: | :---: | :--- | :---";

  return [header, separator, ...rows].map((row) => `| ${row} |`).join("\n");
};

const buildHeader = (filename: string): string => {
  const ruleName = filename.replace(/\.md$/, "");
  if (!rules[ruleName]) return " ";
  const meta: TSESLint.RuleMetaData<never> = rules[ruleName].meta;
  return [
    `# solid/${ruleName}`,
    meta.docs?.description,
    `This rule is ${meta.deprecated ? "**deprecated** and " : ""}**${getLevelForRule(
      `solid/${ruleName}`,
      formatLevel
    )}** by default.\n`,
    `[View source](../src/rules/${ruleName}.ts) · [View tests](../test/rules/${ruleName}.test.ts)\n`,
  ].join("\n");
};

const buildOptions = (filename: string): string => {
  const ruleName = filename.replace(/\.md$/, "");
  if (!rules[ruleName]) return " ";
  const properties = rules[ruleName].meta.schema?.[0]?.properties;
  if (!properties) return " ";
  return [
    "## Rule Options\n",
    `Options shown here are the defaults. ${
      Object.keys(properties).some((prop) => properties[prop].type === "array")
        ? "Manually configuring an array will *replace* the defaults."
        : ""
    }\n`,
    "```js",
    "{",
    `  "solid/${ruleName}": ["${getLevelForRule(`solid/${ruleName}`, configLevel)}", { `,
    ...Object.keys(properties).map((prop) => {
      let type = properties[prop].type;
      const _default = properties[prop].default;
      if (type === "array") {
        type = `Array<${properties[prop].items.type}>`;
      } else if (type === "string" && properties[prop].enum) {
        type = properties[prop].enum.map((s: string) => JSON.stringify(s)).join(" | ");
      }
      return `    // ${properties[prop].description}\n    ${prop}: ${JSON.stringify(_default)}, ${
        type !== "boolean" ? "// " + type : ""
      }`;
    }),
    "  }]",
    "}",
    "```\n",
  ].join("\n");
};

const pretty = (code: string) => prettier.format(code, { parser: "babel" }).trim();
const options = (options: Array<any>) =>
  options
    .map((o) =>
      JSON.stringify(o)
        .replace(/([,{:])/g, "$1 ")
        .replace(/[}]/g, " }")
    )
    .join(", ");

const buildCases = (content: string, filename: string) => {
  const ruleName = filename.replace(/\.md$/, "");
  const testPath = path.resolve(__dirname, "..", "test", "rules", `${ruleName}.test.ts`);
  let cases: any;
  try {
    cases = require(testPath)?.cases;
  } catch {
    return content;
  }
  if (!cases) {
    return content;
  }
  const valid = cases.valid?.map((c: any) => (typeof c === "string" ? { code: c } : c)) ?? [];
  const invalid = cases.invalid ?? [];

  const allFixed = invalid.every((c: any) => c.output);
  const someFixed = !allFixed && invalid.some((c: any) => c.output);

  const markdown = [
    "## Tests\n",
    "### Invalid Examples\n",
    `These snippets cause lint errors${allFixed ? ", and all of them can be auto-fixed" : ""}${
      someFixed ? ", and some can be auto-fixed" : ""
    }.\n`,
    "```js",
    invalid.map((c: any) => [
      c.options && `/* eslint solid/${ruleName}: ["error", ${options(c.options)}] */`,
      pretty(c.code),
      c.output && "// after eslint --fix:\n" + pretty(c.output),
      " ",
    ]),
    "```\n",
    "### Valid Examples\n",
    "These snippets don't cause lint errors.\n",
    "```js",
    valid.map((c: any) => [
      c.options && `/* eslint solid/${ruleName}: ["error", ${options(c.options)}] */`,
      pretty(c.code) + "\n",
    ]),
    "```",
  ]
    .flat(3)
    .filter(Boolean)
    .join("\n");
  return markdown;
};

const buildTilde = () => {
  const { version } = require("../package.json");
  return [
    "```diff",
    `- "eslint-plugin-solid": "^${version}"\n+ "eslint-plugin-solid": "~${version}"`,
    "```",
  ].join("\n");
};

async function run() {
  markdownMagic(path.join(__dirname, "..", "README.md"), {
    transforms: {
      RULES: () => buildRulesTable(ruleTableRows),
      TILDE: () => buildTilde(),
    },
  });

  const docRoot = path.resolve(__dirname, "..", "docs");
  const docFiles = (await fs.readdir(docRoot)).filter((p) => p.endsWith(".md"));
  for (const docFile of docFiles) {
    markdownMagic(path.join(docRoot, docFile), {
      transforms: {
        HEADER: () => buildHeader(docFile),
        OPTIONS: () => buildOptions(docFile),
        CASES: (content: string) => buildCases(content, docFile),
      },
    });
  }
}

run();
