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
    switch (def.type) {
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
export function ignoreTransparentWrappers(node: T.Node, up = false): T.Node {
  if (
    node.type === "TSAsExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  ) {
    const next = up ? node.parent : node.expression;
    if (next) {
      return ignoreTransparentWrappers(next, up);
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

export const trackImports = (fromModule = /^solid-js(?:\/?|\b)/) => {
  const importMap = new Map<string, string>();
  const handleImportDeclaration = (node: T.ImportDeclaration) => {
    if (fromModule.test(node.source.value)) {
      for (const specifier of node.specifiers) {
        if (specifier.type === "ImportSpecifier") {
          importMap.set(specifier.imported.name, specifier.local.name);
        }
      }
    }
  };
  const matchImport = (imports: string | Array<string>, str: string): string | undefined => {
    const importArr = Array.isArray(imports) ? imports : [imports];
    return importArr.find((i) => importMap.get(i) === str);
  };
  return { matchImport, handleImportDeclaration };
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
