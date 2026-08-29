import { TSESTree as T, TSESLint } from "@typescript-eslint/utils";
import { CompatContext, findVariable } from "./compat";

const domElementRegex = /^[a-z]/;
export const isDOMElementName = (name: string): boolean => domElementRegex.test(name);

interface HasSettings {
  settings?: TSESLint.SharedConfigurationSettings;
}

/**
 * Read the targeted Solid version from `settings: { solid: { version: 2 } }`.
 * Returns the major version number, or `null` when unset — meaning rules should
 * use permissive dual-version behavior (accept both 1.x and 2.x patterns).
 */
export function getSolidVersion(context: HasSettings): number | null {
  const solidSettings = context.settings?.solid;
  if (solidSettings && typeof solidSettings === "object" && "version" in solidSettings) {
    const version = (solidSettings as { version: unknown }).version;
    if (typeof version === "number" && Number.isInteger(version) && version > 0) {
      return version;
    }
    if (typeof version === "string") {
      const major = parseInt(version, 10);
      if (Number.isInteger(major) && major > 0) return major;
    }
  }
  return null;
}

/** Whether the targeted Solid version is 2.x or later. */
export const isSolidV2 = (context: HasSettings): boolean => (getSolidVersion(context) ?? 0) >= 2;

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
export function trace(node: T.Node, context: CompatContext): T.Node {
  if (node.type === "Identifier") {
    const variable = findVariable(context, node);
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
          return trace(def.node.init, context);
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

/**
 * The leading string-literal expression statements of a program or function
 * body — the directive prologue. Only statements here are directives; a
 * `"use server"` string anywhere else is an ordinary expression.
 */
export const getDirectivePrologue = (body: T.Statement[]): T.ExpressionStatement[] => {
  const prologue: T.ExpressionStatement[] = [];
  for (const statement of body) {
    if (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "Literal" &&
      typeof statement.expression.value === "string"
    ) {
      prologue.push(statement);
    } else {
      break;
    }
  }
  return prologue;
};

const prologueHasDirective = (body: T.Statement[], directive: string): boolean =>
  getDirectivePrologue(body).some(
    (statement) => (statement.expression as T.StringLiteral).value === directive
  );

/** Whether a function has a `"use server"` directive in its body's prologue. */
export const hasUseServerDirective = (fn: FunctionNode): boolean =>
  fn.body?.type === "BlockStatement" && prologueHasDirective(fn.body.body, "use server");

/** Whether a program has a module-level `"use server"` directive. */
export const programHasUseServerDirective = (program: T.Program): boolean =>
  prologueHasDirective(program.body, "use server");

/**
 * Whether the `"use server"` transform would extract this function. Mirrors
 * the compiler: object-literal methods, getters/setters, and class methods
 * are never extracted, so directives inside them are silently ignored.
 */
export type UseServerEligibility = "eligible" | "objectMethod" | "accessor" | "classMethod";
export const getUseServerEligibility = (fn: FunctionNode): UseServerEligibility => {
  const parent = fn.parent;
  if (parent?.type === "Property" && parent.value === fn) {
    if (parent.kind !== "init") return "accessor";
    if (parent.method) return "objectMethod";
  }
  if (parent?.type === "MethodDefinition") {
    return parent.kind === "get" || parent.kind === "set" ? "accessor" : "classMethod";
  }
  return "eligible";
};

/**
 * Whether `fn` is nested inside another function carrying a `"use server"`
 * directive. The transform extracts the outermost marked function only;
 * directives inside it are ignored (the code already runs on the server).
 */
export const isInsideUseServerFunction = (fn: FunctionNode): boolean => {
  let parent = findParent(fn, isFunctionNode);
  while (parent) {
    if (isFunctionNode(parent) && hasUseServerDirective(parent)) return true;
    parent = findParent(parent, isFunctionNode);
  }
  return false;
};

/**
 * Compiles a list of user-provided name patterns into a matcher. Entries may
 * be exact names, glob-ish patterns using `*` wildcards ("watch*"), or
 * regexes written as "/pattern/" strings. Invalid regexes fall back to exact
 * string comparison.
 */
export const createNameMatcher = (patterns: string[]): ((name: string) => boolean) => {
  const matchers: (string | RegExp)[] = patterns.map((entry) => {
    if (entry.length > 2 && entry.startsWith("/") && entry.endsWith("/")) {
      try {
        return new RegExp(entry.slice(1, -1));
      } catch {
        return entry;
      }
    }
    if (entry.includes("*")) {
      const escaped = entry
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join("[a-zA-Z0-9_$]*");
      return new RegExp(`^${escaped}$`);
    }
    return entry;
  });
  return (name: string): boolean =>
    matchers.some((matcher) =>
      typeof matcher === "string" ? matcher === name : matcher.test(name)
    );
};

// Matches "solid-js", its submodules ("solid-js/store", etc.), and the Solid 2.0
// "@solidjs/signals" package, which re-exports the core reactive primitives.
export const trackImports = (
  fromModule = /^(?:solid-js(?:\/?|\b)|@solidjs\/signals(?:\/?|\b))/
) => {
  const importMap = new Map<string, string>();
  const handleImportDeclaration = (node: T.ImportDeclaration) => {
    if (fromModule.test(node.source.value)) {
      for (const specifier of node.specifiers) {
        if (specifier.type === "ImportSpecifier") {
          const importedName =
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value;
          importMap.set(importedName, specifier.local.name);
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
