"use strict";

/* eslint-disable */
function importDefault(mod) {
  return mod && mod.__esModule ? mod : { default: mod };
}

const path = require("path");
const markdownMagic = require("markdown-magic");
console.log(importDefault(require("../dist/index")));
const { rules, configs } = importDefault(require("../dist/index")).default;

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

const buildRulesTable = (rows) => {
  const header = "✔ | 🔧 | Rule | Description";
  const separator = ":---: | :---: | :--- | :---";

  return [header, separator, ...rows].map((row) => `| ${row} |`).join("\n");
};

const RULES = () => buildRulesTable(ruleTableRows);

markdownMagic(path.join(__dirname, "..", "README.md"), {
  transforms: {
    RULES,
  },
});
