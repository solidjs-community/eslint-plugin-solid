import type { ESLint, Linter } from "eslint";
import type { Configs, AllRules } from "eslint-plugin-solid";
export type { ESLint, Linter, Configs, AllRules };

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
