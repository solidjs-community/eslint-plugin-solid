import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/configs/recommended.ts",
    "src/configs/typescript.ts",
    "src/configs/v2.ts",
    "src/configs/v2-strict.ts",
  ],
  format: ["esm"],
  dts: true,
  // experimentalDts: true,
  sourcemap: true,
  clean: true,
});
