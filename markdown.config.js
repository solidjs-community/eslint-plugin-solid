"use strict";

/* eslint-disable */

const { rules, configs } = require("./index");

const recommendedRules = Object.keys(configs.recommended.rules);
const ruleTableRows = Object.keys(rules)
  .sort()
  .map((id) => {
    const { fixable, docs } = rules[id].meta;
    return [
      recommendedRules.includes(id) ? "✔" : "",
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

module.exports = {
  transforms: {
    RULES,
  },
};
