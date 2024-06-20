/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "explicitEnumeratedAttribute";
type Options = [];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description: "Enforce explicit boolean attribute evaluation when the attribute is enumerated",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/boolean-attr.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      explicitEnumeratedAttribute:
        "This attribute is enumerated and not Boolean. A value of true or false is mandatory," +
        'and shorthand like `<img draggable>` is forbidden. The correct usage is `<img draggable="true">`.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name != "draggable" || node.value) return;

        context.report({
          node,
          messageId: "explicitEnumeratedAttribute",

          fix: (fixer) => {
            return [fixer.insertTextAfter(node, '="true"')];
          },
        });
      },
    };
  },
});
