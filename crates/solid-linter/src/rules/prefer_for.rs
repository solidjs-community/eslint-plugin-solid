//! solid/prefer-for
//!
//! Enforce using Solid's `<For />` component for mapping arrays to JSX.
//! Array#map causes DOM elements to be recreated on each render, while
//! `<For />` and `<Index />` provide optimized list rendering.

use oxc_ast::ast::{Argument, CallExpression, Expression, JSXElement, JSXFragment, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct PreferFor;

impl RuleMeta for PreferFor {
    const NAME: &'static str = "solid/prefer-for";
    const CATEGORY: RuleCategory = RuleCategory::BestPractices;
}

impl PreferFor {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = PreferForVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct PreferForVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    in_jsx_child: bool,
}

impl<'a, 'ctx> PreferForVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            in_jsx_child: false,
        }
    }

    fn is_map_call(expr: &CallExpression<'a>) -> bool {
        if let Some(member) = expr.callee.as_member_expression() {
            if let Some(name) = member.static_property_name() {
                return name == "map";
            }
        }
        false
    }

    fn get_callback_param_count(call: &CallExpression<'a>) -> Option<usize> {
        let first_arg = call.arguments.first()?;
        match first_arg {
            Argument::ArrowFunctionExpression(arrow) => Some(arrow.params.items.len()),
            Argument::FunctionExpression(func) => Some(func.params.items.len()),
            _ => None,
        }
    }

    fn callback_returns_jsx(call: &CallExpression<'a>) -> bool {
        let Some(first_arg) = call.arguments.first() else {
            return false;
        };

        match first_arg {
            Argument::ArrowFunctionExpression(arrow) => {
                if arrow.expression {
                    Self::is_jsx_expression(&arrow.body)
                } else {
                    Self::body_contains_jsx_return(&arrow.body)
                }
            }
            Argument::FunctionExpression(func) => {
                if let Some(body) = &func.body {
                    Self::body_contains_jsx_return(body)
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    fn is_jsx_expression(expr: &oxc_ast::ast::FunctionBody<'a>) -> bool {
        if expr.statements.len() == 1 {
            if let oxc_ast::ast::Statement::ExpressionStatement(stmt) = &expr.statements[0] {
                return matches!(
                    &stmt.expression,
                    Expression::JSXElement(_) | Expression::JSXFragment(_)
                );
            }
        }
        false
    }

    fn body_contains_jsx_return(body: &oxc_ast::ast::FunctionBody<'a>) -> bool {
        for stmt in &body.statements {
            if let oxc_ast::ast::Statement::ReturnStatement(ret) = stmt {
                if let Some(arg) = &ret.argument {
                    if matches!(arg, Expression::JSXElement(_) | Expression::JSXFragment(_)) {
                        return true;
                    }
                }
            }
        }
        false
    }

    fn check_call_expression(&mut self, call: &CallExpression<'a>) {
        if !self.in_jsx_child {
            return;
        }

        if !Self::is_map_call(call) {
            return;
        }

        if !Self::callback_returns_jsx(call) {
            return;
        }

        let param_count = Self::get_callback_param_count(call);

        let message = if param_count.map(|c| c >= 2).unwrap_or(false) {
            "Use Solid's `<For />` component or `<Index />` component for rendering lists. Array#map causes DOM elements to be recreated."
        } else {
            "Use Solid's `<For />` component for efficiently rendering lists. Array#map causes DOM elements to be recreated."
        };

        self.diagnostics
            .push(Diagnostic::warning(PreferFor::NAME, call.span(), message));
    }
}

impl<'a, 'ctx> Visit<'a> for PreferForVisitor<'a, 'ctx> {
    fn visit_jsx_element(&mut self, elem: &JSXElement<'a>) {
        let old_in_jsx_child = self.in_jsx_child;
        self.in_jsx_child = false;

        walk::walk_jsx_opening_element(self, &elem.opening_element);

        self.in_jsx_child = true;
        for child in &elem.children {
            walk::walk_jsx_child(self, child);
        }

        self.in_jsx_child = old_in_jsx_child;
    }

    fn visit_jsx_fragment(&mut self, fragment: &JSXFragment<'a>) {
        let old_in_jsx_child = self.in_jsx_child;
        self.in_jsx_child = true;

        for child in &fragment.children {
            walk::walk_jsx_child(self, child);
        }

        self.in_jsx_child = old_in_jsx_child;
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.check_call_expression(call);
        walk::walk_call_expression(self, call);
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
        let rule = PreferFor::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(PreferFor::NAME, "solid/prefer-for");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(PreferFor::CATEGORY, RuleCategory::BestPractices);
    }

    // ===== Valid cases =====

    #[test]
    fn test_for_component_valid() {
        let diagnostics = check_code(r#"const el = <For each={items}>{(item) => <li>{item}</li>}</For>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_index_component_valid() {
        let diagnostics =
            check_code(r#"const el = <Index each={items}>{(item, i) => <li>{item}</li>}</Index>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_map_outside_jsx_valid() {
        let diagnostics = check_code(r#"const mapped = items.map(item => <li>{item}</li>);"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_map_not_returning_jsx_valid() {
        let diagnostics = check_code(r#"const el = <div>{items.map(item => item.name)}</div>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_non_map_method_valid() {
        let diagnostics =
            check_code(r#"const el = <div>{items.filter(item => item.active)}</div>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_map_in_jsx_child_invalid() {
        let diagnostics = check_code(r#"const el = <ul>{items.map(item => <li>{item}</li>)}</ul>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for map in JSX child"
        );
        assert!(diagnostics[0].message.contains("<For />"));
    }

    #[test]
    fn test_map_with_index_param_invalid() {
        let diagnostics =
            check_code(r#"const el = <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for map with index"
        );
        assert!(diagnostics[0].message.contains("<Index />"));
    }

    #[test]
    fn test_map_in_fragment_invalid() {
        let diagnostics = check_code(r#"const el = <>{items.map(item => <span>{item}</span>)}</>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for map in fragment"
        );
    }

    #[test]
    fn test_map_with_function_expression_invalid() {
        let diagnostics = check_code(
            r#"const el = <ul>{items.map(function(item) { return <li>{item}</li>; })}</ul>;"#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for map with function expression"
        );
    }

    #[test]
    fn test_nested_map_invalid() {
        let diagnostics = check_code(
            r#"const el = <div>{outer.map(o => <ul>{o.inner.map(i => <li>{i}</li>)}</ul>)}</div>;"#,
        );
        assert!(
            diagnostics.len() >= 2,
            "Expected diagnostics for both nested maps"
        );
    }

    #[test]
    fn test_map_returning_jsx_fragment_invalid() {
        let diagnostics = check_code(r#"const el = <div>{items.map(item => <><span>{item}</span></>)}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for map returning fragment"
        );
    }
}
