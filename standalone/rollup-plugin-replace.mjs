// lifted from @typescript-eslint/website-eslint/rollup-plugin/replace.js
import path from "path";
import Module from "module";
import { createFilter } from "@rollup/pluginutils";
import MagicString from "magic-string";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function toAbsolute(id) {
  return id.startsWith("./") ? path.resolve(id) : require.resolve(id);
}

function log(opts, message, type = "info") {
  if (opts.verbose) {
    console.log("rollup-plugin-replace > [" + type + "]", message);
  }
}

function createMatcher(it) {
  if (typeof it === "function") {
    return it;
  } else {
    return createFilter(it);
  }
}

export default (options = {}) => {
  const aliasesCache = new Map();
  const aliases = (options.alias || []).map((item) => {
    return {
      match: item.match,
      matcher: createMatcher(item.match),
      target: item.target,
      absoluteTarget: toAbsolute(item.target),
    };
  });
  const replaces = (options.replace || []).map((item) => {
    return {
      match: item.match,
      test: item.test,
      replace: typeof item.replace === "string" ? () => item.replace : item.replace,

      matcher: createMatcher(item.match),
    };
  });

  return {
    name: "rollup-plugin-replace",
    resolveId(id, importerPath) {
      const importeePath =
        id.startsWith("./") || id.startsWith("../")
          ? Module.createRequire(importerPath).resolve(id)
          : id;

      let result = aliasesCache.get(importeePath);
      if (result) {
        return result;
      }

      result = aliases.find((item) => item.matcher(importeePath));
      if (result) {
        aliasesCache.set(importeePath, result.absoluteTarget);
        log(options, `${importeePath} as ${result.target}`, "resolve");
        return result.absoluteTarget;
      }

      return null;
    },
    transform(code, id) {
      let hasReplacements = false;
      let magicString = new MagicString(code);

      replaces.forEach((item) => {
        if (item.matcher && !item.matcher(id)) {
          return;
        }

        let match = item.test.exec(code);
        let start, end;
        while (match) {
          hasReplacements = true;
          start = match.index;
          end = start + match[0].length;
          magicString.overwrite(start, end, item.replace(match));
          match = item.test.global ? item.test.exec(code) : null;
        }
      });

      if (!hasReplacements) {
        return;
      }
      log(options, id, "replace");

      const map = magicString.generateMap();
      return { code: magicString.toString(), map: map.toString() };
    },
  };
};
