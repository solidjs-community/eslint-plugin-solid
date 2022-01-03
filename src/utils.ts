import type { Rule, SourceCode } from "eslint";
import type {
  Comment,
  FunctionExpression,
  FunctionDeclaration,
  ArrowFunctionExpression,
  Program,
} from "estree-jsx";

const domElementRegex = /^[a-z]/;
export const isDOMElementName = (name: string): boolean => domElementRegex.test(name);

const propsRegex = /[pP]rops/;
export const isPropsByName = (name: string): boolean => propsRegex.test(name);

export const formatList = (strings: Array<string>): string => {
  if (strings.length === 0) {
    return "";
  } else if (strings.length === 1) {
    return `'${strings[0]}'`;
  } else if (strings.length === 2) {
    return `'${strings[0]}' and '${strings[1]}'`;
  } else {
    const last = strings.length - 1;
    return `${strings
      .slice(0, last)
      .map((s) => `'${s}'`)
      .join(", ")}, and '${strings[last]}'`;
  }
};

export const find = (
  node: Rule.Node,
  predicate: (node: Rule.Node) => boolean | Rule.Node
): Rule.Node | null => {
  let n = node;
  while (n) {
    const result = predicate(n);
    if (result === true) {
      return n;
    } else if (result && typeof result.type === "string") {
      return result; // could be n's sibling, child, parent, etc., depends on predicate
    }
    n = n.parent;
  }
  return null;
};
export function findParent(node: Rule.Node, predicate: (node: Rule.Node) => boolean | Rule.Node) {
  return find(node.parent, predicate);
}

export type FunctionNode = (FunctionExpression | ArrowFunctionExpression | FunctionDeclaration) &
  Rule.NodeParentExtension;
const FUNCTION_TYPES = ["FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration"];
export const isFunctionNode = (node: Rule.Node | Program): node is FunctionNode =>
  FUNCTION_TYPES.includes(node.type);

export type ProgramOrFunctionNode = FunctionNode | (Program & Partial<Rule.NodeParentExtension>);
const PROGRAM_OR_FUNCTION_TYPES = ["Program"].concat(FUNCTION_TYPES);
export const isProgramOrFunctionNode = (node: Rule.Node | Program): node is ProgramOrFunctionNode =>
  PROGRAM_OR_FUNCTION_TYPES.includes(node.type);

export function findParentInFunction(
  node: Rule.Node,
  predicate: (node: Rule.Node) => boolean | Rule.Node
) {
  const enclosingFunction = findParent(node, isProgramOrFunctionNode);
  const found = findParent(node, (node) => node === enclosingFunction || predicate(node));
  return found === enclosingFunction ? null : found;
}

// The next two functions were adapted from "eslint-plugin-import" under the MIT license.

// Checks whether `node` has a comment (that ends) on the previous line or on
// the same line as `node` (starts).
export const getCommentBefore = (node: Rule.Node, sourceCode: SourceCode): Comment | undefined =>
  sourceCode
    .getCommentsBefore(node)
    .find((comment) => comment.loc!.end.line >= node.loc!.start.line - 1);

// Checks whether `node` has a comment (that starts) on the same line as `node`
// (ends).
export const getCommentAfter = (node: Rule.Node, sourceCode: SourceCode): Comment | undefined =>
  sourceCode
    .getCommentsAfter(node)
    .find((comment) => comment.loc!.start.line === node.loc!.end.line);
