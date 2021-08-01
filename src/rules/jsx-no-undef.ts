import type { Rule } from "eslint";
import { isDOMElementName, formatList, getCommentBefore } from "../utils";

// Currently all of the control flow components are from 'solid-js'.
const AUTO_COMPONENTS = ["Show", "For", "Index", "Switch", "Match"];
const SOURCE_MODULE = "solid-js";

/*
 * This rule is adapted from eslint-plugin-react's jsx-no-undef rule under
 * the MIT license. Thank you for your work!
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          allowGlobals: { type: "boolean" },
          autoImport: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    docs: {
      description: "Prevents references to undefined variables in JSX.",
    },
    messages: {
      undefined: "'{{identifier}}' is not defined.",
      customDirectiveUndefined: "Custom directive '{{identifier}}' is not defined.",
      autoImport: "{{imports}} should be imported from '{{source}}'.",
    },
    fixable: "code",
  },
  create(context) {
    const allowGlobals = context.options[0]?.allowGlobals ?? false;
    const autoImport = context.options[0]?.autoImport !== false;

    const missingComponentsSet = new Set<string>();

    // const insertImport = (
    //   programNode: Program,
    //   ids: string | Array<string>,
    //   source: string
    // ): void => {
    //
    // };

    /**
     * Compare an identifier with the variables declared in the scope
     * @param {ASTNode} node - Identifier or JSXIdentifier node
     * @returns {void}
     */
    function checkIdentifierInJSX(
      node,
      {
        isComponent,
        isCustomDirective,
      }: { isComponent?: boolean; isCustomDirective?: boolean } = {}
    ) {
      let scope = context.getScope();
      const sourceCode = context.getSourceCode();
      const sourceType = sourceCode.ast.sourceType;
      const scopeUpperBound = !allowGlobals && sourceType === "module" ? "module" : "global";
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
          variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
        }
      }

      for (let i = 0, len = variables.length; i < len; i++) {
        if (variables[i].name === node.name) {
          return;
        }
      }

      if (
        isComponent &&
        autoImport &&
        AUTO_COMPONENTS.includes(node.name) &&
        !missingComponentsSet.has(node.name)
      ) {
        // track which names are undefined
        missingComponentsSet.add(node.name);
      } else {
        context.report({
          node,
          messageId: isCustomDirective ? "customDirectiveUndefined" : "undefined",
          data: {
            identifier: node.name,
          },
        });
      }
    }

    return {
      JSXOpeningElement(node) {
        switch (node.name.type) {
          case "JSXIdentifier":
            if (isDOMElementName(node.name.name)) {
              return;
            }
            checkIdentifierInJSX(node.name, { isComponent: true });
            break;
          case "JSXMemberExpression":
            node = node.name;
            do {
              node = node.object;
            } while (node && node.type !== "JSXIdentifier");
            checkIdentifierInJSX(node);
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
          checkIdentifierInJSX(node.name, { isCustomDirective: true });
        }
      },
      "Program:exit": (programNode) => {
        // add in any auto import components used in the program
        const missingComponents = Array.from(missingComponentsSet.values());
        if (autoImport && missingComponents.length) {
          const identifiersString = missingComponents.join(", "); // "Show, For, Switch"
          const importNode = programNode.body.find(
            (n) =>
              n.type === "ImportDeclaration" &&
              n.importKind !== "type" &&
              n.source.type === "Literal" &&
              n.source.value === SOURCE_MODULE
          );
          if (importNode) {
            context.report({
              node: importNode,
              messageId: "autoImport",
              data: {
                imports: formatList(missingComponents),
                source: SOURCE_MODULE,
              },
              fix: (fixer) => {
                const reversedSpecifiers = importNode.specifiers.slice().reverse();
                const lastSpecifier = reversedSpecifiers.find((s) => s.type === "ImportSpecifier");
                if (lastSpecifier) {
                  // import A, { B } from 'source' => import A, { B, C, D } from 'source'
                  // import { B } from 'source' => import { B, C, D } from 'source'
                  return fixer.insertTextAfter(lastSpecifier, `, ${identifiersString}`);
                }
                const otherSpecifier = importNode.specifiers.find(
                  (s) =>
                    s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier"
                );
                if (otherSpecifier) {
                  // import A from 'source' => import A, { B, C, D } from 'source'
                  // import * as A from 'source' => import * as A, { B, C, D } from 'source'
                  return fixer.insertTextAfter(otherSpecifier, `, { ${identifiersString} } `);
                }
                if (importNode.specifiers.length === 0) {
                  // import 'source' => import { B, C, D } from 'source'
                  const importToken = context.getSourceCode().getFirstToken(importNode);
                  return fixer.insertTextAfter(importToken, ` { ${identifiersString} } from`);
                }
              },
            });
          } else {
            context.report({
              node: programNode,
              messageId: "autoImport",
              data: {
                imports: formatList(missingComponents),
                source: SOURCE_MODULE,
              },
              fix: (fixer) => {
                // insert `import { missing, identifiers } from "source-module"` at top of module
                const firstImport = programNode.body.find((n) => n.type === "ImportDeclaration");
                if (firstImport) {
                  return fixer.insertTextBeforeRange(
                    (getCommentBefore(firstImport, context.getSourceCode()) ?? firstImport).range,
                    `import { ${identifiersString} } from "${SOURCE_MODULE}";\n`
                  );
                }
                return fixer.insertTextBeforeRange(
                  [0, 0],
                  `import { ${identifiersString} } from "${SOURCE_MODULE}";\n`
                );
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
