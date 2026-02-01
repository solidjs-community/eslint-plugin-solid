//! solid/components-return-once
//!
//! Disallow early returns and conditional returns in Solid components.
//! In Solid, components run once, so conditional returns break reactivity.

use oxc_ast::ast::{
    ArrowFunctionExpression, Expression, Function, Program, ReturnStatement,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

/// The components-return-once rule
#[derive(Debug, Clone, Default)]
pub struct ComponentsReturnOnce;

impl RuleMeta for ComponentsReturnOnce {
    const NAME: &'static str = "solid/components-return-once";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl ComponentsReturnOnce {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = ComponentsReturnOnceVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

/// Stack frame for tracking function state
#[derive(Debug, Clone)]
struct FunctionFrame {
    /// Whether this function contains JSX (making it a component)
    is_component: bool,
    /// Span of the last return statement seen
    last_return: Option<Span>,
    /// Spans of early returns (returns before the last return)
    early_returns: Vec<Span>,
    /// Whether this function is a render prop (inside JSXExpressionContainer)
    is_render_prop: bool,
    /// Returns with conditional expressions (ternary or logical)
    conditional_returns: Vec<Span>,
}

impl FunctionFrame {
    fn new(is_render_prop: bool) -> Self {
        Self {
            is_component: false,
            last_return: None,
            early_returns: Vec::new(),
            is_render_prop,
            conditional_returns: Vec::new(),
        }
    }
}

/// Visitor for detecting early/conditional returns in components
struct ComponentsReturnOnceVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    /// Stack of function frames
    function_stack: Vec<FunctionFrame>,
    /// Whether we're currently inside a JSXExpressionContainer
    in_jsx_expression: bool,
}

impl<'a, 'ctx> ComponentsReturnOnceVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            function_stack: Vec::new(),
            in_jsx_expression: false,
        }
    }

    fn current_frame_mut(&mut self) -> Option<&mut FunctionFrame> {
        self.function_stack.last_mut()
    }

    fn on_function_exit(&mut self) {
        if let Some(frame) = self.function_stack.pop() {
            // Only report if this is a component and not a render prop
            if frame.is_component && !frame.is_render_prop {
                // Report early returns
                for span in frame.early_returns {
                    self.diagnostics.push(Diagnostic::warning(
                        ComponentsReturnOnce::NAME,
                        span,
                        "Solid components run once, so an early return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
                    ));
                }

                // Report conditional returns
                for span in frame.conditional_returns {
                    self.diagnostics.push(Diagnostic::warning(
                        ComponentsReturnOnce::NAME,
                        span,
                        "Solid components run once, so a conditional return breaks reactivity. Move the condition inside a JSX element, such as a fragment or <Show />.",
                    ));
                }
            }
        }
    }

    /// Check if a return statement contains a conditional expression (ternary or logical)
    fn has_conditional_expression(expr: &Expression<'_>) -> bool {
        match expr {
            Expression::ConditionalExpression(_) => true,
            Expression::LogicalExpression(_) => true,
            Expression::ParenthesizedExpression(paren) => {
                Self::has_conditional_expression(&paren.expression)
            }
            _ => false,
        }
    }
}

