import type { ESLint, Linter } from "eslint";
export type { ESLint, Linter };

export declare const plugin: ESLint.Plugin;
export declare const pluginVersion: string;
export declare const eslintVersion: string;

export declare function verify(
  code: string,
  ruleSeverityOverrides?: Record<string, Linter.Severity>
): ReturnType<Linter["verify"]>;
export declare function verifyAndFix(
  code: string,
  ruleSeverityOverrides?: Record<string, Linter.Severity>
): ReturnType<Linter["verifyAndFix"]>;
