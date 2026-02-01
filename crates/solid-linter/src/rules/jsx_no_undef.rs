//! solid/jsx-no-undef
//!
//! Disallow references to undefined variables in JSX.
//! This is a simplified version since full scope analysis requires semantic info.

use std::collections::HashSet;

use oxc_ast::ast::{
    ImportDeclaration, ImportDeclarationSpecifier, JSXAttributeName, JSXElement,
    JSXElementName, JSXMemberExpressionObject, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const AUTO_COMPONENTS: &[&str] = &["Show", "For", "Index", "Switch", "Match"];

#[derive(Debug, Clone)]
pub struct JsxNoUndef {
    pub allow_globals: bool,
    pub auto_import: bool,
}

impl Default for JsxNoUndef {
    fn default() -> Self {
        Self {
            allow_globals: false,
            auto_import: true,
        }
    }
}

impl RuleMeta for JsxNoUndef {
    const NAME: &'static str = "solid/jsx-no-undef";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl JsxNoUndef {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = JsxNoUndefVisitor::new(ctx, self);
        visitor.visit_program(program);
        visitor.finalize()
    }
}

struct JsxNoUndefVisitor<'a, 'ctx, 'rule> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    rule: &'rule JsxNoUndef,
    diagnostics: Vec<Diagnostic>,
    imported_identifiers: HashSet<String>,
    jsx_components_used: Vec<(String, oxc_span::Span)>,
    custom_directives_used: Vec<(String, oxc_span::Span)>,
}

impl<'a, 'ctx, 'rule> JsxNoUndefVisitor<'a, 'ctx, 'rule> {
    fn new(ctx: &'ctx LintContext<'a>, rule: &'rule JsxNoUndef) -> Self {
        Self {
            ctx,
            rule,
            diagnostics: Vec::new(),
            imported_identifiers: HashSet::new(),
            jsx_components_used: Vec::new(),
            custom_directives_used: Vec::new(),
        }
    }

    fn is_dom_element(name: &str) -> bool {
        !name.is_empty() && name.chars().next().unwrap().is_lowercase()
    }

    fn finalize(mut self) -> Vec<Diagnostic> {
        let mut missing_auto_imports: Vec<&str> = Vec::new();

        for (component, span) in &self.jsx_components_used {
            if self.imported_identifiers.contains(component) {
                continue;
            }

            if AUTO_COMPONENTS.contains(&component.as_str()) {
                if self.rule.auto_import {
                    missing_auto_imports.push(component);
                }
            } else {
                self.diagnostics.push(Diagnostic::error(
                    JsxNoUndef::NAME,
                    *span,
                    format!("'{}' is not defined.", component),
                ));
            }
        }

        for (directive, span) in &self.custom_directives_used {
            if !self.imported_identifiers.contains(directive) {
                self.diagnostics.push(Diagnostic::error(
                    JsxNoUndef::NAME,
                    *span,
                    format!("Custom directive '{}' is not defined.", directive),
                ));
            }
        }

        if !missing_auto_imports.is_empty() {
            missing_auto_imports.sort();
            missing_auto_imports.dedup();

            let imports = if missing_auto_imports.len() == 1 {
                missing_auto_imports[0].to_string()
            } else {
                missing_auto_imports.join(", ")
            };

            if let Some((_, span)) = self.jsx_components_used.iter().find(|(c, _)| {
                AUTO_COMPONENTS.contains(&c.as_str())
                    && !self.imported_identifiers.contains(c)
            }) {
                self.diagnostics.push(Diagnostic::warning(
                    JsxNoUndef::NAME,
                    *span,
                    format!("{} should be imported from 'solid-js'.", imports),
                ));
            }
        }

        self.diagnostics
    }

