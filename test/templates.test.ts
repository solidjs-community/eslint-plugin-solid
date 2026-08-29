import { test, expect } from "vitest";

import path from "path";
import { ESLint } from "eslint";

// The templates-v2/ directory contains sources copied from the official Solid
// 2.0 templates (github.com/solidjs/templates, solid-v2/*). The v2 config is
// what those templates ship, so it must produce zero findings on them. The
// full sibling-checkout sweep lives in lint-templates.mjs (local only).
const cwd = __dirname;

test.concurrent("solid 2.0 template fixtures lint clean under configs/v2", async () => {
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: "./eslint.config.v2.js",
  } as any);
  const results = await eslint.lintFiles("templates-v2/**/*.{js,jsx,ts,tsx}");

  expect(results.length).toBeGreaterThan(0);
  for (const result of results) {
    const rel = path.relative(cwd, result.filePath);
    expect.soft(result.messages, rel).toEqual([]);
    expect.soft(result.errorCount, rel).toBe(0);
    expect.soft(result.warningCount, rel).toBe(0);
  }
});
