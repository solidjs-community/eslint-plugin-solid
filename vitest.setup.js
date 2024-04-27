import { vi } from "vitest";

// Don't bother checking for imports for every test
vi.mock("./src/utils", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    trackImports: () => {
      const handleImportDeclaration = () => {};
      const matchImport = (imports, str) => {
        const importArr = Array.isArray(imports) ? imports : [imports];
        return importArr.find((i) => i === str);
      };
      return { matchImport, handleImportDeclaration };
    },
  };
});
// });
