import { test, expect, expectTypeOf } from "vitest";

import recommendedConfig from "eslint-plugin-solid/configs/recommended";
import typescriptConfig from "eslint-plugin-solid/configs/typescript";
import plugin from "eslint-plugin-solid";
import type * as standalone from "eslint-solid-standalone";

test("flat config has meta", () => {
  expect(recommendedConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(recommendedConfig.plugins.solid.meta.version).toEqual(expect.any(String));
  expect(typescriptConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(typescriptConfig.plugins.solid.meta.version).toEqual(expect.any(String));
});

test("flat configs are exposed on plugin.configs", () => {
  expect(plugin.configs.recommended).toBe(recommendedConfig);
  expect(plugin.configs.typescript).toBe(typescriptConfig);
});

test('flat configs are also exposed on plugin.configs["flat/*"] for compatibility', () => {
  expect(plugin.configs["flat/recommended"]).toBe(recommendedConfig);
  expect(plugin.configs["flat/typescript"]).toBe(typescriptConfig);
});

test("plugin exposes sane export types", () => {
  expectTypeOf<typeof plugin>().toBeObject();
  expectTypeOf<typeof plugin.rules>().toBeObject();
  expectTypeOf<typeof plugin.configs>().toBeObject();
});

test("standalone exposes sane export types", () => {
  expectTypeOf<typeof standalone.verifyAndFix>().toBeFunction();
  expectTypeOf<typeof standalone.pluginVersion>().toBeString();
});
