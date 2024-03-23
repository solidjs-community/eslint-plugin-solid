import { TSESTree as T, TSESLint, ASTUtils } from "@typescript-eslint/utils";
const { findVariable } = ASTUtils;

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

export const find = (node: T.Node, predicate: (node: T.Node) => boolean): T.Node | null => {
  let n: T.Node | undefined = node;
  while (n) {
    const result = predicate(n);
    if (result) {
      return n;
    }
    n = n.parent;
  }
  return null;
};
export function findParent<Guard extends T.Node>(
  node: T.Node,
  predicate: (node: T.Node) => node is Guard
): Guard | null;
export function findParent(node: T.Node, predicate: (node: T.Node) => boolean): T.Node | null;
export function findParent(node: T.Node, predicate: (node: T.Node) => boolean): T.Node | null {
  return node.parent ? find(node.parent, predicate) : null;
}

// Try to resolve a variable to its definition
export function trace(node: T.Node, initialScope: TSESLint.Scope.Scope): T.Node {
  if (node.type === "Identifier") {
    const variable = findVariable(initialScope, node);
    if (!variable) return node;

    const def = variable.defs[0];

    // def is `undefined` for Identifier `undefined`
    switch (def?.type) {
      case "FunctionName":
      case "ClassName":
      case "ImportBinding":
        return def.node;
      case "Variable":
        if (
          ((def.node.parent as T.VariableDeclaration).kind === "const" ||
            variable.references.every((ref) => ref.init || ref.isReadOnly())) &&
          def.node.id.type === "Identifier" &&
          def.node.init
        ) {
          return trace(def.node.init, initialScope);
        }
    }
  }
  return node;
}

/** Get the relevant node when wrapped by a node that doesn't change the behavior */
export function ignoreTransparentWrappers(node: T.Node, dir = "down"): T.Node {
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression") {
    const next = dir === "up" ? node.parent : node.expression;
    if (next) {
      return ignoreTransparentWrappers(next, dir);
    }
  }
  return node;
}

export type FunctionNode = T.FunctionExpression | T.ArrowFunctionExpression | T.FunctionDeclaration;
const FUNCTION_TYPES = ["FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration"];
export const isFunctionNode = (node: T.Node | null | undefined): node is FunctionNode =>
  !!node && FUNCTION_TYPES.includes(node.type);

export type ProgramOrFunctionNode = FunctionNode | T.Program;
const PROGRAM_OR_FUNCTION_TYPES = ["Program"].concat(FUNCTION_TYPES);
export const isProgramOrFunctionNode = (
  node: T.Node | null | undefined
): node is ProgramOrFunctionNode => !!node && PROGRAM_OR_FUNCTION_TYPES.includes(node.type);

export const isJSXElementOrFragment = (
  node: T.Node | null | undefined
): node is T.JSXElement | T.JSXFragment =>
  node?.type === "JSXElement" || node?.type === "JSXFragment";

export const getFunctionName = (node: FunctionNode): string | null => {
  if (
    (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
    node.id != null
  ) {
    return node.id.name;
  }
  if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  return null;
};

export function findInScope(
  node: T.Node,
  scope: ProgramOrFunctionNode,
  predicate: (node: T.Node) => boolean
): T.Node | null {
  const found = find(node, (node) => node === scope || predicate(node));
  return found === scope && !predicate(node) ? null : found;
}

// The next two functions were adapted from "eslint-plugin-import" under the MIT license.

// Checks whether `node` has a comment (that ends) on the previous line or on
// the same line as `node` (starts).
export const getCommentBefore = (
  node: T.Node,
  sourceCode: TSESLint.SourceCode
): T.Comment | undefined =>
  sourceCode
    .getCommentsBefore(node)
    .find((comment) => comment.loc!.end.line >= node.loc!.start.line - 1);

// Checks whether `node` has a comment (that starts) on the same line as `node`
// (ends).
export const getCommentAfter = (
  node: T.Node,
  sourceCode: TSESLint.SourceCode
): T.Comment | undefined =>
  sourceCode
    .getCommentsAfter(node)
    .find((comment) => comment.loc!.start.line === node.loc!.end.line);

export const trackImports = (program: T.Program) => {
  const solidRegex = /^solid-js(?:\/?|\b)/;
  const importMap = new Map<string, { imported: string; source: string }>();

  for (const node of program.body) {
    if (node.type === "ImportDeclaration") {
      for (const specifier of node.specifiers) {
        if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") {
          importMap.set(specifier.local.name, {
            imported: specifier.imported.name,
            source: node.source.value,
          });
        }
      }
    }
  }
  const matchImport = (
    imports: string | Array<string>,
    local: string,
    module = solidRegex
  ): string | undefined => {
    const match = importMap.get(local);
    if (!match || !module.test(match.source)) {
      return;
    }
    const importArr = Array.isArray(imports) ? imports : [imports];
    return importArr.find((i) => i === match.imported);
  };
  const matchLocalToModule = (local: string): string | undefined => importMap.get(local)?.source;

  return { matchImport, matchLocalToModule };
};

