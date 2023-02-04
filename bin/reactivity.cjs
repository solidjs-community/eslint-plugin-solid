#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const glob = require("fast-glob");

const KEY = "solid/reactivity";
const WRAPPED_KEY = `"${KEY}"`;

async function findPlugins() {
  const pluginsMap = new Map();

  const files = await glob("**/package.json", { onlyFiles: true, unique: true, deep: 10 });
  await Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(file, "utf-8");

      if (contents.includes(WRAPPED_KEY)) {
        const parsed = JSON.parse(contents);
        if (parsed && Object.prototype.hasOwnProperty.call(parsed, KEY)) {
          const pluginPath = parsed[KEY];
          if (file === "package.json") {
            pluginsMap.set(".", pluginPath); // associate current CWD with the plugin path
          } else {
            pluginsMap.set(parsed.name, pluginPath); // associate the package name with the plugin path
          }
        }
      }
    })
  );

  return pluginsMap;
}

async function reactivityCLI() {
  if (process.argv.some((token) => token.match(/\-h|\-v/i))) {
    console.log(
      `eslint-plugin-solid v${require("../package.json").version}

This CLI command searches for any plugins for the "solid/reactivity" ESLint rule that your dependencies make available.

If any are found, an ESLint rule config will be printed out with the necessary options to load and use those "solid/reactivity" plugins.
If you are authoring a framework or template repository for SolidJS, this can help your users get the best possible linter feedback.

For instructions on authoring a "solid/reactivity" plugin, see TODO PROVIDE URL.`
    );
  } else {
    console.log(
      `Searching for ${WRAPPED_KEY} keys in all package.json files... (this could take a minute)`
    );
    const pluginsMap = await findPlugins();
    if (pluginsMap.size > 0) {
      // create a resolve function relative from the root of the current working directory
      const { resolve } = require("module").createRequire(path.join(process.cwd(), "index.js"));

      const plugins = Array.from(pluginsMap)
        .map(([packageName, pluginPath]) => {
          const absPluginPath = resolve(
            (packageName + "/" + pluginPath).replace(/(\.\/){2,}/g, "./")
          );
          return path.relative(process.cwd(), absPluginPath);
        })
        .filter((v, i, a) => a.indexOf(v) === i); // remove duplicates

      const config = [1, { plugins }];

      console.log(
        `Found ${plugins.length} "solid/reactivity" plugin${plugins.length !== 1 ? "s" : ""}. Add ${
          plugins.length !== 1 ? "them" : "it"
        } to your ESLint config by adding the following to the "rules" section:\n`
      );
      console.log(`"solid/reactivity": ${JSON.stringify(config, null, 2)}`);
    } else {
      console.log(`No "solid/reactivity" plugins found.`);
    }
  }
}

reactivityCLI();
