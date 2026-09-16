/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { ESLintUtils, TSESTree as T } from "@typescript-eslint/utils";
import { isDOMElementName, isSolidV2 } from "../utils.js";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr", "bool"];
const styleNamespaces = ["style", "class"];
const otherNamespaces = ["xmlns", "xlink"];

// In Solid 2.0, namespaces are no longer reserved: any colon-name passes
// through as a literal attribute, and `prop:` is the only special prefix left.
// The formerly-public 1.x prefixes now silently render literal attributes, so
// in v2 mode they're flagged as near-certain migration bugs with per-prefix
// guidance.
const v2MigrationGuidance: Record<string, string> = {
  on: "For an event handler, use the camelCase form instead: `onClick`",
  oncapture:
    "There is no capture-phase prefix in Solid 2.0; add a capture listener with `addEventListener` in a `ref` if needed",
  use: "Directives were removed in Solid 2.0; call the function in `ref` instead: `ref={(el) => myDirective(el)}`",
  attr: "Use the plain attribute name; attributes are the default in Solid 2.0",
  bool: "Use the plain attribute with a boolean or conditional value",
};

type MessageIds = "unknown" | "style" | "component" | "component-suggest" | "v2Namespace";
type Options = [{ allowedNamespaces: Array<string> }?];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-unknown-namespaces.md",
    },
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          allowedNamespaces: {
            description: "an array of additional namespace names to allow",
            type: "array",
            items: {
              type: "string",
            },
            default: [],
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unknown: `'{{namespace}}:' is not one of Solid's special prefixes for JSX attributes (${knownNamespaces
        .map((n) => `'${n}:'`)
        .join(", ")}).`,
      style:
        "Using the '{{namespace}}:' special prefix is potentially confusing, prefer the '{{namespace}}' prop instead.",
      component: "Namespaced props have no effect on components.",
      "component-suggest": "Replace {{namespace}}:{{name}} with {{name}}.",
      v2Namespace:
        "'{{namespace}}:' is not a special prefix in Solid 2.0; this renders a literal '{{namespace}}:{{name}}' attribute. {{guidance}}.",
    },
  },
  defaultOptions: [],
  create(context) {
    const explicitlyAllowedNamespaces = context.options?.[0]?.allowedNamespaces;
    const v2 = isSolidV2(context);
    return {
      "JSXAttribute > JSXNamespacedName": (node: T.JSXNamespacedName) => {
        const openingElement = node.parent!.parent as T.JSXOpeningElement;
        if (
          openingElement.name.type === "JSXIdentifier" &&
          !isDOMElementName(openingElement.name.name)
        ) {
          // no namespaces on Solid component elements
          context.report({
            node,
            messageId: "component",
            suggest: [
              {
                messageId: "component-suggest",
                data: { namespace: node.namespace.name, name: node.name.name },
                fix: (fixer) => fixer.replaceText(node, node.name.name),
              },
            ],
          });
          return;
        }

        const namespace = node.namespace?.name;

        if (v2) {
          // In 2.0 any colon-name is a legal literal attribute; only flag the
          // formerly-special 1.x prefixes, which are near-certain migration bugs.
          const guidance = v2MigrationGuidance[namespace];
          if (guidance && !explicitlyAllowedNamespaces?.includes(namespace)) {
            context.report({
              node,
              messageId: "v2Namespace",
              data: { namespace, name: node.name.name, guidance },
            });
          }
          return;
        }

        if (
          !(
            knownNamespaces.includes(namespace) ||
            otherNamespaces.includes(namespace) ||
            explicitlyAllowedNamespaces?.includes(namespace)
          )
        ) {
          if (styleNamespaces.includes(namespace)) {
            context.report({
              node,
              messageId: "style",
              data: { namespace },
            });
          } else {
            context.report({
              node,
              messageId: "unknown",
              data: { namespace },
            });
          }
        }
      },
    };
  },
});
