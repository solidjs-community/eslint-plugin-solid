/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "\\.test\\.[jt]sx?$",
  setupFilesAfterEnv: ["./jest.setup.js"],
};
