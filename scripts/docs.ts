import path from "path";
// @ts-expect-error no types for v3
import { markdownMagic } from "markdown-magic";
import prettier from "prettier";
import type { TSESLint } from "@typescript-eslint/utils";
import * as plugin from "../src/index";
import type {
  JSONSchema4,
  JSONSchema4ArraySchema,
  JSONSchema4TypeName,
} from "@typescript-eslint/utils/json-schema";

const { rules, configs } = plugin;

const ruleTableRows = (Object.keys(rules) as Array<keyof typeof rules>).sort().map((id) => {
  const { fixable, docs } = rules[id].meta;
  return [
    configs.recommended.rules[`solid/${id}`] ? "✔" : "",
    fixable ? "🔧" : "",
    `[solid/${id}](docs/${id}.md)`,
    docs?.description,
  ]
    .filter((str): str is NonNullable<typeof str> => str != null)
    .join(" | ");
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
const getLevelForRule = (
  ruleName: `solid/${string}`,
  formatter: (options: Options) => string
): string =>
  ruleName in configs.recommended.rules
    ? formatter(configs.recommended.rules[ruleName as keyof typeof configs.recommended.rules])
    : formatter(0);

const buildRulesTable = (rows: Array<string>) => {
  const header = "✔ | 🔧 | Rule | Description";
  const separator = ":---: | :---: | :--- | :---";

  return [header, separator, ...rows].map((row) => `| ${row} |`).join("\n");
};

const buildHeader = (filename: string): string => {
  const ruleName = filename.replace(/\.md$/, "");
  if (!(ruleName in rules) || !rules[ruleName as keyof typeof rules]) return " ";

  const meta: TSESLint.RuleMetaData<string, unknown> = rules[ruleName as keyof typeof rules].meta;
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
  if (!(ruleName in rules) || !rules[ruleName as keyof typeof rules]) return " ";

  const schema = rules[ruleName as keyof typeof rules].meta.schema;
  // 'length' checks if array, Array.isArray doesn't narrow properly
  const schema0 = "length" in schema ? schema[0] : schema;
  if (!schema0) return " ";

  const properties = "properties" in schema0 ? schema0.properties : null;
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
      let type: string | Array<JSONSchema4TypeName> | undefined = properties[prop].type;
      const _default = properties[prop].default;
      if (type === "array") {
        const itemsSchema = (properties[prop] as JSONSchema4ArraySchema).items as JSONSchema4;
        type = `Array<${itemsSchema.type}>`;
      } else if (type === "string" && "enum" in properties[prop]) {
        type = properties[prop].enum!.map((s) => JSON.stringify(s)).join(" | ");
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

const pretty = (code: string) => prettier.format(code, { parser: "typescript" }).trim();
const options = (options: Array<any>) =>
  options
    .map((o) =>
      JSON.stringify(o)
        .replace(/([,{:])/g, "$1 ")
        .replace(/[}]/g, " }")
    )
    .join(", ");

const buildCases = async (content: string, filename: string) => {
  const ruleName = filename.replace(/\.md$/, "");
  const testPath = path.resolve(__dirname, "..", "test", "rules", `${ruleName}.test.ts`);
  let cases: any;
  try {
    cases = (await import(testPath))?.cases;
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

const buildTilde = async () => {
  const { version } = (await import("../package.json")).default;
  return [
    "```diff",
    `- "eslint-plugin-solid": "^${version}"\n+ "eslint-plugin-solid": "~${version}"`,
    "```",
  ].join("\n");
};

async function run() {
  await markdownMagic(path.join(__dirname, "..", "README.md"), {
    transforms: {
      RULES: () => buildRulesTable(ruleTableRows),
      TILDE: () => buildTilde(),
    },
    failOnMissingTransforms: true,
  });
  await markdownMagic(path.resolve(__dirname, "..", "docs", "*.md"), {
    transforms: {
      HEADER: ({ srcPath }: any) => buildHeader(path.basename(srcPath)),
      OPTIONS: ({ srcPath }: any) => buildOptions(path.basename(srcPath)),
      CASES: ({ content, srcPath }: any) => buildCases(content, path.basename(srcPath)),
    },
    failOnMissingTransforms: true,
  });
}
run();
