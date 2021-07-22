import type { Rule } from "eslint";
import { isDOMElementName } from "../utils";

/*
 * This rule is lifted almost verbatim from eslint-plugin-react's
 * jsx-no-undef rule under the MIT license. Thank you for your work!
 */

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          allowGlobals: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
    docs: {
      description:
        "Prevents usage of the innerHTML attribute, which can often lead to security vulnerabilities",
    },
    messages: {
      undefined: "'{{identifier}}' is not defined.",
    },
  },
  create(context) {
    const allowGlobals = context.options[0]?.allowGlobals ?? false;

    /**
     * Compare an identifier with the variables declared in the scope
     * @param {ASTNode} node - Identifier or JSXIdentifier node
     * @returns {void}
     */
    function checkIdentifierInJSX(node) {
      let scope = context.getScope();
      const sourceCode = context.getSourceCode();
      const sourceType = sourceCode.ast.sourceType;
      const scopeUpperBound =
        !allowGlobals && sourceType === "module" ? "module" : "global";
      let variables = scope.variables;

      // Ignore 'this' keyword (also maked as JSXIdentifier when used in JSX)
      if (node.name === "this") {
        return;
      }

      while (scope.type !== scopeUpperBound && scope.type !== "global") {
        scope = scope.upper;
        variables = scope.variables.concat(variables);
      }
      if (scope.childScopes.length) {
        variables = scope.childScopes[0].variables.concat(variables);
        // Temporary fix for babel-eslint
        if (scope.childScopes[0].childScopes.length) {
          variables =
            scope.childScopes[0].childScopes[0].variables.concat(variables);
        }
      }

      for (let i = 0, len = variables.length; i < len; i++) {
        if (variables[i].name === node.name) {
          return;
        }
      }

      context.report({
        node,
        messageId: "undefined",
        data: {
          identifier: node.name,
        },
      });
    }

    return {
      JSXOpeningElement(node) {
        switch (node.name.type) {
          case "JSXIdentifier":
            if (isDOMElementName(node)) {
              return;
            }
            checkIdentifierInJSX(node.name);
            break;
          case "JSXMemberExpression":
            node = node.name;
            do {
              node = node.object;
            } while (node && node.type !== "JSXIdentifier");
            checkIdentifierInJSX(node.name);
            break;
          case "JSXNamespacedName":
            return;
          default:
            break;
        }
      },
      "JSXAttribute > JSXNamespacedName": (node) => {
        // <Element use:X /> applies the `X` custom directive to the element, where `X` must be an identifier in scope.
        if (
          node.namespace?.type === "JSXIdentifier" &&
          node.namespace.name === "use" &&
          node.name?.type === "JSXIdentifier"
        ) {
          checkIdentifierInJSX(node.name.name);
        }
      },
    };
  },
};

export default rule;
