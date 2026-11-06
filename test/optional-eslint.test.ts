import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../packages/eslint-plugin-solid");
const dist = path.join(root, "dist");
const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const blockEslint = `
const { registerHooks } = require("node:module");
registerHooks({
  resolve(specifier, context, next) {
    if (/^(eslint|@eslint-community\\/eslint-utils|@typescript-eslint\\/utils)($|\\/)/.test(specifier)) {
      throw new Error("loaded " + specifier);
    }
    return next(specifier, context);
  },
});
`;

describe("without ESLint installed", () => {
  it("declares ESLint as an optional peer and no package that requires it", () => {
    expect(manifest.peerDependenciesMeta.eslint.optional).toBe(true);
    expect(Object.keys(manifest.dependencies)).not.toContain("@eslint-community/eslint-utils");
  });

  it.each(["dist/index.js", "dist/configs/v2.js"])("%s loads", (entry) => {
    const script = `${blockEslint}\nconsole.log(typeof require(${JSON.stringify(
      path.join(root, entry)
    )}));`;
    const result = spawnSync(process.execPath, ["-e", script], { cwd: root, encoding: "utf8" });
    expect(result.stderr).not.toContain("loaded ");
    expect(result.stdout.trim()).toBe("object");
  });

  it("publishes no type import of eslint", () => {
    const declarations = readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((file) =>
      /\.d\.m?ts$/.test(file)
    );
    expect(declarations.length).toBeGreaterThan(0);
    for (const file of declarations) {
      expect(readFileSync(path.join(dist, file), "utf8")).not.toMatch(
        /(from\s+|import\()['"]eslint(\/[^'"]*)?['"]/
      );
    }
  });
});
