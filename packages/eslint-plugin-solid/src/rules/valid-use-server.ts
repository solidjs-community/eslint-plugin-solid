/**
 * FIXME: remove this comments and import when below issue is fixed.
 * This import is necessary for type generation due to a bug in the TypeScript compiler.
 * See: https://github.com/microsoft/TypeScript/issues/42873
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TSESLint } from "@typescript-eslint/utils";

import { TSESTree as T, ESLintUtils } from "@typescript-eslint/utils";
import {
  findParent,
  isFunctionNode,
  trackImports,
  createNameMatcher,
  getDirectivePrologue,
  getUseServerEligibility,
  isInsideUseServerFunction,
  programHasUseServerDirective,
} from "../utils";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

type MessageIds =
  | "misplacedDirective"
  | "templateDirective"
  | "ineligiblePosition"
  | "nonFunctionExport"
  | "clientWrapper";
type Options = [{ clientWrappers: string[] }];

const POSITION_LABELS = {
  objectMethod: "an object method",
  accessor: "a getter or setter",
  classMethod: "a class method",
} as const;

/**
 * Declaration wrappers whose behavior lives in the client bundle. In a
 * module-level "use server" file the client build replaces every export with
 * a bare server reference, so these wrapper calls are compiled out of the
 * client entirely: `GET`/`withMeta` metadata never reaches the client proxy
 * (calls silently go over POST), `live` sources never get their live
 * transport, and the router's `query`/`action`/`liveQuery` integration
 * (caching, dedup, submission tracking) never happens.
 */
const CLIENT_WRAPPERS = ["GET", "live", "withMeta", "query", "action", "liveQuery"];
const WRAPPER_SOURCES = /^(?:solid-js|@solidjs\/(?:web|router|start))(?:\/|$)/;

const isDefinitelyNotFunction = (node: T.Node): boolean =>
  node.type === "Literal" ||
  node.type === "TemplateLiteral" ||
  node.type === "ArrayExpression" ||
  node.type === "ObjectExpression";

export default createRule<Options, MessageIds>({
  meta: {
    type: "problem",
    docs: {
      description:
        'Enforce that "use server" directives are placed where the compiler honors them, and that module-level directive files export working server functions.',
      url: "https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/valid-use-server.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          clientWrappers: {
            description:
              "Additional function names treated as client-side declaration wrappers that must not be called inside a module-level \"use server\" file. Supports exact names, '*' wildcards, and regexes given as '/pattern/' strings. GET, live, withMeta, query, action, and liveQuery are always included.",
            type: "array",
            items: { type: "string" },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      misplacedDirective:
        'The "use server" directive only takes effect as the first statement of a function body or module; here it is an ordinary expression statement and the code stays on the client.',
      templateDirective:
        'A template literal is never a directive; this code stays on the client. Use a plain string: "use server".',
      ineligiblePosition:
        'The "use server" directive in {{position}} is silently ignored — the function is never extracted to the server. Use a standalone function, a function-valued property, or a block-bodied arrow instead.',
      nonFunctionExport:
        "Every export of a module-level \"use server\" file is registered as a server function; '{{name}}' is not a function and will fail the server at boot. Move non-function exports to another module.",
      clientWrapper:
        "In a module-level \"use server\" file the client receives bare server references, so '{{name}}' never runs on the client and its behavior is silently lost. Wrap the imported server function in a shared module instead, or move the directive inside the wrapped function.",
    },
  },
  defaultOptions: [{ clientWrappers: [] }],
  create(context, [options]) {
    const { matchImport, handleImportDeclaration } = trackImports(WRAPPER_SOURCES);
    const matchesCustomWrapper = createNameMatcher(options.clientWrappers);
    let moduleLevel = false;

    const checkExportedValue = (node: T.Node, name: string) => {
      if (isDefinitelyNotFunction(node)) {
        context.report({ node, messageId: "nonFunctionExport", data: { name } });
      }
    };

    return {
      Program(node) {
        moduleLevel = programHasUseServerDirective(node);
      },
      ImportDeclaration: handleImportDeclaration,
      ExpressionStatement(node) {
        const { expression } = node;
        const isTemplate =
          expression.type === "TemplateLiteral" &&
          expression.expressions.length === 0 &&
          expression.quasis.length === 1 &&
          expression.quasis[0].value.cooked === "use server";
        const isString = expression.type === "Literal" && expression.value === "use server";
        if (!isTemplate && !isString) return;

        if (isTemplate) {
          context.report({ node, messageId: "templateDirective" });
          return;
        }

        // In a module-level directive file, or nested inside an extracted
        // server function, the whole scope already runs on the server —
        // stray inner directives are ignored by the transform and harmless.
        if (moduleLevel) return;
        const nearestFunction = findParent(node, isFunctionNode);
        if (
          nearestFunction &&
          isFunctionNode(nearestFunction) &&
          isInsideUseServerFunction(nearestFunction)
        ) {
          return;
        }

        const parent = node.parent;
        const enclosingFunction =
          parent?.type === "BlockStatement" && isFunctionNode(parent.parent) ? parent.parent : null;
        if (
          parent?.type !== "Program" &&
          (parent?.type !== "BlockStatement" || !enclosingFunction)
        ) {
          // A string statement in a plain block (if/for body, bare block):
          // blocks have no directive prologue.
          context.report({ node, messageId: "misplacedDirective" });
          return;
        }

        const body = parent.body;
        if (!getDirectivePrologue(body).includes(node)) {
          context.report({ node, messageId: "misplacedDirective" });
          return;
        }

        if (enclosingFunction && !isInsideUseServerFunction(enclosingFunction)) {
          const eligibility = getUseServerEligibility(enclosingFunction);
          if (eligibility !== "eligible") {
            context.report({
              node,
              messageId: "ineligiblePosition",
              data: { position: POSITION_LABELS[eligibility] },
            });
          }
        }
      },
      ExportNamedDeclaration(node) {
        if (!moduleLevel || !node.declaration) return;
        if (node.declaration.type === "VariableDeclaration") {
          for (const declarator of node.declaration.declarations) {
            if (declarator.init && declarator.id.type === "Identifier") {
              checkExportedValue(declarator.init, declarator.id.name);
            }
          }
        }
      },
      ExportDefaultDeclaration(node) {
        if (!moduleLevel) return;
        checkExportedValue(node.declaration, "default");
      },
      CallExpression(node) {
        if (!moduleLevel || node.callee.type !== "Identifier") return;
        // Only module-scope calls: wrapper calls inside functions are just
        // server-side code, which is the caller's business.
        if (findParent(node, isFunctionNode) != null) return;
        const name = node.callee.name;
        if (matchImport(CLIENT_WRAPPERS, name) || matchesCustomWrapper(name)) {
          context.report({ node, messageId: "clientWrapper", data: { name } });
        }
      },
    };
  },
});
