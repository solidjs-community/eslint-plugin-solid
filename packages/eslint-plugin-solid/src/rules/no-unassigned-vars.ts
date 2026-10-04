/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { getSourceCode } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

/*
 * ESLint's `no-unassigned-vars`, except that `ref={el}` counts as an
 * assignment: the compiler assigns `el`, but scope analysis only sees a read.
 */

const isRefValue = (identifier: T.Node): boolean => {
  const value = identifier.parent?.type === "TSNonNullExpression" ? identifier.parent : identifier;
  const container = value.parent;
  return (
    container?.type === "JSXExpressionContainer" &&
    container.parent?.type === "JSXAttribute" &&
    container.parent.name.type === "JSXIdentifier" &&
    container.parent.name.name === "ref"
  );
};

export default createRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `let` and `var` variables that are read but never assigned, counting `ref={el}` as an assignment. Replaces ESLint's `no-unassigned-vars`.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-unassigned-vars.md",
    },
    schema: [],
    messages: {
      unassigned: "'{{name}}' is always 'undefined' because it's never assigned.",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = getSourceCode(context);
    let insideDeclareModule = false;

    return {
      "TSModuleDeclaration[declare=true]"() {
        insideDeclareModule = true;
      },
      "TSModuleDeclaration[declare=true]:exit"() {
        insideDeclareModule = false;
      },
      VariableDeclarator(node) {
        const declaration = node.parent;
        if (
          node.init ||
          node.id.type !== "Identifier" ||
          declaration.kind === "const" ||
          declaration.declare ||
          insideDeclareModule
        ) {
          return;
        }
        const [variable] = sourceCode.getDeclaredVariables(node);
        if (!variable) return;

        let hasRead = false;
        for (const reference of variable.references) {
          if (reference.isWrite() || isRefValue(reference.identifier)) return;
          if (reference.isRead()) hasRead = true;
        }
        // a variable that is never read is no-unused-vars' to report
        if (!hasRead) return;

        context.report({ node, messageId: "unassigned", data: { name: node.id.name } });
      },
    };
  },
});
