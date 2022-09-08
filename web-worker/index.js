import { Linter } from 'eslint/linter';
import eslintPluginSolid from 'eslint-plugin-solid';
import { MarkerSeverity } from 'monaco-editor';

// // type Linter = any;
// // declare namespace Linter {
// //   type Config<T> = any;
// //   type RulesRecord = any;
// // }

console.log('LOADED WORKER');
console.log('Linter.version', Linter.version);

// const linter: any = {};
/** @type {Linter} */
const linter = new Linter();
// // Object.keys(eslintPluginSolid.rules).forEach((key) => {
// //   linter.defineRule(`solid/${key}`, eslintPluginSolid.rules[key]);
// // });

// const options: any = {};
// // const options: Linter.Config<Linter.RulesRecord> = {
// //   // parserOptions: {}
// //   // rules: eslintPluginSolid.configs.recommended.rules,
// // };

// function lint(code: string, filePath: string) {
//   console.log('linting!', filePath);
//   return linter.verify(code, options, { filename: filePath });
// }

// function fix(code: string, filePath: string) {
//   console.log('fixing!', filePath);
//   return linter.verifyAndFix(code, options, { filename: filePath });
// }

// self.addEventListener('message', async ({ data }) => {
//   const { event, code, filePath } = data;
//   console.log('RECEIVED LINT REQUEST', filePath);

//   switch (event) {
//     case 'LINT':
//       self.postMessage({
//         event: 'LINT_RESULT',
//         result: (await lint(code, filePath))
//           .filter(({ severity }) => severity !== 0)
//           .map((message) => {
//             const marker: import('monaco-editor').editor.IMarkerData = {
//               severity: message.severity === 2 ? MarkerSeverity.Error : MarkerSeverity.Warning,
//               message: message.message,
//               source: 'eslint',
//               startLineNumber: message.line - 1,
//               startColumn: message.column - 1,
//               endLineNumber: (message.endLine ?? message.line) - 1,
//               endColumn: (message.endColumn ?? message.column) - 1,
//             };
//             return marker;
//           }),
//       });
//       break;
//     case 'LINT_FIX':
//       self.postMessage({
//         event: 'LINT_FIX_RESULT',
//         result: (await fix(code, filePath)).output,
//       });
//       break;
//   }
// });

export {};
