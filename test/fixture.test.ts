import execa from "execa";
import path from "path";
import fs from "fs-extra";
import glob from "fast-glob";
import { ESLint } from "eslint";

const nodeModulesFileForTesting = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "eslint-plugin-solid.js"
);

const fixtureCwd = path.resolve(__dirname, "fixture");
const getTestFiles = (dir: string): Array<string> => {
  const root = path.join(fixtureCwd, dir);
  return glob.sync("**/*.{js,jsx,tsx}", { cwd: root, absolute: true });
};

describe("fixture", function () {
  let eslintPath: string;
  const validFiles = getTestFiles("valid");
  const invalidFiles = getTestFiles("invalid");

  beforeAll(async () => {
    // We're trying to require the package we're currently in; we can work around
    // this by putting a skeleton file inside `node_modules` that requires the top
    // level directory.

    await fs.outputFile(nodeModulesFileForTesting, 'module.exports = require("..");\n');
    eslintPath = (await execa("yarn", ["bin", "eslint"])).stdout;
  });

  it("loads the plugin without crashing", async () => {
    const { exitCode } = await execa.node(eslintPath, ["--print-config", "invalid/jsx-undef.jsx"], {
      cwd: fixtureCwd,
    });
    expect(exitCode).toBe(0);
  });

  it("produces reasonable lint errors", async () => {
    try {
      await execa.node(eslintPath, ["invalid/jsx-undef.jsx"], {
        cwd: fixtureCwd,
      });
    } catch (error: any) {
      expect(error.exitCode).not.toBe(0);
      expect(error.stderr).toBe("");
      expect(error.stdout).toMatch(/'Component' is not defined/);
      expect(error.stdout).toMatch(/solid\/jsx-no-undef/);
      expect(error.stdout).toMatch(/1 problem \(1 error, 0 warnings\)/);
    }
  });

  describe("valid examples", () => {
    const eslint = new ESLint({ cwd: fixtureCwd });
    test.each(validFiles.map((file) => [path.relative(fixtureCwd, file), file]))(
      "%s",
      async (_, file) => {
        const [results] = await eslint.lintFiles(path.resolve(fixtureCwd, file));
        expect(results.filePath).toBe(file);
        expect(results.messages).toEqual([]);
        expect(results.errorCount).toBe(0);
        expect(results.warningCount).toBe(0);
        expect(results.usedDeprecatedRules).toEqual([]);
      }
    );
  });

  describe("invalid examples", () => {
    const eslint = new ESLint({ cwd: fixtureCwd });
    test.each(invalidFiles.map((file) => [path.relative(fixtureCwd, file), file]))(
      "%s",
      async (_, file) => {
        const [results] = await eslint.lintFiles(path.resolve(fixtureCwd, file));
        expect(results.filePath).toBe(file);
        expect(results.messages).not.toEqual([]);
        expect(results.warningCount + results.errorCount).toBeGreaterThan(0);
        expect(results.usedDeprecatedRules).toEqual([]);
      }
    );
  });
});
