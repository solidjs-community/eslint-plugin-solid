declare module "eslint-plugin-solid/configs/typescript" {
  const config: typeof import("../dist/index").configs["flat/typescript"];
  export = config;
}
