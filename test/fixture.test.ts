import path from "path";
import glob from "fast-glob";
import { ESLint } from "eslint";

const getTestFiles = () => {
  const root = path.join("test", "fixture");
  return glob("**/*.{js,jsx,ts,tsx}", { cwd: root, absolute: true });
};

const validDir = path.resolve("test", "fixture", "valid");
const jsxUndefPath = path.resolve("test", "fixture", "invalid", "jsx-undef.jsx");

test("fixture", async () => {
  const files = await getTestFiles();

  const eslint = new ESLint();
  const results = await eslint.lintFiles(files);

  for (const result of results) {
    if (result.filePath.startsWith(validDir)) {
      expect(result.messages).toEqual([]);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.usedDeprecatedRules).toEqual([]);
    } else {
      expect(result.messages).not.toEqual([]);
      expect(result.warningCount + result.errorCount).toBeGreaterThan(0);
      expect(result.usedDeprecatedRules).toEqual([]);

      if (result.filePath === jsxUndefPath) {
        // test for one specific error message
        expect(
          result.messages.some((message) => /'Component' is not defined/.test(message.message))
        );
      }
    }
  }

  expect(results.filter((result) => result.filePath === jsxUndefPath).length).toBe(1);
});
