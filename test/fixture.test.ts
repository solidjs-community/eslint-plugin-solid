import execa from "execa";
import path from "path";
import assert from "assert";
import fs from "fs/promises";

const nodeModulesFileForTesting = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "eslint-plugin-solid.js"
);

const fixtureCwd = path.resolve(__dirname, "fixture");

// We can't use `yarn bin` because it uses the eslint-v6 bin
const eslintPath = require.resolve("eslint/bin/eslint.js");

describe("fixture", function () {
  this.slow(500);

  before(async () => {
    // We're trying to require the package we're currently in; we can work around
    // this by putting a skeleton file inside `node_modules` that requires the top
    // level directory.
    await fs.writeFile(nodeModulesFileForTesting, `module.exports = require("..");\n`);
  });

  after(async () => {
    await fs.unlink(nodeModulesFileForTesting);
  });

  it("loads the plugin without crashing", async () => {
    const { exitCode } = await execa.node(eslintPath, ["--print-config", "super-simple.js"], {
      cwd: fixtureCwd,
    });
    assert.strictEqual(exitCode, 0);
  });

  it("produces reasonable lint errors", async () => {
    try {
      await execa.node(eslintPath, ["super-simple.js"], {
        cwd: fixtureCwd,
      });
    } catch (error) {
      assert.strictEqual(error.exitCode, 1);
      assert.match(error.stdout, /'Component' is not defined/);
      assert.match(error.stdout, /solid\/jsx-no-undef/);
      assert.match(error.stdout, /1 problem \(1 error, 0 warnings\)/);
    }
  });
});
