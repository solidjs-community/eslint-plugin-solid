/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils, ASTUtils } from "@typescript-eslint/utils";
import { getSolidSourceRegex, trackImports } from "../utils";
import { getScope } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "restatedDefault";
type Options = [];

// Defaults verified against the Solid 2.0 RC source (client/flow.ts):
// <For> is keyed by default; <Show> and <Match> are non-keyed by default.
const JSX_PROP_DEFAULTS: Record<string, Record<string, boolean>> = {
  For: { keyed: true },
  Show: { keyed: false },
  Match: { keyed: false },
};

/*
 * Explicitly passing a prop's default value is noise that AI-generated code
 * produces constantly. Same category as typescript-eslint's
 * no-unnecessary-type-arguments: opt-in, stylistic, autofixable.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow restating a prop or option value that is already the default.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-restated-default-options.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      restatedDefault:
        "Passing `{{prop}}={{{value}}}` restates the default for `<{{component}}>`; omit it.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));
    return {
      ImportDeclaration: handleImportDeclaration,
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") return;
        const element = node.parent as T.JSXOpeningElement;
        if (element.name.type !== "JSXIdentifier") return;

        // Resolve through the import map so aliased Solid imports match and a
        // same-named component from another library (or a local declaration)
        // never does. An *unbound* <For>/<Show>/<Match> is still Solid's: the
        // compiler auto-imports the control-flow built-ins.
        let componentName = matchImport(Object.keys(JSX_PROP_DEFAULTS), element.name.name);
        if (
          !componentName &&
          element.name.name in JSX_PROP_DEFAULTS &&
          ASTUtils.findVariable(getScope(context, element), element.name.name) == null
        ) {
          componentName = element.name.name;
        }
        if (!componentName) return;
        const defaults = JSX_PROP_DEFAULTS[componentName];
        const prop = node.name.name;
        if (!(prop in defaults)) return;
        const defaultValue = defaults[prop];

        let stated: boolean | null = null;
        if (node.value == null) {
          // bare prop, e.g. `<Show keyed>` means true
          stated = true;
        } else if (
          node.value.type === "JSXExpressionContainer" &&
          node.value.expression.type === "Literal" &&
          typeof node.value.expression.value === "boolean"
        ) {
          stated = node.value.expression.value;
        }

        if (stated === defaultValue) {
          context.report({
            node,
            messageId: "restatedDefault",
            data: { prop, value: String(stated), component: element.name.name },
            fix: (fixer) => fixer.remove(node),
          });
        }
      },
    };
  },
});
