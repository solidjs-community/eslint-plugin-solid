import fs from "node:fs/promises";
import path from "node:path";
import inc from "semver/functions/inc.js";
import { exec } from "node:child_process";

const pluginPackageJsonPath = path.resolve("packages", "eslint-plugin-solid", "package.json");
const standalonePackageJsonPath = path.resolve(
  "packages",
  "eslint-solid-standalone",
  "package.json"
);

const pluginPackageJson = JSON.parse(await fs.readFile(pluginPackageJsonPath, "utf-8"));
const standalonePackageJson = JSON.parse(await fs.readFile(standalonePackageJsonPath, "utf-8"));

const version = pluginPackageJson.version;
const increment = process.argv[2];
const newVersion = inc(version, increment);

if (newVersion == null || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error("Usage: node scripts/version.js [increment]");
  process.exit(1);
}

pluginPackageJson.version = newVersion;
standalonePackageJson.version = newVersion;

await Promise.all([
  fs.writeFile(pluginPackageJsonPath, JSON.stringify(pluginPackageJson, null, 2) + "\n", "utf-8"),
  fs.writeFile(
    standalonePackageJsonPath,
    JSON.stringify(standalonePackageJson, null, 2) + "\n",
    "utf-8"
  ),
]);
await new Promise((resolve, reject) => {
  // it's not ideal to create and push a tag at the time the PR is created, but once the PR is
  // merged main should contain the tag as if it were created there.
  exec(
    `git commit --all --message="v${newVersion}"; git tag "v${newVersion}"; git push origin --force "v${newVersion}"`,
    (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        console.log(stdout);
        console.log(stderr);
        resolve(stdout);
      }
    }
  );
});
