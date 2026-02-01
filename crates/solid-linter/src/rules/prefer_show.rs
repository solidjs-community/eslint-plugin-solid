//! solid/prefer-show
//!
//! Enforce using Solid's `<Show />` component for conditional rendering.
//! Using `&&` or ternary operators with JSX in Solid can cause unnecessary
//! DOM recreation. The `<Show />` component provides optimized conditional rendering.

use oxc_ast::ast::{Expression, JSXElement, JSXFragment, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct PreferShow;

impl RuleMeta for PreferShow {
    const NAME: &'static str = "solid/prefer-show";
    const CATEGORY: RuleCategory = RuleCategory::BestPractices;
}

impl PreferShow {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = PreferShowVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct PreferShowVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    in_jsx_child: bool,
}

impl<'a, 'ctx> PreferShowVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            in_jsx_child: false,
        }
    }

    fn is_expensive_type(expr: &Expression<'a>) -> bool {
        matches!(
            expr,
            Expression::JSXElement(_) | Expression::JSXFragment(_) | Expression::Identifier(_)
        )
    }

    fn check_logical_expression(&mut self, logical: &oxc_ast::ast::LogicalExpression<'a>) {
        if !self.in_jsx_child {
            return;
        }

        if logical.operator != oxc_ast::ast::LogicalOperator::And {
            return;
        }

        if Self::is_expensive_type(&logical.right) {
            self.diagnostics.push(
                Diagnostic::warning(
                    PreferShow::NAME,
                    logical.span(),
                    "Use Solid's `<Show />` component for conditionally showing content.",
                )
                .with_help("Replace `{condition && <Element />}` with `<Show when={condition}><Element /></Show>`"),
            );
        }
    }

    fn check_conditional_expression(&mut self, cond: &oxc_ast::ast::ConditionalExpression<'a>) {
        if !self.in_jsx_child {
            return;
        }

        let consequent_expensive = Self::is_expensive_type(&cond.consequent);
        let alternate_expensive = Self::is_expensive_type(&cond.alternate);

        if consequent_expensive || alternate_expensive {
            self.diagnostics.push(
                Diagnostic::warning(
                    PreferShow::NAME,
                    cond.span(),
                    "Use Solid's `<Show />` component for conditionally showing content with a fallback.",
                )
                .with_help("Replace `{condition ? <Element /> : <Other />}` with `<Show when={condition} fallback={<Other />}><Element /></Show>`"),
            );
        }
    }
}

impl<'a, 'ctx> Visit<'a> for PreferShowVisitor<'a, 'ctx> {
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

    fn visit_logical_expression(&mut self, expr: &oxc_ast::ast::LogicalExpression<'a>) {
        self.check_logical_expression(expr);
        walk::walk_logical_expression(self, expr);
    }

    fn visit_conditional_expression(&mut self, expr: &oxc_ast::ast::ConditionalExpression<'a>) {
        self.check_conditional_expression(expr);
        walk::walk_conditional_expression(self, expr);
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
        let rule = PreferShow::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(PreferShow::NAME, "solid/prefer-show");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(PreferShow::CATEGORY, RuleCategory::BestPractices);
    }

    // ===== Valid cases =====

    #[test]
    fn test_show_component_valid() {
        let diagnostics = check_code(r#"const el = <Show when={condition}><Element /></Show>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_show_with_fallback_valid() {
        let diagnostics = check_code(
            r#"const el = <Show when={condition} fallback={<Other />}><Element /></Show>;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_logical_and_with_primitive_valid() {
        let diagnostics = check_code(r#"const el = <div>{condition && "text"}</div>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_ternary_with_primitives_valid() {
        let diagnostics = check_code(r#"const el = <div>{condition ? "yes" : "no"}</div>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_logical_and_outside_jsx_valid() {
        let diagnostics = check_code(r#"const result = condition && <Element />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_ternary_outside_jsx_valid() {
        let diagnostics = check_code(r#"const result = condition ? <Element /> : <Other />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_logical_and_with_jsx_element_invalid() {
        let diagnostics = check_code(r#"const el = <div>{condition && <Element />}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for && with JSX element"
        );
        assert!(diagnostics[0].message.contains("<Show />"));
    }

    #[test]
    fn test_logical_and_with_jsx_fragment_invalid() {
        let diagnostics = check_code(r#"const el = <div>{condition && <><span /></>}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for && with JSX fragment"
        );
    }

    #[test]
    fn test_logical_and_with_identifier_invalid() {
        let diagnostics = check_code(r#"const el = <div>{condition && element}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for && with identifier"
        );
    }

    #[test]
    fn test_ternary_with_jsx_elements_invalid() {
        let diagnostics =
            check_code(r#"const el = <div>{condition ? <Element /> : <Other />}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for ternary with JSX"
        );
        assert!(diagnostics[0].message.contains("fallback"));
    }

    #[test]
    fn test_ternary_with_jsx_and_null_invalid() {
        let diagnostics = check_code(r#"const el = <div>{condition ? <Element /> : null}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for ternary with JSX consequent"
        );
    }

    #[test]
    fn test_nested_conditional_invalid() {
        let diagnostics = check_code(
            r#"const el = <div>{outer && <span>{inner && <em>text</em>}</span>}</div>;"#,
        );
        assert!(
            diagnostics.len() >= 2,
            "Expected diagnostics for both nested conditionals"
        );
    }

    #[test]
    fn test_logical_and_in_fragment_invalid() {
        let diagnostics = check_code(r#"const el = <>{condition && <Element />}</>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for && in fragment"
        );
    }

    #[test]
    fn test_ternary_with_identifier_invalid() {
        let diagnostics =
            check_code(r#"const el = <div>{condition ? element : other}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for ternary with identifiers"
        );
    }
}
