import { vi } from "vitest";

// Don't bother checking for imports for every test: names with no import
// statement at all match as if imported from solid-js. Explicit imports are
// still honored, so tests CAN exercise import gating: a name imported from a
// module the rule's source regex rejects will not match (e.g. the
// settings.solid.moduleSources tests), and aliases map to their local names.
vi.mock("./src/utils", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    trackImports: (fromModule = /^(?:solid-js(?:\/?|\b)|@solidjs\/signals(?:\/?|\b))/) => {
      const aliases = new Map();
      const blocked = new Set();
      const handleImportDeclaration = (node) => {
        const matches = fromModule.test(node.source.value);
        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier") {
            const imported =
              specifier.imported.type === "Identifier"
                ? specifier.imported.name
                : specifier.imported.value;
            if (matches) aliases.set(imported, specifier.local.name);
            else blocked.add(imported);
          }
        }
      };
      const matchImport = (imports, str) => {
        const importArr = Array.isArray(imports) ? imports : [imports];
        return importArr.find((i) =>
          aliases.has(i) ? aliases.get(i) === str : !blocked.has(i) && i === str
        );
      };
      return { matchImport, handleImportDeclaration };
    },
  };
});
