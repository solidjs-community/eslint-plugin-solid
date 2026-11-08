import type { ASTUtils, ESLintUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import * as eslintUtils from "@eslint-community/eslint-utils";

// Typed via typescript-eslint (types only): its runtime package requires TypeScript <6.1.
export const getStaticValue = eslintUtils.getStaticValue as typeof ASTUtils.getStaticValue;
export const getPropertyName = eslintUtils.getPropertyName as typeof ASTUtils.getPropertyName;
export const getStringIfConstant =
  eslintUtils.getStringIfConstant as typeof ASTUtils.getStringIfConstant;
export const getFunctionHeadLocation =
  eslintUtils.getFunctionHeadLocation as unknown as typeof ASTUtils.getFunctionHeadLocation;
export const findVariableInScope = eslintUtils.findVariable as typeof ASTUtils.findVariable;

// Structural so the published types don't import `eslint`, an optional peer.
export type SolidRule = { meta: any; create(context: any): any };

const isObjectNotArray = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null && !Array.isArray(value);

function deepMerge(
  first: Record<string, unknown>,
  second: Record<string, unknown>
): Record<string, unknown> {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
  return Object.fromEntries(
    [...keys].map((key) => {
      const firstValue = first[key];
      const secondValue = second[key];
      if (key in first && key in second) {
        return [
          key,
          isObjectNotArray(firstValue) && isObjectNotArray(secondValue)
            ? deepMerge(firstValue, secondValue)
            : secondValue,
        ];
      }
      return [key, key in first ? firstValue : secondValue];
    })
  );
}

function applyDefault(defaultOptions: readonly unknown[], userOptions: readonly unknown[]) {
  const options = structuredClone(defaultOptions) as unknown[];
  options.forEach((option, i) => {
    const userOption = userOptions?.[i];
    if (userOption !== undefined) {
      options[i] =
        isObjectNotArray(userOption) && isObjectNotArray(option)
          ? deepMerge(option, userOption)
          : userOption;
    }
  });
  return options;
}

// Same behavior as typescript-eslint's `ESLintUtils.RuleCreator.withoutDocs`.
export function createRule<Options extends readonly unknown[], MessageIds extends string>({
  create,
  defaultOptions,
  meta,
}: Readonly<ESLintUtils.RuleWithMeta<Options, MessageIds>>): SolidRule {
  const resolvedDefaultOptions = meta.defaultOptions ?? defaultOptions ?? [];
  return {
    create(context: Readonly<TSESLint.RuleContext<MessageIds, Options>>) {
      return create(
        context,
        applyDefault(resolvedDefaultOptions, context.options) as unknown as Options
      );
    },
    defaultOptions,
    meta,
  } as unknown as SolidRule;
}

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
  return findVariableInScope(getScope(context, node), node);
}

export function markVariableAsUsed(
  context: CompatContext,
  name: string,
  node: TSESTree.Node
): void {
  if (typeof context.markVariableAsUsed === "function") {
    context.markVariableAsUsed(name);
  } else {
    getSourceCode(context).markVariableAsUsed(name, node);
  }
}
