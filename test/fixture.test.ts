import execa from "execa";
import path from "path";
import fs from "fs-extra";

const nodeModulesFileForTesting = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "eslint-plugin-solid.js"
);

const fixtureCwd = path.resolve(__dirname, "fixture");

describe("fixture", function () {
  let eslintPath: string;

  beforeAll(async () => {
    // We're trying to require the package we're currently in; we can work around
    // this by putting a skeleton file inside `node_modules` that requires the top
    // level directory.

    await fs.writeFile(nodeModulesFileForTesting, 'module.exports = require("..");\n');
    eslintPath = (await execa("yarn", ["bin", "eslint"])).stdout;
  });

  afterAll(async () => {
    await fs.unlink(nodeModulesFileForTesting);
  });

  it("loads the plugin without crashing", async () => {
    const { exitCode } = await execa.node(eslintPath, ["--print-config", "super-simple.js"], {
      cwd: fixtureCwd,
    });
    expect(exitCode).toBe(0);
  });

  it("produces reasonable lint errors", async () => {
    try {
      await execa.node(eslintPath, ["super-simple.js"], {
        cwd: fixtureCwd,
      });
    } catch (error: any) {
      expect(error.exitCode).toBe(1);
      expect(error.stdout).toMatch(/'Component' is not defined/);
      expect(error.stdout).toMatch(/solid\/jsx-no-undef/);
      expect(error.stdout).toMatch(/1 problem \(1 error, 0 warnings\)/);
    }
  });
});
