//! solid/no-proxy-apis
//!
//! Disallow APIs that use ES6 Proxies (for environments that don't support them).
//! This includes Solid Store, Proxy constructor, and certain JSX patterns.

use oxc_ast::ast::{
    Argument, CallExpression, Expression, ImportDeclaration, JSXAttributeItem,
    JSXElementName, JSXOpeningElement, NewExpression, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct NoProxyApis;

impl RuleMeta for NoProxyApis {
    const NAME: &'static str = "solid/no-proxy-apis";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoProxyApis {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoProxyApisVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoProxyApisVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> NoProxyApisVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn is_dom_element(name: &JSXElementName) -> bool {
        match name {
            JSXElementName::Identifier(ident) => {
                let name = ident.name.as_str();
                !name.is_empty() && name.chars().next().unwrap().is_lowercase()
            }
            JSXElementName::IdentifierReference(ident) => {
                let name = ident.name.as_str();
                !name.is_empty() && name.chars().next().unwrap().is_lowercase()
            }
            JSXElementName::NamespacedName(_) => true,
            JSXElementName::MemberExpression(_) => false,
            JSXElementName::ThisExpression(_) => false,
        }
    }

    fn check_import_declaration(&mut self, decl: &ImportDeclaration<'a>) {
        let source = decl.source.value.as_str();

        if source == "solid-js/store" {
            self.diagnostics.push(Diagnostic::warning(
                NoProxyApis::NAME,
                decl.span(),
                "Solid Store APIs use Proxies, which are incompatible with your target environment.",
            ));
        }
    }

    fn check_new_expression(&mut self, expr: &NewExpression<'a>) {
        if let Expression::Identifier(ident) = &expr.callee {
            if ident.name.as_str() == "Proxy" {
                self.diagnostics.push(Diagnostic::warning(
                    NoProxyApis::NAME,
                    expr.span(),
                    "Proxies are incompatible with your target environment.",
                ));
            }
        }
    }

    fn check_call_expression(&mut self, call: &CallExpression<'a>) {
        if let Expression::StaticMemberExpression(member) = &call.callee {
            if let Expression::Identifier(obj) = &member.object {
                if obj.name.as_str() == "Proxy" && member.property.name.as_str() == "revocable" {
                    self.diagnostics.push(Diagnostic::warning(
                        NoProxyApis::NAME,
                        call.span(),
                        "Proxies are incompatible with your target environment.",
                    ));
                }
            }
        }
    }

    fn is_merge_props_call(expr: &Expression<'_>) -> bool {
        match expr {
            Expression::CallExpression(call) => {
                if let Expression::Identifier(ident) = &call.callee {
                    return ident.name.as_str() == "mergeProps";
                }
                false
            }
            _ => false,
        }
    }

    fn check_jsx_opening_element(&mut self, node: &JSXOpeningElement<'a>) {
        if !Self::is_dom_element(&node.name) {
            return;
        }

        for attr in &node.attributes {
            if let JSXAttributeItem::SpreadAttribute(spread) = attr {
                match &spread.argument {
                    Expression::CallExpression(call) => {
                        if !Self::is_merge_props_call(&spread.argument) {
                            self.diagnostics.push(Diagnostic::warning(
                                NoProxyApis::NAME,
                                spread.span(),
                                "Using a function call in JSX spread makes Solid use Proxies.",
                            ));
                        } else {
                            for arg in &call.arguments {
                                if matches!(arg, Argument::CallExpression(_)) {
                                    self.diagnostics.push(Diagnostic::warning(
                                        NoProxyApis::NAME,
                                        arg.span(),
                                        "Using a function call in JSX spread makes Solid use Proxies.",
                                    ));
                                }
                                if matches!(
                                    arg,
                                    Argument::StaticMemberExpression(_)
                                        | Argument::ComputedMemberExpression(_)
                                        | Argument::PrivateFieldExpression(_)
                                ) {
                                    self.diagnostics.push(Diagnostic::warning(
                                        NoProxyApis::NAME,
                                        arg.span(),
                                        "Using a property access in JSX spread makes Solid use Proxies.",
                                    ));
                                }
                            }
                        }
                    }
                    Expression::StaticMemberExpression(_)
                    | Expression::ComputedMemberExpression(_)
                    | Expression::PrivateFieldExpression(_) => {
                        self.diagnostics.push(Diagnostic::warning(
                            NoProxyApis::NAME,
                            spread.span(),
                            "Using a property access in JSX spread makes Solid use Proxies.",
                        ));
                    }
                    _ => {}
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoProxyApisVisitor<'a, 'ctx> {
    fn visit_import_declaration(&mut self, decl: &ImportDeclaration<'a>) {
        self.check_import_declaration(decl);
        walk::walk_import_declaration(self, decl);
    }

    fn visit_new_expression(&mut self, expr: &NewExpression<'a>) {
        self.check_new_expression(expr);
        walk::walk_new_expression(self, expr);
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.check_call_expression(call);
        walk::walk_call_expression(self, call);
    }

    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement<'a>) {
        self.check_jsx_opening_element(&elem.opening_element);
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
        let rule = NoProxyApis::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoProxyApis::NAME, "solid/no-proxy-apis");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoProxyApis::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_solid_js_import_valid() {
        let diagnostics = check_code(r#"import { createSignal } from "solid-js";"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_simple_spread_valid() {
        let diagnostics = check_code(r#"const el = <div {...props} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_merge_props_with_objects_valid() {
        let diagnostics =
            check_code(r#"const el = <div {...mergeProps(defaults, props)} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_component_spread_valid() {
        let diagnostics = check_code(r#"const el = <MyComponent {...getProps()} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for component spread"
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_solid_js_store_import_invalid() {
        let diagnostics = check_code(r#"import { createStore } from "solid-js/store";"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for solid-js/store import"
        );
        assert!(diagnostics[0].message.contains("Solid Store"));
        assert!(diagnostics[0].message.contains("Proxies"));
    }

    #[test]
    fn test_new_proxy_invalid() {
        let diagnostics = check_code(r#"const p = new Proxy(target, handler);"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for new Proxy"
        );
        assert!(diagnostics[0].message.contains("Proxies"));
    }

    #[test]
    fn test_proxy_revocable_invalid() {
        let diagnostics = check_code(r#"const { proxy } = Proxy.revocable(target, handler);"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for Proxy.revocable"
        );
        assert!(diagnostics[0].message.contains("Proxies"));
    }

    #[test]
    fn test_spread_with_function_call_invalid() {
        let diagnostics = check_code(r#"const el = <div {...getProps()} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for spread with function call"
        );
        assert!(diagnostics[0].message.contains("function call"));
    }

    #[test]
    fn test_spread_with_member_expression_invalid() {
        let diagnostics = check_code(r#"const el = <div {...obj.props} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for spread with member expression"
        );
        assert!(diagnostics[0].message.contains("property access"));
    }

    #[test]
    fn test_merge_props_with_function_call_invalid() {
        let diagnostics =
            check_code(r#"const el = <div {...mergeProps(getDefaults(), props)} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for mergeProps with function call"
        );
    }

    #[test]
    fn test_merge_props_with_member_expression_invalid() {
        let diagnostics =
            check_code(r#"const el = <div {...mergeProps(obj.defaults, props)} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for mergeProps with member expression"
        );
    }

    #[test]
    fn test_spread_with_computed_member_invalid() {
        let diagnostics = check_code(r#"const el = <div {...obj[key]} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for spread with computed member"
        );
    }
}
