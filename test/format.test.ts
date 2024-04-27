import { test, expect } from "vitest";

import recommendedConfig from "eslint-plugin-solid/configs/recommended";
import typescriptConfig from "eslint-plugin-solid/configs/typescript";
import plugin from "eslint-plugin-solid";

test("flat config has meta", () => {
  expect(recommendedConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(recommendedConfig.plugins.solid.meta.version).toEqual(expect.any(String));
  expect(typescriptConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(typescriptConfig.plugins.solid.meta.version).toEqual(expect.any(String));
});

test('flat configs are also exposed on plugin.configs["flat/*"]', () => {
  // include flat configs on legacy config object with `flat/` prefix. The `fixture (flat)` test
  // passing means that an equivalent config using `configs["flat/*"]` will also pass.
  expect(plugin.configs["flat/recommended"]).toBe(recommendedConfig);
  expect(plugin.configs["flat/typescript"]).toBe(typescriptConfig);
});

test("legacy configs use strings, not modules", () => {
  expect(plugin.configs.recommended.plugins).toStrictEqual(["solid"]);
  expect(plugin.configs.typescript.plugins).toStrictEqual(["solid"]);
});
