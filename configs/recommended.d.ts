declare module "eslint-plugin-solid/configs/recommended" {
  const config: typeof import("../dist/index").configs["flat/recommended"];
  export = config;
}
