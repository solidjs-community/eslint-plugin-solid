/* eslint-env jest */
// beforeAll(() => {
// Don't bother checking for imports for every test
jest.mock("./src/utils", () => {
  return {
    ...jest.requireActual("./src/utils"),
    trackImports: () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
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
