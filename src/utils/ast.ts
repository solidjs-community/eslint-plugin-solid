import estraverse from "estraverse";
import type { Node } from "estree-jsx";

/**
 * Wrapper for estraverse.traverse
 */
function traverse(ASTnode, visitor) {
  const opts = {
    fallback(node) {
      return Object.keys(node).filter((key) => key === "children" || key === "argument");
    },
    ...visitor,
    keys: {
      ...visitor.keys,
      JSXElement: ["children"],
      JSXFragment: ["children"],
    },
  };

  estraverse.traverse(ASTnode, opts);
}

/**
 * Find a return statment in the current node
 *
 * @param {ASTNode} node The AST node being checked
 * @returns {ASTNode | false}
 */
function findReturnStatement(node) {
  if (
    (!node.value || !node.value.body || !node.value.body.body) &&
    (!node.body || !node.body.body)
  ) {
    return false;
  }

  const bodyNodes = node.value ? node.value.body.body : node.body.body;

  return (function loopNodes(nodes) {
    let i = nodes.length - 1;
    for (; i >= 0; i--) {
      if (nodes[i].type === "ReturnStatement") {
        return nodes[i];
      }
      if (nodes[i].type === "SwitchStatement") {
        let j = nodes[i].cases.length - 1;
        for (; j >= 0; j--) {
          return loopNodes(nodes[i].cases[j].consequent);
        }
      }
    }
    return false;
  })(bodyNodes);
}

/**
 * Helper function for traversing "returns" (return statements or the
 * returned expression in the case of an arrow function) of a function
 *
 * @param {ASTNode} ASTNode The AST node being checked
 * @param {Context} context The context of `ASTNode`.
 * @param {function} enterFunc Function to execute for each returnStatement found
 * @returns {undefined}
 */
function traverseReturns(ASTNode, enterFunc) {
  const nodeType = ASTNode.type;

  if (nodeType === "ReturnStatement") {
    return enterFunc(ASTNode);
  }

  if (nodeType === "ArrowFunctionExpression" && ASTNode.expression) {
    return enterFunc(ASTNode.body);
  }

  if (
    nodeType !== "FunctionExpression" &&
    nodeType !== "FunctionDeclaration" &&
    nodeType !== "ArrowFunctionExpression"
  ) {
    return;
  }

  traverse(ASTNode.body, {
    enter(node) {
      switch (node.type) {
        case "ReturnStatement":
          this.skip();
          return enterFunc(node);
        case "FunctionExpression":
        case "FunctionDeclaration":
        case "ArrowFunctionExpression":
          return this.skip();
        default:
      }
    },
  });
}

/**
 * Checks if a node represents a JSX element or fragment.
 * @param {object} node - node to check.
 * @returns {boolean} Whether or not the node if a JSX element or fragment.
 */
function isJSX(node) {
  return node && ["JSXElement", "JSXFragment"].indexOf(node.type) >= 0;
}

/**
 * Check if the node is returning JSX or null
 *
 * @param {Function} isCreateElement Function to determine if a CallExpresion is
 *   a createElement one
 * @param {ASTNode} ASTnode The AST node being checked
 * @param {Context} context The context of `ASTNode`.
 * @param {Boolean} [strict] If true, in a ternary condition the node must return JSX in both cases
 * @param {Boolean} [ignoreNull] If true, null return values will be ignored
 * @returns {Boolean} True if the node is returning JSX or null, false if not
 */
function isReturningJSX(isCreateElement, ASTnode, context, strict, ignoreNull) {
  let found = false;
  astUtil.traverseReturns(ASTnode, context, (node) => {
    // Traverse return statement
    astUtil.traverse(node, {
      enter(childNode) {
        const setFound = () => {
          found = true;
          this.skip();
        };
        switch (childNode.type) {
          case "FunctionExpression":
          case "FunctionDeclaration":
          case "ArrowFunctionExpression":
            // Do not traverse into inner function definitions
            return this.skip();
          case "ConditionalExpression":
            if (!strict) break;
            if (isJSX(childNode.consequent) && isJSX(childNode.alternate)) {
              setFound();
            }
            this.skip();
            break;
          case "LogicalExpression":
            if (!strict) break;
            if (isJSX(childNode.left) && isJSX(childNode.right)) {
              setFound();
            }
            this.skip();
            break;
          case "JSXElement":
          case "JSXFragment":
            setFound();
            break;
          case "CallExpression":
            if (isCreateElement(childNode)) {
              setFound();
            }
            this.skip();
            break;
          case "Literal":
            if (!ignoreNull && childNode.value === null) {
              setFound();
            }
            break;
          default:
        }
      },
    });

    return found && estraverse.VisitorOption.Break;
  });

  return found;
}
