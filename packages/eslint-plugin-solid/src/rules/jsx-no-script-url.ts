/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { ESLintUtils, ASTUtils } from "@typescript-eslint/utils";
import { getScope } from "../compat";

const createRule = ESLintUtils.RuleCreator.withoutDocs;
const { getStaticValue }: { getStaticValue: any } = ASTUtils;

// A javascript: URL can contain leading C0 control or \u0020 SPACE,
// and any newline or tab are filtered out as if they're not part of the URL.
// https://url.spec.whatwg.org/#url-parsing
// Tab or newline are defined as \r\n\t:
// https://infra.spec.whatwg.org/#ascii-tab-or-newline
// A C0 control is a code point in the range \u0000 NULL to \u001F
// INFORMATION SEPARATOR ONE, inclusive:
// https://infra.spec.whatwg.org/#c0-control-or-space
const isJavaScriptProtocol =
  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i; // eslint-disable-line no-control-regex

/**
 * This rule is adapted from eslint-plugin-react's jsx-no-script-url rule under the MIT license.
 * Thank you for your work!
 */
export default createRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow javascript: URLs.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/jsx-no-script-url.md",
    },
    schema: [],
    messages: {
      noJSURL: "For security, don't use javascript: URLs. Use event handlers instead if you can.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type === "JSXIdentifier" && node.value) {
          const link: { value: unknown } | null = getStaticValue(
            node.value.type === "JSXExpressionContainer" ? node.value.expression : node.value,
            getScope(context, node)
          );
          if (link && typeof link.value === "string" && isJavaScriptProtocol.test(link.value)) {
            context.report({
              node: node.value,
              messageId: "noJSURL",
            });
          }
        }
      },
    };
  },
});
