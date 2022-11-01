import execa from "execa";
import path from "path";
import glob from "fast-glob";
import { ESLint } from "eslint";

const eslintBinPath = path.resolve(__dirname, "..", "node_modules", ".bin", "eslint");
const eslint = new ESLint();

const getTestFiles = (dir: string): Array<string> => {
  const root = path.join("test", "fixture", dir);
  return glob.sync("**/*.{js,jsx,ts,tsx}", { cwd: root, absolute: true });
};

describe("fixture", function () {
  it(
    "loads the plugin without crashing",
    async () => {
      const exampleFile = path.join("test", "fixture", "invalid", "jsx-undef.jsx");
      const { exitCode } = await execa(eslintBinPath, ["--print-config", exampleFile], {
        shell: true,
      });
      expect(exitCode).toBe(0);
    },
    100 * 1000
  );

  it(
    "produces reasonable lint errors",
    async () => {
      try {
        const exampleFile = path.join("test", "fixture", "invalid", "jsx-undef.jsx");
        await execa(eslintBinPath, [exampleFile], {
          shell: true,
        });
      } catch (error: any) {
        expect(error.exitCode).not.toBe(0);
        expect(error.stderr).toBe("");
        expect(error.stdout).toMatch(/'Component' is not defined/);
        expect(error.stdout).toMatch(/solid\/jsx-no-undef/);
      }
    },
    100 * 1000
  );

  describe("valid examples", () => {
    test.each(getTestFiles("valid").map((file) => [path.relative("test/fixture", file), file]))(
      "%s",
      async (_, file) => {
        const [results] = await eslint.lintFiles(file);
        expect(results.filePath).toBe(file);
        expect(results.messages).toEqual([]);
        expect(results.errorCount).toBe(0);
        expect(results.warningCount).toBe(0);
        expect(results.usedDeprecatedRules).toEqual([]);
      }
    );
  });

  describe("invalid examples", () => {
    test.each(getTestFiles("invalid").map((file) => [path.relative("test/fixture", file), file]))(
      "%s",
      async (_, file) => {
        const [results] = await eslint.lintFiles(file);
        expect(results.filePath).toBe(file);
        expect(results.messages).not.toEqual([]);
        expect(results.warningCount + results.errorCount).toBeGreaterThan(0);
        expect(results.usedDeprecatedRules).toEqual([]);
      }
    );
  });
});
