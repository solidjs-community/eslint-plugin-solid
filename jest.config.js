/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  resolver: 'jest-node-exports-resolver',
  testRegex: "\\.test\\.[jt]sx?$",
};