export function appendImports(
  fixer: TSESLint.RuleFixer,
  sourceCode: TSESLint.SourceCode,
  importNode: T.ImportDeclaration,
  identifiers: Array<string>
): TSESLint.RuleFix | null {
  const identifiersString = identifiers.join(", ");
  const reversedSpecifiers = importNode.specifiers.slice().reverse();
  const lastSpecifier = reversedSpecifiers.find((s) => s.type === "ImportSpecifier");
  if (lastSpecifier) {
    // import A, { B } from 'source' => import A, { B, C, D } from 'source'
    // import { B } from 'source' => import { B, C, D } from 'source'
    return fixer.insertTextAfter(lastSpecifier, `, ${identifiersString}`);
  }
  const otherSpecifier = importNode.specifiers.find(
    (s) => s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier"
  );
  if (otherSpecifier) {
    // import A from 'source' => import A, { B, C, D } from 'source'
    return fixer.insertTextAfter(otherSpecifier, `, { ${identifiersString} }`);
  }
  if (importNode.specifiers.length === 0) {
    const [importToken, maybeBrace] = sourceCode.getFirstTokens(importNode, { count: 2 });
    if (maybeBrace?.value === "{") {
      // import {} from 'source' => import { B, C, D } from 'source'
      return fixer.insertTextAfter(maybeBrace, ` ${identifiersString} `);
    } else {
      // import 'source' => import { B, C, D } from 'source'
      return importToken
        ? fixer.insertTextAfter(importToken, ` { ${identifiersString} } from`)
        : null;
    }
  }
  return null;
}
export function insertImports(
  fixer: TSESLint.RuleFixer,
  sourceCode: TSESLint.SourceCode,
  source: string,
  identifiers: Array<string>,
  aboveImport?: T.ImportDeclaration,
  isType = false
): TSESLint.RuleFix {
  const identifiersString = identifiers.join(", ");
  const programNode: T.Program = sourceCode.ast;

  // insert `import { missing, identifiers } from "source"` above given node or at top of module
  const firstImport = aboveImport ?? programNode.body.find((n) => n.type === "ImportDeclaration");
  if (firstImport) {
    return fixer.insertTextBeforeRange(
      (getCommentBefore(firstImport, sourceCode) ?? firstImport).range,
      `import ${isType ? "type " : ""}{ ${identifiersString} } from "${source}";\n`
    );
  }
  return fixer.insertTextBeforeRange(
    [0, 0],
    `import ${isType ? "type " : ""}{ ${identifiersString} } from "${source}";\n`
  );
}

export function removeSpecifier(
  fixer: TSESLint.RuleFixer,
  sourceCode: TSESLint.SourceCode,
  specifier: T.ImportSpecifier,
  pure = true
) {
  const declaration = specifier.parent as T.ImportDeclaration;
  if (declaration.specifiers.length === 1 && pure) {
    return fixer.remove(declaration);
  }
  const maybeComma = sourceCode.getTokenAfter(specifier);
  if (maybeComma?.value === ",") {
    return fixer.removeRange([specifier.range[0], maybeComma.range[1]]);
  }
  return fixer.remove(specifier);
}

export function jsxPropName(prop: T.JSXAttribute) {
  if (prop.name.type === "JSXNamespacedName") {
    return `${prop.name.namespace.name}:${prop.name.name.name}`;
  }

  return prop.name.name;
}

type Props = T.JSXOpeningElement["attributes"];

/** Iterate through both attributes and spread object props, yielding the name and the node. */
export function* jsxGetAllProps(props: Props): Generator<[string, T.Node]> {
  for (const attr of props) {
    if (attr.type === "JSXSpreadAttribute" && attr.argument.type === "ObjectExpression") {
      for (const property of attr.argument.properties) {
        if (property.type === "Property") {
          if (property.key.type === "Identifier") {
            yield [property.key.name, property.key];
          } else if (property.key.type === "Literal") {
            yield [String(property.key.value), property.key];
          }
        }
      }
    } else if (attr.type === "JSXAttribute") {
      yield [jsxPropName(attr), attr.name];
    }
  }
}

/** Returns whether an element has a prop, checking spread object props. */
export function jsxHasProp(props: Props, prop: string) {
  for (const [p] of jsxGetAllProps(props)) {
    if (p === prop) return true;
  }
  return false;
}

/** Get a JSXAttribute, excluding spread props. */
export function jsxGetProp(props: Props, prop: string) {
  return props.find(
    (attribute) => attribute.type !== "JSXSpreadAttribute" && prop === jsxPropName(attribute)
  ) as T.JSXAttribute | undefined;
}
