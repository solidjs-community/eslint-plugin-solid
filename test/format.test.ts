import { test, expect, expectTypeOf } from "vitest";

import recommendedConfig from "eslint-plugin-solid/configs/recommended";
import typescriptConfig from "eslint-plugin-solid/configs/typescript";
import v2Config from "eslint-plugin-solid/configs/v2";
import v2StrictConfig from "eslint-plugin-solid/configs/v2-strict";
import plugin from "eslint-plugin-solid";
import type * as standalone from "eslint-solid-standalone";

test("flat config has meta", () => {
  expect(recommendedConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(recommendedConfig.plugins.solid.meta.version).toEqual(expect.any(String));
  expect(typescriptConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(typescriptConfig.plugins.solid.meta.version).toEqual(expect.any(String));
  expect(v2Config.plugins.solid.meta.name).toBe("eslint-plugin-solid");
  expect(v2StrictConfig.plugins.solid.meta.name).toBe("eslint-plugin-solid");
});

test("flat configs are exposed on plugin.configs", () => {
  expect(plugin.configs.recommended).toBe(recommendedConfig);
  expect(plugin.configs.typescript).toBe(typescriptConfig);
  expect(plugin.configs.v2).toBe(v2Config);
  expect(plugin.configs["v2-strict"]).toBe(v2StrictConfig);
});

test("v2 configs set the Solid version and enable the 2.0 rules", () => {
  expect(v2Config.settings.solid.version).toBe(2);
  expect(v2StrictConfig.settings.solid.version).toBe(2);
  expect(v2Config.rules["solid/removed-api"]).toBe(2);
  expect(v2Config.rules["solid/no-single-arg-create-effect"]).toBe(2);
  expect(v2Config.rules["solid/no-accessor-as-prop"]).toBe(2);
  expect(v2Config.rules["solid/prefer-structured-class"]).toBe(1);
  expect(v2Config.rules["solid/prefer-classlist"]).toBe(0);
  expect(v2Config.rules["solid/valid-use-server"]).toBe(2);
  expect(v2Config.rules["solid/require-async-server-function"]).toBe(2);
  expect(v2Config.rules["solid/no-invalid-server-capture"]).toBe(2);
  expect(v2Config.rules["solid/no-browser-globals-in-server-function"]).toBe(2);
  expect(v2StrictConfig.rules["solid/no-module-scope-reactive-primitive"]).toBe(2);
  expect(v2StrictConfig.rules["solid/prefer-onSettled-for-side-effects"]).toBe(1);
  expect(v2StrictConfig.rules["solid/no-restated-default-options"]).toBe(2);
  expect(v2StrictConfig.rules["solid/prefer-structured-class"]).toBe(2);
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
