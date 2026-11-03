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
import { isDOMElementName, jsxPropName } from "../utils";

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

/** Void elements take no end tag, and the parser would read `</br>` as another `<br>`. */
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** parse5 lowercases tag names outside SVG, so `<foreignObject>` comes back as `foreignobject`. */
const isTag = (node: ChildNode, tag: string): boolean =>
  node.nodeName.toLowerCase() === tag.toLowerCase();

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
  const childMarkup = voidElements.has(child) ? `<${child}>` : `<${child}></${child}>`;
  const markup = wrappers.reduceRight(
    (content, tag) => `<${tag}>${content}</${tag}>`,
    `<${parent}>${childMarkup}</${parent}>`
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
    : roots.length === 1 && isTag(roots[0], parent)
    ? roots[0]
    : undefined;
  // `<template>` parks its children in `content`, not `childNodes`.
  const container =
    root && "content" in root ? (root.content as ParentNode) : (root as ParentNode | undefined);
  const kids: ChildNode[] = (container?.childNodes ?? []).filter((n) => n.nodeName !== "#text");

  // Foreign content can only clear a report the HTML reading makes, since `<svg>` keeps
  // `<a><a />` as written. Tags breaking out of it are a scope rule, unreported like the rest.
  const rewritten =
    (!root || kids.length !== 1 || !isTag(kids[0], child)) &&
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

/** SVG elements whose children the parser reads as HTML again, by lowercase name. */
const svgIntegrationPoints = new Set(["foreignobject", "desc", "title"]);

/** MathML elements whose children the parser reads as HTML again. */
const mathIntegrationPoints = new Set(["mi", "mo", "mn", "ms", "mtext"]);

/** MathML tags that stay MathML right inside those, children included. */
const mathTextLeaves = new Set(["mglyph", "malignmark"]);

/**
 * HTML tags that make the parser leave SVG or MathML wherever they appear in it.
 * `<font>` only does with some attributes, so it's checked on its own below.
 */
const foreignContentExits = new Set([
  "b",
  "big",
  "blockquote",
  "body",
  "br",
  "center",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "hr",
  "i",
  "img",
  "li",
  "listing",
  "menu",
  "meta",
  "nobr",
  "ol",
  "p",
  "pre",
  "ruby",
  "s",
  "small",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "table",
  "tt",
  "u",
  "ul",
  "var",
]);

/** `<font>` leaves foreign content when it has one of these attributes. */
const fontExitAttributes = new Set(["color", "face", "size"]);

/** `<annotation-xml>` hands its children back to HTML with one of these encodings. */
const htmlAnnotationEncodings = new Set(["text/html", "application/xhtml+xml"]);

/**
 * Does the parser read this element's children as HTML, although the element sits in
 * SVG or MathML? Integration points only count in their own namespace: `<title>` is
 * one in SVG and a plain element in MathML, and `<mi>` the other way around.
 */
const switchesToHTML = (
  element: T.JSXElement,
  tag: string,
  namespace: Exclude<Namespace, "html">
): boolean => {
  if (foreignContentExits.has(tag)) return true;
  const { attributes } = element.openingElement;
  if (tag === "font") {
    return attributes.some(
      (attr) =>
        attr.type === "JSXAttribute" && fontExitAttributes.has(jsxPropName(attr).toLowerCase())
    );
  }
  if (namespace === "svg") return svgIntegrationPoints.has(tag);
  if (tag === "annotation-xml") {
    // The parser lowercases attribute names and keeps the first of a repeated one.
    const encoding = attributes.find(
      (attr): attr is T.JSXAttribute =>
        attr.type === "JSXAttribute" && jsxPropName(attr).toLowerCase() === "encoding"
    )?.value;
    return (
      encoding?.type === "Literal" &&
      typeof encoding.value === "string" &&
      htmlAnnotationEncodings.has(encoding.value.toLowerCase())
    );
  }
  return mathIntegrationPoints.has(tag);
};

/**
 * Does the parser start SVG or MathML at this `<svg>` or `<math>`, written right inside
 * `parentTag`? It does coming from HTML, and for `<svg>` in MathML's `<annotation-xml>`.
 * Anywhere else in foreign content the tag is a plain element of the namespace around
 * it, so the `<mi>` in `<svg><math><mi>` is an SVG element and keeps its children.
 */
const startsNamespace = (tag: string, namespace: Namespace, parentTag: string): boolean =>
  namespace === "html" || (tag === "svg" && namespace === "math" && parentTag === "annotation-xml");

/**
 * The namespace the parser is in when it reaches this element's start tag: SVG or
 * MathML below an `<svg>` or `<math>` that starts it, HTML again below an integration
 * point like `<foreignObject>` or a tag that leaves foreign content like `<p>`.
 * Inside `<svg>`, `<a><a /></a>` and `<title><b /></title>` are kept as written, so
 * judging them as HTML would report markup that is fine.
 *
 * The walk crosses expressions and components alike, although the compiler starts
 * a new template there. A wrong guess here can only hide a report, never add one.
 * An `<svg>` or `<math>` right behind one is the root of that template, which starts
 * its own namespace.
 */
const getParsingNamespace = (node: T.JSXElement): Namespace => {
  // The element itself comes along, since `<mglyph>` can set its own namespace.
  const elements: Array<[T.JSXElement, string]> = [];
  for (let current: T.Node | undefined = node; current; current = current.parent) {
    if (current.type !== "JSXElement") continue;
    const tag = getDOMTagName(current);
    // The tokenizer lowercases tag names before any of the checks below.
    if (tag) elements.push([current, tag.toLowerCase()]);
  }
  // Outermost first, since whether an element switches depends on the namespace it is in.
  let namespace: Namespace = "html";
  let parent: [T.JSXElement, string, Namespace] | undefined;
  for (const [element, tag] of elements.reverse()) {
    // Anything between two elements, like an expression or a component, is a boundary.
    const outer = parent && element.parent === parent[0] ? parent : undefined;
    // The namespace this element's own start tag is parsed in.
    const own: Namespace =
      outer && outer[2] === "math" && mathIntegrationPoints.has(outer[1]) && mathTextLeaves.has(tag)
        ? "math"
        : namespace;
    if (element === node) return own;
    if (tag === "svg" || tag === "math") {
      namespace = !outer || startsNamespace(tag, own, outer[1]) ? tag : own;
    } else {
      namespace = own !== "html" && switchesToHTML(element, tag, own) ? "html" : own;
    }
    parent = [element, tag, own];
  }
  return namespace;
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
