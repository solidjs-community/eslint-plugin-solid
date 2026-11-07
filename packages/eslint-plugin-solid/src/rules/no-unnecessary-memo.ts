import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { findVariable, getSourceCode } from "../compat";
import {
  getSolidSourceRegex,
  isDOMElementName,
  isFunctionNode,
  jsxPropName,
  trackImports,
} from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "unnecessaryMemo" | "useFunction";
type Options = [];

type FreshKind = "object" | "array" | "JSX" | "value";

const LOOPS = new Set<string>([
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
]);

/** Strip TS-only wrappers that don't change the runtime value. */
const unwrap = (node: T.Node): T.Node => {
  while (
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSTypeAssertion" ||
    (node.type as string) === "ParenthesizedExpression"
  ) {
    node = (node as T.TSAsExpression).expression;
  }
  return node;
};

/**
 * What fresh value an expression always produces, or null if it can produce
 * anything that might compare equal to the previous value.
 */
const freshKind = (node: T.Node): FreshKind | null => {
  node = unwrap(node);
  switch (node.type) {
    case "ObjectExpression":
      return "object";
    case "ArrayExpression":
      return "array";
    case "JSXElement":
    case "JSXFragment":
      return "JSX";
    case "ConditionalExpression": {
      const a = freshKind(node.consequent);
      const b = freshKind(node.alternate);
      return a && b ? (a === b ? a : "value") : null;
    }
    default:
      return null;
  }
};

/** Every return of a block-bodied function, not counting nested functions. */
const collectReturns = (node: T.Node, out: Array<T.ReturnStatement>) => {
  if (node.type === "ReturnStatement") {
    out.push(node);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = (node as any)[key];
    const visit = (c: unknown) => {
      if (c && typeof (c as T.Node).type === "string" && !isFunctionNode(c as T.Node)) {
        if ((c as T.Node).type === "ClassBody") return;
        collectReturns(c as T.Node, out);
      }
    };
    if (Array.isArray(child)) child.forEach(visit);
    else visit(child);
  }
};

const functionFreshKind = (fn: T.ArrowFunctionExpression | T.FunctionExpression) => {
  if (fn.async || fn.generator) return null;
  if (fn.body.type !== "BlockStatement") return freshKind(fn.body);
  // Every path must end in a fresh return, so no path can fall off the end
  // and return `undefined` (which *would* compare equal to itself).
  const last = fn.body.body[fn.body.body.length - 1];
  if (!last || last.type !== "ReturnStatement") return null;
  const returns: Array<T.ReturnStatement> = [];
  collectReturns(fn.body, returns);
  let kind: FreshKind | null = null;
  for (const ret of returns) {
    const k = ret.argument && freshKind(ret.argument);
    if (!k) return null;
    kind = kind && kind !== k ? "value" : k;
  }
  return kind;
};

const isIntrinsic = (el: T.JSXElement) =>
  el.openingElement.name.type === "JSXIdentifier" && isDOMElementName(el.openingElement.name.name);

/*
 * A memo earns its node in two ways: it shares one computation between several
 * readers, and its equality check stops propagation when the value didn't
 * change. A memo that returns a fresh object, array, or JSX on every run never
 * compares equal, so the second benefit is gone; if it is also read in exactly
 * one place that runs exactly once per update, the first is gone too. The
 * reader would track the same sources itself, so the memo is just an extra
 * node, allocation, and propagation hop.
 *
 * "Read once" has to be a runtime fact, not a textual one, so the read must be
 * in a position the compiler turns into a single tracked computation created
 * once per owner:
 *  - an expression in an intrinsic element's attribute or child (one render
 *    effect), with only intrinsic elements and fragments between it and the
 *    memo's scope, or
 *  - the body of a `createMemo` / the compute half of `createEffect` /
 *    `createRenderEffect` created directly in the memo's scope.
 * Everything else is skipped: component props and children are getters that
 * the child can read any number of times, nested callbacks (`<For>`, handlers,
 * `.map`) can run many times, and loops create several readers.
 */
