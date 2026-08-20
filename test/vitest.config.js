import { defaultExclude } from "vitest/config";

export default {
  test: {
    globals: true,
    // templates-v2/ contains lint fixtures copied from the Solid templates
    // repo, including a *.test.tsx file that is not a test of this package
    exclude: [...defaultExclude, "templates-v2/**"],
  },
};
