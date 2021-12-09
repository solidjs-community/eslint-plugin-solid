/* eslint-disable */
import type { Rule } from "eslint";
import type {
  Node,
  FunctionExpression,
  ObjectPattern,
  Literal,
  Identifier,
  Expression,
} from "estree-jsx";
import { getStringIfConstant } from "eslint-utils";
import { findParent } from "../utils";
import { isReturningJSX } from "../utils/ast";

const getName = (node): string | null => {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Identifier":
      return node.name;
    case "AssignmentPattern":
      return getName(node.left);
    default:
      return getStringIfConstant(node);
  }
};

interface PropertyInfo {
  real: Literal | Identifier | Expression;
  var: string;
  computed: boolean;
  init: Expression | undefined;
}

// Given ({ 'hello-world': helloWorld = 5 }), returns { real: Literal('hello-world'), var: 'helloWorld', computed: false, init: Literal(5) }
const getPropertyInfo = (prop): PropertyInfo | null => {
  const valueName = getName(prop.value);
  if (valueName !== null) {
    return {
      real: prop.key,
      var: valueName,
      computed: prop.computed,
      init: prop.value.type === "AssignmentPattern" ? prop.value.right : undefined,
    };
  } else {
    return null;
  }
};

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "",
    },
    messages: {
      noDestructure: "Destructuring component props breaks Solid's reactivity; access ",
    },
    fixable: "code",
  },
  create(context): Rule.RuleListener {
    const fixDestructure = ({
      func,
      props,
      fixer,
    }: {
      func: Rule.Node;
      props: ObjectPattern;
      fixer: Rule.RuleFixer;
    }): Array<Rule.Fix> => {
      const properties = props.properties;

      const propertyInfo: Array<PropertyInfo> = [];
      let rest = null;

      for (const property of properties) {
        if (property.type === "RestElement") {
          rest = property;
        } else {
          const info = getPropertyInfo(property);
          if (info === null) {
            continue;
          }
          propertyInfo.push(info);
        }
      }

      const sourceCode = context.getSourceCode();
      const fixes: Array<Rule.Fix> = [];
      // Replace destructured props with a `props` identifier
      fixes.push(fixer.replaceText(props, "props"));
      // Create an object containing all the defaults
      const defaultsObject =
        "{ " +
        propertyInfo
          .filter((info) => info.init)
          .map(
            (info) =>
              `${info.computed ? "[" : ""}${sourceCode.getText(info.real)}${
                info.computed ? "]" : ""
              }: ${sourceCode.getText(info.init)}`
          )
          .join(", ") +
        " }";
    };
    return {
      "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression"(node) {
        if (
          node.params.length === 1 &&
          node.params[0].type !== "RestElement" &&
          isReturningJSX(node)
        ) {
          const props = node.params[0];
          switch (props.type) {
            case "ObjectPattern":
              // Props are destructured in the function params, not the body.
              context.report({
                node: props,
                messageId: "noDestructure",
                fix: (fixer) =>
                  fixDestructure({
                    func: node,
                    props,
                    fixer,
                  }),
              });
              break;
          }
        }
      },
    };
  },
};

export default rule;