export default createRule<Options, MessageIds>({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow `createMemo` around a fresh object, array, or JSX value that is read in only one place.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-unnecessary-memo.md",
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      unnecessaryMemo:
        "This memo returns a new {{kind}} every time, so its equality check never skips an update, and it is read in only one place, so nothing shares it. Use a plain function, or inline the expression.",
      useFunction: "Replace `createMemo` with a plain function.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { matchImport, handleImportDeclaration } = trackImports(getSolidSourceRegex(context));

    const isTrackedPrimitiveArg = (fn: T.Node): boolean => {
      const call = fn.parent;
      if (
        !call ||
        call.type !== "CallExpression" ||
        call.arguments[0] !== fn ||
        call.callee.type !== "Identifier" ||
        (fn as T.ArrowFunctionExpression).async ||
        (fn as T.ArrowFunctionExpression).generator
      ) {
        return false;
      }
      if (matchImport("createMemo", call.callee.name)) return true;
      // Only the split 2.0 form has a pure compute half.
      return (
        !!matchImport(["createEffect", "createRenderEffect"], call.callee.name) &&
        call.arguments.length >= 2
      );
    };

    /**
     * Does a read at `read` run exactly once per update of a single
     * computation created once in `scope`?
     */
    const isSingleTrackedRead = (read: T.Node, scope: T.Node): boolean => {
      let tracked = false;
      let node = read.parent;
      while (node && node !== scope) {
        if (isFunctionNode(node)) {
          if (tracked || !isTrackedPrimitiveArg(node)) return false;
          tracked = true;
        } else if (LOOPS.has(node.type)) {
          return false;
        } else if (node.type === "JSXExpressionContainer") {
          if (tracked) return false;
          const parent = node.parent;
          if (parent.type === "JSXAttribute") {
            const name = jsxPropName(parent);
            const el = parent.parent.parent as T.JSXElement;
            if (name === "ref" || /^on/i.test(name) || !isIntrinsic(el)) return false;
          } else if (parent.type !== "JSXElement" || !isIntrinsic(parent)) {
            return false;
          }
          tracked = true;
        } else if (node.type === "JSXElement") {
          if (!isIntrinsic(node)) return false;
        } else if (node.type === "JSXSpreadAttribute" || node.type === "ClassBody") {
          return false;
        }
        node = node.parent;
      }
      return tracked && node === scope;
    };

    return {
      ImportDeclaration: handleImportDeclaration,
      VariableDeclarator(node) {
        const init = node.init;
        if (
          node.id.type !== "Identifier" ||
          init?.type !== "CallExpression" ||
          init.callee.type !== "Identifier" ||
          init.arguments.length !== 1 ||
          !matchImport("createMemo", init.callee.name)
        ) {
          return;
        }
        const declaration = node.parent;
        if (
          declaration?.type !== "VariableDeclaration" ||
          declaration.kind !== "const" ||
          declaration.parent?.type === "ExportNamedDeclaration"
        ) {
          return;
        }
        const fn = init.arguments[0];
        if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") return;
        const kind = functionFreshKind(fn);
        if (!kind) return;

        const variable = findVariable(context, node.id);
        if (!variable) return;
        const reads = variable.references.filter((ref) => !ref.init);
        if (reads.length !== 1) return;
        const id = reads[0].identifier as T.Node;
        const call = id.parent;
        if (call?.type !== "CallExpression" || call.callee !== id || call.arguments.length) return;

        let scope: T.Node | undefined = node.parent;
        while (scope && !isFunctionNode(scope) && scope.type !== "Program") scope = scope.parent;
        if (!scope || !isSingleTrackedRead(call, scope)) return;

        context.report({
          node: init,
          messageId: "unnecessaryMemo",
          data: { kind: kind === "JSX" ? "JSX value" : kind },
          suggest: [
            {
              messageId: "useFunction",
              fix: (fixer: TSESLint.RuleFixer) =>
                fixer.replaceText(init, getSourceCode(context).getText(fn)),
            },
          ],
        });
      },
    };
  },
});
