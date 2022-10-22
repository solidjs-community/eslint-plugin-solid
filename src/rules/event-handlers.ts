import { TSESTree as T, TSESLint, ASTUtils } from "@typescript-eslint/utils";
import { isDOMElementName } from "../utils";

const { getStaticValue } = ASTUtils;

const COMMON_EVENTS: Record<string, string | null> = {
  animationend: "AnimationEnd",
  animationiteration: "AnimationIteration",
  animationstart: "AnimationStart",
  beforeinput: "BeforeInput",
  blur: null,
  change: null,
  click: null,
  contextmenu: "ContextMenu",
  copy: null,
  cut: null,
  dblclick: "DoubleClick",
  drag: null,
  dragend: "DragEnd",
  dragenter: "DragEnter",
  dragexit: "DragExit",
  dragleave: "DragLeave",
  dragover: "DragOver",
  dragstart: "DragStart",
  drop: null,
  error: null,
  focus: null,
  focusin: "FocusIn",
  focusout: "FocusOut",
  gotpointercapture: "GotPointerCapture",
  input: null,
  invalid: null,
  keydown: "KeyDown",
  keypress: "KeyPress",
  keyup: "KeyUp",
  load: null,
  lostpointercapture: "LostPointerCapture",
  mousedown: "MouseDown",
  mouseenter: "MouseEnter",
  mouseleave: "MouseLeave",
  mousemove: "MouseMove",
  mouseout: "MouseOut",
  mouseover: "MouseOver",
  mouseup: "MouseUp",
  paste: null,
  pointercancel: "PointerCancel",
  pointerdown: "PointerDown",
  pointerenter: "PointerEnter",
  pointerleave: "PointerLeave",
  pointermove: "PointerMove",
  pointerout: "PointerOut",
  pointerover: "PointerOver",
  pointerup: "PointerUp",
  reset: null,
  scroll: null,
  select: null,
  submit: null,
  toggle: null,
  touchcancel: "TouchCancel",
  touchend: "TouchEnd",
  touchmove: "TouchMove",
  touchstart: "TouchStart",
  transitionend: "TransitionEnd",
  wheel: null,
};

const isCommonEventName = (lowercaseEventName: string) =>
  Object.prototype.hasOwnProperty.call(COMMON_EVENTS, lowercaseEventName);
const getCommonEventHandlerName = (lowercaseEventName: string) => {
  return `on${
    COMMON_EVENTS[lowercaseEventName] ??
    lowercaseEventName[0].toUpperCase() + lowercaseEventName.slice(1).toLowerCase()
  }`;
};

const rule: TSESLint.RuleModule<
  "naming" | "capitalization" | "make-handler" | "make-attr" | "detected-attr" | "spread-handler",
  [{ ignoreCase?: boolean }?]
