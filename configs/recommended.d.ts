declare module "eslint-plugin-solid/configs/recommended" {
  /**
   * @deprecated Please use flat configs via the root entry ("eslint-plugin-solid").
   * Refer to the [README](https://github.com/solidjs-community/eslint-plugin-solid#flat-configuration)
   * for more details.
   */
  const config: typeof import("../dist/index").configs["flat/recommended"];
  export = config;
}
