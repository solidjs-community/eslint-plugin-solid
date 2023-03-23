import { ESLintUtils, TSESTree as T } from "@typescript-eslint/utils";
import { isDOMElementName } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr"];
const styleNamespaces = ["style", "class"];
const otherNamespaces = ["xmlns", "xlink"];

type MessageIds = "unknown" | "style" | "component" | "component-suggest";
type Options = [{ allowedNamespaces: Array<string> }?];

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      recommended: "error",
      description:
        "Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/no-unknown-namespaces.md",
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
              minItems: 1,
              uniqueItems: true,
            },
            default: [],
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
    },
  },
  defaultOptions: [],
  create(context) {
    const explicitlyAllowedNamespaces = context.options?.[0]?.allowedNamespaces;
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
