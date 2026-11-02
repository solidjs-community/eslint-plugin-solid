/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import { parse, parseFragment } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import { isValidHTMLNesting } from "validate-html-nesting";
import { isDOMElementName } from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds = "invalidNesting" | "invalidNestingInserted";
type Options = [];

/**
 * `<body>` from a parsed document, used as the parsing context so fragments are
 * interpreted the way `innerHTML` would interpret them.
 */
type ParentNode = DefaultTreeAdapterMap["parentNode"];
type ChildNode = DefaultTreeAdapterMap["childNode"];

const htmlElement = parse("<!DOCTYPE html><html><head></head><body></body></html>")
  .childNodes[1] as ParentNode;
const bodyContext = htmlElement.childNodes[1] as ParentNode;

type Namespace = "html" | "svg" | "math";

const rewriteCache = new Map<string, boolean>();
const tableWrappers: Record<string, string[]> = {
  caption: ["table"],
  colgroup: ["table"],
  tbody: ["table"],
  thead: ["table"],
  tfoot: ["table"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"],
};

/**
 * Does the HTML parser refuse to keep `child` as a direct child of `parent`?
 *
 * `validate-html-nesting` alone is not enough to answer this. Its tables encode
 * the spec's *content model* — `<figcaption>` belongs in `<figure>`, `<summary>`
 * in `<details>`, `<math>` takes only `<mrow>` — and conformance is a different
 * question from what the parser does. A browser keeps `<div><figcaption />`
 * exactly as written; it only rearranges a narrower set of cases. Reporting the
 * conformance answer under a message that talks about the browser rewriting the
 * DOM would be a false positive at error level.
 *
 * So the parser has the final say: the pair is only invalid when parse5, which
 * implements the HTML parsing algorithm and is what Solid's own compiler uses to
 * validate templates, fails to give back the same parent/child relationship.
 * The library stays as the cheap pre-filter that decides when to ask.
 */
const parserRewrites = (parent: string, child: string, namespace: Namespace): boolean => {
  const key = `${namespace}:${parent}>${child}`;
  const cached = rewriteCache.get(key);
  if (cached !== undefined) return cached;

  // A body fragment discards table-section tags without their table ancestors. Foreign
  // content is parsed inside its `<svg>` or `<math>`, where those are plain elements.
  const foreign = namespace !== "html";
  const wrappers = foreign ? [namespace] : tableWrappers[parent] ?? [];
  const documentParent = !foreign && (parent === "head" || parent === "body");
  const markup = wrappers.reduceRight(
    (content, tag) => `<${tag}>${content}</${tag}>`,
    `<${parent}><${child}></${child}></${parent}>`
  );
  let fragment: ParentNode | undefined = documentParent
    ? (parse(markup).childNodes.find((node) => node.nodeName === "html") as ParentNode | undefined)
    : parseFragment(bodyContext, markup, {});
  for (const tag of wrappers) {
    fragment = fragment?.childNodes.find((node) => node.nodeName === tag) as ParentNode | undefined;
  }
  const roots = (fragment?.childNodes ?? []).filter((n) => n.nodeName !== "#text");
  const root = documentParent
    ? roots.find((node) => node.nodeName === parent)
    : roots.length === 1 && roots[0].nodeName === parent
    ? roots[0]
    : undefined;
  // `<template>` parks its children in `content`, not `childNodes`.
  const container =
    root && "content" in root ? (root.content as ParentNode) : (root as ParentNode | undefined);
  const kids: ChildNode[] = (container?.childNodes ?? []).filter((n) => n.nodeName !== "#text");

  // Foreign content can only clear a report the HTML reading makes, since `<svg>` keeps
  // `<a><a />` as written. Tags breaking out of it are a scope rule, unreported like the rest.
  const rewritten =
    (!root || kids.length !== 1 || kids[0].nodeName !== child) &&
    (!foreign || parserRewrites(parent, child, "html"));
  rewriteCache.set(key, rewritten);
  return rewritten;
};

/**
 * The DOM tag name of a JSX element, or `null` when the element isn't a plain
 * lowercase tag: components (`<Foo />`), member expressions (`<Foo.Bar />`) and
 * namespaced names carry unknown markup and can't be validated statically.
 */
const getDOMTagName = (node: T.JSXElement): string | null => {
  const name = node.openingElement.name;
  return name.type === "JSXIdentifier" && isDOMElementName(name.name) ? name.name : null;
};

/** Wrappers that disappear at compile time, leaving the element where it was. */
const isTransparent = (node: T.Node): boolean =>
  node.type === "TSAsExpression" ||
  node.type === "TSNonNullExpression" ||
  node.type === "TSSatisfiesExpression";

/**
 * Walk up to the JSX element that will be this node's DOM parent.
 *
 * Everything traversed here compiles to the same parent/child pair: fragments
 * flatten, an expression container is an `insert()` into the same element, and
 * `&&`, ternaries and array literals only decide *whether* the child renders,
 * never where. A `children` prop is the same insert as writing the element
 * between the tags.
 *
 * Returns `null` when the chain leaves statically-known ground — a `.map()`
 * callback, a call argument, a variable rendered elsewhere. What wraps those
 * children is the caller's business, not this rule's.
 */
const getDOMParent = (node: T.JSXElement): T.JSXElement | null => {
  let current: T.Node = node;
  let parent: T.Node | undefined = current.parent;

  while (parent) {
    switch (parent.type) {
      case "JSXElement":
        return parent.children.includes(current as T.JSXChild) ? parent : null;
      case "JSXAttribute":
        // Only `children` names a child position; every other prop is data.
        return parent.name.type === "JSXIdentifier" &&
          parent.name.name === "children" &&
          parent.parent?.type === "JSXOpeningElement" &&
          parent.parent.parent?.type === "JSXElement"
          ? parent.parent.parent
          : null;
      case "JSXFragment":
      case "JSXExpressionContainer":
      case "ArrayExpression":
        current = parent;
        parent = parent.parent;
        break;
      case "LogicalExpression":
        // `cond && <hr />` renders the right side in place; `<hr /> && cond` doesn't render it.
        if (parent.right !== current) return null;
        current = parent;
        parent = parent.parent;
        break;
      case "ConditionalExpression":
        if (parent.test === current) return null;
        current = parent;
        parent = parent.parent;
        break;
      default:
        if (!isTransparent(parent)) return null;
        current = parent;
        parent = parent.parent;
    }
  }
  return null;
};

/**
 * Does `node` reach `parent` through an expression container or a `children`
 * prop? Those compile to an `insert()`, which the client performs as written;
 * only server-rendered HTML goes back through the parser.
 */
const isInserted = (node: T.JSXElement, parent: T.JSXElement): boolean => {
  let current: T.Node | undefined = node.parent;
  while (current && current !== parent) {
    if (current.type === "JSXExpressionContainer" || current.type === "JSXAttribute") return true;
    current = current.parent;
  }
  return false;
};

/** SVG and MathML elements whose children the parser reads as HTML again. */
const htmlIntegrationPoints = new Set([
  "foreignObject",
  "desc",
  "title",
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
]);

/**
 * The namespace the parser is in when it reaches this element's start tag: SVG or
 * MathML below the nearest `<svg>` or `<math>`, HTML again below an integration
 * point like `<foreignObject>`. Inside `<svg>`, `<a><a /></a>` and `<title><b /></title>`
 * are kept as written, so judging them as HTML would report markup that is fine.
 *
 * The walk crosses expressions and components alike. A wrong guess here can only
 * hide a report, never add one.
 */
const getParsingNamespace = (node: T.JSXElement): Namespace => {
  for (let ancestor: T.Node | undefined = node.parent; ancestor; ancestor = ancestor.parent) {
    if (ancestor.type !== "JSXElement") continue;
    const tag = getDOMTagName(ancestor);
    if (tag === "svg" || tag === "math") return tag;
    if (tag && htmlIntegrationPoints.has(tag)) return "html";
  }
  return "html";
};

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow HTML nesting the browser refuses to keep, like `<p><div /></p>`, which silently renders a different DOM than the JSX describes.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/validate-jsx-nesting.md",
    },
    schema: [],
    messages: {
      invalidNesting:
        "Invalid HTML nesting: `<{{child}}>` cannot be a child of `<{{parent}}>`. The HTML parser restructures this, so the rendered DOM won't match this markup.",
      invalidNestingInserted:
        "Invalid HTML nesting: `<{{child}}>` cannot be a child of `<{{parent}}>`. The client inserts it as written, but the HTML parser restructures it in server-rendered HTML, so hydration won't match this markup.",
    },
  },
  defaultOptions: [],
  create(context) {
    const check = (node: T.JSXElement, child: string, parentNode: T.JSXElement) => {
      const parent = getDOMTagName(parentNode);
      if (!parent) return;
      if (isValidHTMLNesting(parent, child)) return;
      if (!parserRewrites(parent, child, getParsingNamespace(parentNode))) return;

      context.report({
        node: node.openingElement.name,
        messageId: isInserted(node, parentNode) ? "invalidNestingInserted" : "invalidNesting",
        data: { parent, child },
      });
    };

    return {
      JSXElement(node) {
        const child = getDOMTagName(node);
        if (!child) return;

        const parentNode = getDOMParent(node);
        if (parentNode) check(node, child, parentNode);
      },
    };
  },
});
