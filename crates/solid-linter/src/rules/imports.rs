//! solid/imports
//!
//! Enforce consistent imports from solid-js modules.
//! This rule detects imports from wrong sources and suggests the correct one.

use oxc_ast::ast::{ImportDeclaration, ImportDeclarationSpecifier, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const SOLID_JS_PRIMITIVES: &[&str] = &[
    "createSignal",
    "createEffect",
    "createMemo",
    "createResource",
    "onMount",
    "onCleanup",
    "onError",
    "untrack",
    "batch",
    "on",
    "createRoot",
    "getOwner",
    "runWithOwner",
    "mergeProps",
    "splitProps",
    "useTransition",
    "observable",
    "from",
    "mapArray",
    "indexArray",
    "createContext",
    "useContext",
    "children",
    "lazy",
    "createUniqueId",
    "createDeferred",
    "createRenderEffect",
    "createComputed",
    "createReaction",
    "createSelector",
    "DEV",
    "For",
    "Show",
    "Switch",
    "Match",
    "Index",
    "ErrorBoundary",
    "Suspense",
    "SuspenseList",
];

const SOLID_JS_WEB: &[&str] = &[
    "Portal",
    "render",
    "hydrate",
    "renderToString",
    "renderToStream",
    "isServer",
    "renderToStringAsync",
    "generateHydrationScript",
    "HydrationScript",
    "Dynamic",
];

const SOLID_JS_STORE: &[&str] = &[
    "createStore",
    "produce",
    "reconcile",
    "unwrap",
    "createMutable",
    "modifyMutable",
];

#[derive(Debug, Clone, Default)]
pub struct Imports;

impl RuleMeta for Imports {
    const NAME: &'static str = "solid/imports";
    const CATEGORY: RuleCategory = RuleCategory::BestPractices;
}

impl Imports {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = ImportsVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

fn get_correct_source(name: &str) -> Option<&'static str> {
    if SOLID_JS_PRIMITIVES.contains(&name) {
        Some("solid-js")
    } else if SOLID_JS_WEB.contains(&name) {
        Some("solid-js/web")
    } else if SOLID_JS_STORE.contains(&name) {
        Some("solid-js/store")
    } else {
        None
    }
}

fn is_solid_source(source: &str) -> bool {
    source == "solid-js"
        || source == "solid-js/web"
        || source == "solid-js/store"
        || source.starts_with("solid-js/")
}

struct ImportsVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> ImportsVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn check_import_declaration(&mut self, decl: &ImportDeclaration<'a>) {
        let source = decl.source.value.as_str();

        if !is_solid_source(source) {
            return;
        }

        if let Some(specifiers) = &decl.specifiers {
            for specifier in specifiers {
                if let ImportDeclarationSpecifier::ImportSpecifier(import_specifier) = specifier {
                    let imported_name = import_specifier.imported.name().as_str();

                    if let Some(correct_source) = get_correct_source(imported_name) {
                        if source != correct_source {
                            self.diagnostics.push(Diagnostic::warning(
                                Imports::NAME,
                                import_specifier.span(),
                                format!(
                                    "Prefer importing {} from \"{}\".",
                                    imported_name, correct_source
                                ),
                            ));
                        }
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for ImportsVisitor<'a, 'ctx> {
    fn visit_import_declaration(&mut self, decl: &ImportDeclaration<'a>) {
        self.check_import_declaration(decl);
        walk::walk_import_declaration(self, decl);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use oxc_allocator::Allocator;
    use oxc_parser::Parser;
    use oxc_span::SourceType;

    fn check_code(source: &str) -> Vec<Diagnostic> {
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = Imports::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(Imports::NAME, "solid/imports");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(Imports::CATEGORY, RuleCategory::BestPractices);
    }

    // ===== Valid cases =====

    #[test]
    fn test_correct_solid_js_import_valid() {
        let diagnostics = check_code(r#"import { createSignal } from "solid-js";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_correct_solid_js_web_import_valid() {
        let diagnostics = check_code(r#"import { render } from "solid-js/web";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_correct_solid_js_store_import_valid() {
        let diagnostics = check_code(r#"import { createStore } from "solid-js/store";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_multiple_correct_imports_valid() {
        let diagnostics =
            check_code(r#"import { createSignal, createEffect, createMemo } from "solid-js";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_non_solid_import_valid() {
        let diagnostics = check_code(r#"import { useState } from "react";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_unknown_solid_export_valid() {
        let diagnostics = check_code(r#"import { unknownExport } from "solid-js";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_render_from_solid_js_invalid() {
        let diagnostics = check_code(r#"import { render } from "solid-js";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for render from solid-js"
        );
        assert!(diagnostics[0].message.contains("solid-js/web"));
    }

    #[test]
    fn test_create_store_from_solid_js_invalid() {
        let diagnostics = check_code(r#"import { createStore } from "solid-js";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createStore from solid-js"
        );
        assert!(diagnostics[0].message.contains("solid-js/store"));
    }

    #[test]
    fn test_create_signal_from_solid_js_web_invalid() {
        let diagnostics = check_code(r#"import { createSignal } from "solid-js/web";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createSignal from solid-js/web"
        );
        assert!(diagnostics[0].message.contains("solid-js"));
    }

    #[test]
    fn test_portal_from_solid_js_invalid() {
        let diagnostics = check_code(r#"import { Portal } from "solid-js";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for Portal from solid-js"
        );
        assert!(diagnostics[0].message.contains("solid-js/web"));
    }

    #[test]
    fn test_mixed_correct_and_incorrect_imports_invalid() {
        let diagnostics =
            check_code(r#"import { createSignal, render } from "solid-js";"#);
        assert_eq!(
            diagnostics.len(),
            1,
            "Expected 1 diagnostic for render"
        );
        assert!(diagnostics[0].message.contains("render"));
        assert!(diagnostics[0].message.contains("solid-js/web"));
    }

    #[test]
    fn test_produce_from_solid_js_invalid() {
        let diagnostics = check_code(r#"import { produce } from "solid-js";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for produce from solid-js"
        );
        assert!(diagnostics[0].message.contains("solid-js/store"));
    }

    #[test]
    fn test_is_server_from_solid_js_invalid() {
        let diagnostics = check_code(r#"import { isServer } from "solid-js";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for isServer from solid-js"
        );
        assert!(diagnostics[0].message.contains("solid-js/web"));
    }
}