    fn check_jsx_element(&mut self, elem: &JSXElement<'a>) {
        match &elem.opening_element.name {
            JSXElementName::Identifier(ident) => {
                let name = ident.name.as_str();
                if !Self::is_dom_element(name) {
                    self.jsx_components_used
                        .push((name.to_string(), ident.span()));
                }
            }
            JSXElementName::IdentifierReference(ident) => {
                let name = ident.name.as_str();
                if !Self::is_dom_element(name) {
                    self.jsx_components_used
                        .push((name.to_string(), ident.span()));
                }
            }
            JSXElementName::MemberExpression(member) => {
                let mut current = &member.object;
                loop {
                    match current {
                        JSXMemberExpressionObject::IdentifierReference(ident) => {
                            self.jsx_components_used
                                .push((ident.name.to_string(), ident.span()));
                            break;
                        }
                        JSXMemberExpressionObject::MemberExpression(inner) => {
                            current = &inner.object;
                        }
                        JSXMemberExpressionObject::ThisExpression(_) => break,
                    }
                }
            }
            _ => {}
        }

        for attr in &elem.opening_element.attributes {
            if let oxc_ast::ast::JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::NamespacedName(ns) = &jsx_attr.name {
                    if ns.namespace.name.as_str() == "use" {
                        let directive_name = ns.name.name.as_str();
                        self.custom_directives_used
                            .push((directive_name.to_string(), ns.span()));
                    }
                }
            }
        }
    }

    fn collect_imports(&mut self, decl: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &decl.specifiers {
            for specifier in specifiers {
                match specifier {
                    ImportDeclarationSpecifier::ImportSpecifier(s) => {
                        self.imported_identifiers
                            .insert(s.local.name.to_string());
                    }
                    ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                        self.imported_identifiers
                            .insert(s.local.name.to_string());
                    }
                    ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                        self.imported_identifiers
                            .insert(s.local.name.to_string());
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx, 'rule> Visit<'a> for JsxNoUndefVisitor<'a, 'ctx, 'rule> {
    fn visit_import_declaration(&mut self, decl: &ImportDeclaration<'a>) {
        self.collect_imports(decl);
        walk::walk_import_declaration(self, decl);
    }

    fn visit_jsx_element(&mut self, elem: &JSXElement<'a>) {
        self.check_jsx_element(elem);
        walk::walk_jsx_element(self, elem);
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
        let rule = JsxNoUndef::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(JsxNoUndef::NAME, "solid/jsx-no-undef");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(JsxNoUndef::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_dom_element_valid() {
        let diagnostics = check_code(r#"const el = <div>Hello</div>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_imported_component_valid() {
        let diagnostics = check_code(
            r#"import MyComponent from "./MyComponent";
const el = <MyComponent />;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_imported_show_valid() {
        let diagnostics = check_code(
            r#"import { Show } from "solid-js";
const el = <Show when={true}>Content</Show>;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_imported_for_valid() {
        let diagnostics = check_code(
            r#"import { For } from "solid-js";
const el = <For each={items}>{(item) => <div>{item}</div>}</For>;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_member_expression_imported_valid() {
        let diagnostics = check_code(
            r#"import * as UI from "./ui";
const el = <UI.Button>Click</UI.Button>;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_custom_directive_imported_valid() {
        let diagnostics = check_code(
            r#"import { tooltip } from "./directives";
const el = <div use:tooltip>Hover me</div>;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_undefined_component_invalid() {
        let diagnostics = check_code(r#"const el = <UndefinedComponent />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for undefined component"
        );
        assert!(diagnostics[0].message.contains("'UndefinedComponent' is not defined"));
    }

    #[test]
    fn test_show_not_imported_invalid() {
        let diagnostics = check_code(r#"const el = <Show when={true}>Content</Show>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for Show not imported"
        );
        assert!(diagnostics[0].message.contains("Show"));
        assert!(diagnostics[0].message.contains("solid-js"));
    }

    #[test]
    fn test_for_not_imported_invalid() {
        let diagnostics =
            check_code(r#"const el = <For each={items}>{(item) => <div>{item}</div>}</For>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for For not imported"
        );
        assert!(diagnostics[0].message.contains("For"));
    }

    #[test]
    fn test_member_expression_undefined_invalid() {
        let diagnostics = check_code(r#"const el = <UI.Button>Click</UI.Button>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for undefined UI namespace"
        );
        assert!(diagnostics[0].message.contains("'UI' is not defined"));
    }

    #[test]
    fn test_custom_directive_undefined_invalid() {
        let diagnostics = check_code(r#"const el = <div use:tooltip>Hover me</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for undefined custom directive"
        );
        assert!(diagnostics[0].message.contains("Custom directive 'tooltip' is not defined"));
    }

    #[test]
    fn test_multiple_undefined_components_invalid() {
        let diagnostics = check_code(
            r#"const el = <div><UndefinedA /><UndefinedB /></div>;"#,
        );
        assert!(
            diagnostics.len() >= 2,
            "Expected diagnostics for both undefined components"
        );
    }
}