> = {
  meta: {
    type: "problem",
    docs: {
      recommended: "warn",
      description:
        "Enforce naming DOM element event handlers consistently and prevent Solid's analysis from misunderstanding whether a prop should be an event handler.",
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/docs/event-handlers.md",
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          ignoreCase: {
            type: "boolean",
            description:
              "if true, don't warn on ambiguously named event handlers like `onclick` or `onchange`",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      "detected-attr":
        'The {{name}} prop is named as an event handler (starts with "on"), but Solid knows its value ({{staticValue}}) is a string or number, so it will be treated as an attribute. If this is intentional, name this prop attr:{{name}}.',
      naming:
        "The {{name}} prop is ambiguous. If it is an event handler, change it to {{handlerName}}. If it is an attribute, change it to {{attrName}}.",
      capitalization: "The {{name}} prop should be renamed to {{fixedName}} for readability.",
      "make-handler": "Change the {{name}} prop to {{handlerName}}.",
      "make-attr": "Change the {{name}} prop to {{attrName}}.",
      "spread-handler":
        "The {{name}} prop should be added as a JSX attribute, not spread in. Solid doesn't add listeners when spreading into JSX.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      JSXAttribute(node) {
        const openingElement = node.parent as T.JSXOpeningElement;
        if (
          openingElement.name.type !== "JSXIdentifier" ||
          !isDOMElementName(openingElement.name.name)
        ) {
          return; // bail if this is not a DOM/SVG element or web component
        }

        if (node.name.type === "JSXNamespacedName") {
          return; // bail early on attr:, on:, etc. props
        }

        // string name of the name node
        const { name } = node.name;

        const match = /^on([a-zA-Z].*)$/.exec(name);
        if (!match) {
          return; // bail if Solid doesn't consider the prop name an event handler
        }

        let staticValue: ReturnType<typeof getStaticValue> = null;
        if (
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression.type !== "JSXEmptyExpression" &&
          node.value.expression.type !== "ArrayExpression" && // array syntax prevents inlining
          (staticValue = getStaticValue(node.value.expression, context.getScope())) !== null &&
          (typeof staticValue.value === "string" || typeof staticValue.value === "number")
        ) {
          // One of the first things Solid (actually babel-plugin-dom-expressions) does with an
          // attribute is determine if it can be inlined into a template string instead of
          // injected programmatically. It runs
          // `attribute.get("value").get("expression").evaluate().value` on attributes with
          // JSXExpressionContainers, and if the statically evaluated value is a string or number,
          // it inlines it. This runs even for attributes that follow the naming convention for
          // event handlers. By starting an attribute name with "on", the user has signalled that
          // they intend the attribute to be an event handler. If the attribute value would be
          // inlined, report that.
          // https://github.com/ryansolid/dom-expressions/blob/cb3be7558c731e2a442e9c7e07d25373c40cf2be/packages/babel-plugin-jsx-dom-expressions/src/dom/element.js#L347
          context.report({
            node: node,
            messageId: "detected-attr",
            data: {
              name,
              staticValue: staticValue.value,
            },
          });
        } else if (node.value === null || node.value?.type === "Literal") {
          // Check for same as above for literal values
          context.report({
            node: node,
            messageId: "detected-attr",
            data: {
              name,
              staticValue: node.value !== null ? node.value.value : true,
            },
          });
        } else if (!context.options[0]?.ignoreCase) {
          const lowercaseEventName = match[1].toLowerCase();
          if (isCommonEventName(lowercaseEventName)) {
            const fixedName = getCommonEventHandlerName(lowercaseEventName);
            if (fixedName !== name) {
              // For common DOM event names, we know the user intended the prop to be an event handler.
              // Fix it to have an uppercase third letter and be properly camel-cased.
              context.report({
                node: node.name,
                messageId: "capitalization",
                data: { name, fixedName },
                fix: (fixer) => fixer.replaceText(node.name, fixedName),
              });
            }
          } else if (name[2] === name[2].toLowerCase()) {
            // this includes words like `only` and `ongoing` as well as unknown handlers like `onfoobar`.
            // Enforce using either /^on[A-Z]/ (event handler) or /^attr:on[a-z]/ (forced regular attribute)
            // to make user intent clear and code maximally readable
            const handlerName = `on${match[1][0].toUpperCase()}${match[1].slice(1)}`;
            const attrName = `attr:${name}`;
            context.report({
              node: node.name,
              messageId: "naming",
              data: { name, attrName, handlerName },
              suggest: [
                {
                  messageId: "make-handler",
                  data: { name, handlerName },
                  fix: (fixer) => fixer.replaceText(node.name, handlerName),
                },
                {
                  messageId: "make-attr",
                  data: { name, attrName },
                  fix: (fixer) => fixer.replaceText(node.name, attrName),
                },
              ],
            });
          }
        }
      },
      "JSXSpreadAttribute > ObjectExpression > Property"(node: T.Property) {
        const openingElement = node.parent!.parent!.parent as T.JSXOpeningElement;
        if (
          openingElement.name.type === "JSXIdentifier" &&
          isDOMElementName(openingElement.name.name)
        ) {
          if (node.key.type === "Identifier" && /^on/.test(node.key.name)) {
            const handlerName = node.key.name;
            // An event handler is being spread in (ex. <button {...{ onClick }} />), which doesn't
            // actually add an event listener, just a plain attribute.
            context.report({
              node,
              messageId: "spread-handler",
              data: {
                name: node.key.name,
              },
              fix: (fixer) => [
                fixer.remove(node),
                fixer.insertTextAfter(
                  node.parent!.parent!,
                  ` ${handlerName}={${sourceCode.getText(node.value)}}`
                ),
              ],
            });
          }
        }
      },
    };
  },
};

export default rule;
