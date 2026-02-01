//! solid/no-signal-boolean-coercion
//!
//! Disallow implicit boolean coercion of signals in JSX.
//! `{count() && <X/>}` renders "0" when count is 0. Use `<Show>` or explicit `!!`.

use oxc_ast::ast::{Expression, JSXExpressionContainer, LogicalExpression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct NoSignalBooleanCoercion;

impl RuleMeta for NoSignalBooleanCoercion {
    const NAME: &'static str = "solid/no-signal-boolean-coercion";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoSignalBooleanCoercion {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(&self, program: &Program<'a>, ctx: &LintContext<'a>) -> Vec<Diagnostic> {
        let mut visitor = Visitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct Visitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    in_jsx_expression: bool,
}

impl<'a, 'ctx> Visitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            in_jsx_expression: false,
        }
    }

    fn is_already_boolean_coerced(&self, expr: &Expression<'a>) -> bool {
        match expr {
            // !!expr
            Expression::UnaryExpression(unary) => {
                if unary.operator == oxc_ast::ast::UnaryOperator::LogicalNot {
                    if let Expression::UnaryExpression(inner) = &unary.argument {
                        return inner.operator == oxc_ast::ast::UnaryOperator::LogicalNot;
                    }
                }
                false
            }
            // Boolean(expr)
            Expression::CallExpression(call) => {
                if let Expression::Identifier(ident) = &call.callee {
                    ident.name.as_str() == "Boolean"
                } else {
                    false
                }
            }
            // Comparison operators (===, !==, >, <, etc.) always return boolean
            Expression::BinaryExpression(bin) => {
                use oxc_ast::ast::BinaryOperator::*;
                matches!(
                    bin.operator,
                    Equality | Inequality | StrictEquality | StrictInequality | LessThan | LessEqualThan | GreaterThan | GreaterEqualThan
                )
            }
            _ => false,
        }
    }

    fn is_signal_call(&self, expr: &Expression<'a>) -> bool {
        matches!(expr, Expression::CallExpression(_))
    }

    fn check_logical_and(&mut self, logical: &LogicalExpression<'a>) {
        use oxc_ast::ast::LogicalOperator;
        
        if logical.operator != LogicalOperator::And {
            return;
        }

        // Check if right side contains JSX
        let right_has_jsx = self.expression_contains_jsx(&logical.right);
        if !right_has_jsx {
            return;
        }

        // Check if left side is a call expression (potential signal) and not already coerced
        if self.is_signal_call(&logical.left) && !self.is_already_boolean_coerced(&logical.left) {
            self.diagnostics.push(
                Diagnostic::warning(
                    NoSignalBooleanCoercion::NAME,
                    logical.left.span(),
                    "Signal value may render '0' or '' instead of nothing when falsy.",
                )
                .with_help("Use `<Show when={...}>` or wrap with `!!` or `Boolean()`."),
            );
        }

        // Also check member expressions like items().length
        if let Some(member) = logical.left.as_member_expression() {
            if matches!(member.object(), Expression::CallExpression(_)) {
                if !self.is_already_boolean_coerced(&logical.left) {
                    self.diagnostics.push(
                        Diagnostic::warning(
                            NoSignalBooleanCoercion::NAME,
                            logical.left.span(),
                            "Expression may render '0' or '' instead of nothing when falsy.",
                        )
                        .with_help("Use `<Show when={...}>` or wrap with `!!` or `Boolean()`."),
                    );
                }
            }
        }
    }

    fn expression_contains_jsx(&self, expr: &Expression<'a>) -> bool {
        match expr {
            Expression::JSXElement(_) | Expression::JSXFragment(_) => true,
            Expression::ParenthesizedExpression(paren) => {
                self.expression_contains_jsx(&paren.expression)
            }
            Expression::ConditionalExpression(cond) => {
                self.expression_contains_jsx(&cond.consequent)
                    || self.expression_contains_jsx(&cond.alternate)
            }
            _ => false,
        }
    }
}

impl<'a, 'ctx> Visit<'a> for Visitor<'a, 'ctx> {
    fn visit_jsx_expression_container(&mut self, container: &JSXExpressionContainer<'a>) {
        let was = self.in_jsx_expression;
        self.in_jsx_expression = true;
        walk::walk_jsx_expression_container(self, container);
        self.in_jsx_expression = was;
    }

    fn visit_logical_expression(&mut self, expr: &LogicalExpression<'a>) {
        if self.in_jsx_expression {
            self.check_logical_and(expr);
        }
        walk::walk_logical_expression(self, expr);
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
        NoSignalBooleanCoercion::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_show() {
        let diags = check_code(r#"<Show when={count()}><div /></Show>"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_double_bang() {
        let diags = check_code(r#"const x = () => <div>{!!count() && <span />}</div>;"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_boolean_call() {
        let diags = check_code(r#"const x = () => <div>{Boolean(count()) && <span />}</div>;"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_comparison() {
        let diags = check_code(r#"const x = () => <div>{count() > 0 && <span />}</div>;"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_strict_equality() {
        let diags = check_code(r#"const x = () => <div>{count() !== 0 && <span />}</div>;"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_signal_and() {
        let diags = check_code(r#"const x = () => <div>{count() && <span />}</div>;"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("0"));
    }

    #[test]
    fn test_invalid_length() {
        let diags = check_code(r#"const x = () => <div>{items().length && <List />}</div>;"#);
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn test_valid_or_operator() {
        // || doesn't have the same issue
        let diags = check_code(r#"const x = () => <div>{count() || <Fallback />}</div>;"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_outside_jsx() {
        // Outside JSX is fine
        let diags = check_code(r#"const result = count() && something();"#);
        assert!(diags.is_empty());
    }
}
