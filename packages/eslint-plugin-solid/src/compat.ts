import { Rule } from "eslint";
import { type TSESLint, type TSESTree, ASTUtils } from "@typescript-eslint/utils";

export type CompatContext =
  | {
      sourceCode: Readonly<TSESLint.SourceCode>;
      getSourceCode: undefined;
      getScope: undefined;
      markVariableAsUsed: undefined;
    }
  | {
      sourceCode?: Readonly<TSESLint.SourceCode>;
      getSourceCode: () => Readonly<TSESLint.SourceCode>;
      getScope: () => TSESLint.Scope.Scope;
      markVariableAsUsed: (name: string) => void;
    };

export function getSourceCode(context: CompatContext) {
  if (typeof context.getSourceCode === "function") {
    return context.getSourceCode();
  }
  return context.sourceCode;
}

export function getScope(context: CompatContext, node: TSESTree.Node): TSESLint.Scope.Scope {
  const sourceCode = getSourceCode(context);

  if (typeof sourceCode.getScope === "function") {
    return sourceCode.getScope(node); // >= v8, I think
  }
  if (typeof context.getScope === "function") {
    return context.getScope();
  }
  return context.sourceCode.getScope(node);
}

export function findVariable(
  context: CompatContext,
  node: TSESTree.Identifier
): TSESLint.Scope.Variable | null {
  return ASTUtils.findVariable(getScope(context, node), node);
}

export function markVariableAsUsed(context: Rule.RuleContext, name: string, node: any): boolean {
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  const scope = sourceCode.getScope(node);

  let current: any = scope;

  while (current) {
    const variable = current.set?.get(name);
    if (variable) {
      // mark as used by adding a fake reference
      variable.eslintUsed = true;
      return true;
    }
    current = current.upper;
  }

  return false;
}