impl<'a, 'ctx> Visit<'a> for ComponentsReturnOnceVisitor<'a, 'ctx> {
    fn visit_function(&mut self, func: &Function<'a>, flags: oxc_syntax::scope::ScopeFlags) {
        // Push a new frame
        self.function_stack
            .push(FunctionFrame::new(self.in_jsx_expression));

        // Walk the function body
        walk::walk_function(self, func, flags);

        // Pop and check on exit
        self.on_function_exit();
    }

    fn visit_arrow_function_expression(&mut self, arrow: &ArrowFunctionExpression<'a>) {
        // Push a new frame
        self.function_stack
            .push(FunctionFrame::new(self.in_jsx_expression));

        // Walk the arrow function body
        walk::walk_arrow_function_expression(self, arrow);

        // Pop and check on exit
        self.on_function_exit();
    }

    fn visit_return_statement(&mut self, stmt: &ReturnStatement<'a>) {
        if let Some(frame) = self.current_frame_mut() {
            // If we already have a last_return, the previous one is now an early return
            if let Some(prev_return) = frame.last_return.take() {
                frame.early_returns.push(prev_return);
            }

            // This is now the last return (tentatively)
            frame.last_return = Some(stmt.span());

            // Check for conditional expression in return
            if let Some(arg) = &stmt.argument {
                if Self::has_conditional_expression(arg) {
                    frame.conditional_returns.push(stmt.span());
                }
            }
        }

        walk::walk_return_statement(self, stmt);
    }

    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement<'a>) {
        // Mark current function as having JSX
        if let Some(frame) = self.current_frame_mut() {
            frame.is_component = true;
        }
        walk::walk_jsx_element(self, elem);
    }

    fn visit_jsx_fragment(&mut self, frag: &oxc_ast::ast::JSXFragment<'a>) {
        // Mark current function as having JSX
        if let Some(frame) = self.current_frame_mut() {
            frame.is_component = true;
        }
        walk::walk_jsx_fragment(self, frag);
    }

    fn visit_jsx_expression_container(
        &mut self,
        container: &oxc_ast::ast::JSXExpressionContainer<'a>,
    ) {
        let was_in_jsx_expression = self.in_jsx_expression;
        self.in_jsx_expression = true;
        walk::walk_jsx_expression_container(self, container);
        self.in_jsx_expression = was_in_jsx_expression;
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
        let rule = ComponentsReturnOnce::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(ComponentsReturnOnce::NAME, "solid/components-return-once");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(ComponentsReturnOnce::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_single_return_valid() {
        let diagnostics = check_code(r#"const Component = () => <div>Hello</div>;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_single_return_with_show_valid() {
        let diagnostics = check_code(
            r#"
            const Component = () => (
                <Show when={condition}>
                    <div>Hello</div>
                </Show>
            );
        "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_no_jsx_valid() {
        // Function with early return but no JSX - not a component
        let diagnostics = check_code(
            r#"
            const fn = (x) => {
                if (x) return 1;
                return 2;
            };
        "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_render_prop_valid() {
        // Render prop pattern - function inside JSXExpressionContainer can have early returns
        let diagnostics = check_code(
            r#"
            const Parent = () => (
                <For each={items}>
                    {(item) => {
                        if (!item.visible) return null;
                        return <div>{item.name}</div>;
                    }}
                </For>
            );
        "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for render prop but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_conditional_in_jsx_valid() {
        // Ternary inside JSX expression is fine
        let diagnostics = check_code(
            r#"
            const Component = () => (
                <div>{condition ? <span>Yes</span> : <span>No</span>}</div>
            );
        "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_early_return_invalid() {
        let diagnostics = check_code(
            r#"
            const Component = () => {
                if (condition) return <div>Early</div>;
                return <div>Normal</div>;
            };
        "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for early return"
        );
        assert!(diagnostics[0].message.contains("early return"));
    }

    #[test]
    fn test_multiple_early_returns_invalid() {
        let diagnostics = check_code(
            r#"
            const Component = () => {
                if (a) return <div>A</div>;
                if (b) return <div>B</div>;
                return <div>C</div>;
            };
        "#,
        );
        assert_eq!(
            diagnostics.len(),
            2,
            "Expected 2 diagnostics for 2 early returns"
        );
    }

    #[test]
    fn test_conditional_return_ternary_invalid() {
        let diagnostics = check_code(
            r#"
            const Component = () => {
                return condition ? <div>Yes</div> : <div>No</div>;
            };
        "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for conditional return"
        );
        assert!(diagnostics[0].message.contains("conditional return"));
    }

    #[test]
    fn test_conditional_return_logical_and_invalid() {
        let diagnostics = check_code(
            r#"
            const Component = () => {
                return condition && <div>Yes</div>;
            };
        "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for conditional return"
        );
        assert!(diagnostics[0].message.contains("conditional return"));
    }

    #[test]
    fn test_conditional_return_logical_or_invalid() {
        let diagnostics = check_code(
            r#"
            const Component = () => {
                return condition || <div>Fallback</div>;
            };
        "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for conditional return"
        );
    }

    #[test]
    fn test_function_declaration_early_return_invalid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                if (loading) return <div>Loading...</div>;
                return <div>Content</div>;
            }
        "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for early return in function declaration"
        );
    }
}
