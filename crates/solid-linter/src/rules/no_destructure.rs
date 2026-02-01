//! solid/no-destructure
//!
//! Disallow destructuring props. In Solid, props must be used with property accesses
//! (`props.foo`) to preserve reactivity. This rule only tracks destructuring in the
//! parameter list.

use oxc_ast::ast::{
    BindingPatternKind, Function, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

/// The no-destructure rule
#[derive(Debug, Clone, Default)]
pub struct NoDestructure;

impl RuleMeta for NoDestructure {
    const NAME: &'static str = "solid/no-destructure";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoDestructure {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoDestructureVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

/// Stack frame for tracking function state
#[derive(Debug, Clone)]
struct FunctionFrame {
    /// Whether this function contains JSX
    has_jsx: bool,
    /// Span of the destructured parameter (if any)
    destructured_param: Option<Span>,
    /// Whether this function is inside a JSXExpressionContainer (render prop)
    is_render_prop: bool,
}

impl FunctionFrame {
    fn new(is_render_prop: bool) -> Self {
        Self {
            has_jsx: false,
            destructured_param: None,
            is_render_prop,
        }
    }
}

/// Visitor for detecting destructured props
struct NoDestructureVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    /// Stack of function frames
    function_stack: Vec<FunctionFrame>,
    /// Whether we're currently inside a JSXExpressionContainer
    in_jsx_expression: bool,
}

impl<'a, 'ctx> NoDestructureVisitor<'a, 'ctx> {
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

    fn check_function_params(&mut self, func: &Function<'a>) {
        // Only check functions with exactly one parameter
        if func.params.items.len() != 1 {
            return;
        }

        let param = &func.params.items[0];

        // Check if the parameter is destructured (ObjectPattern)
        if let BindingPatternKind::ObjectPattern(pattern) = &param.pattern.kind {
            if let Some(frame) = self.current_frame_mut() {
                frame.destructured_param = Some(pattern.span());
            }
        }
    }

    fn on_function_exit(&mut self) {
        if let Some(frame) = self.function_stack.pop() {
            // Only report if:
            // 1. Function has JSX (so it's a component)
            // 2. Has destructured parameter
            // 3. Is not a render prop (inside JSXExpressionContainer)
            if frame.has_jsx && !frame.is_render_prop {
                if let Some(param_span) = frame.destructured_param {
                    self.diagnostics.push(
                        Diagnostic::warning(
                            NoDestructure::NAME,
                            param_span,
                            "Destructuring component props breaks Solid's reactivity; use property access instead.",
                        )
                        .with_help("Use `props.property` instead of destructuring to maintain reactivity."),
                    );
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoDestructureVisitor<'a, 'ctx> {
    fn visit_function(&mut self, func: &Function<'a>, flags: oxc_syntax::scope::ScopeFlags) {
        // Push a new frame
        self.function_stack.push(FunctionFrame::new(self.in_jsx_expression));

        // Check for destructured params
        self.check_function_params(func);

        // Walk the function body
        walk::walk_function(self, func, flags);

        // Pop and check on exit
        self.on_function_exit();
    }

    fn visit_arrow_function_expression(
        &mut self,
        arrow: &oxc_ast::ast::ArrowFunctionExpression<'a>,
    ) {
        // Push a new frame
        self.function_stack.push(FunctionFrame::new(self.in_jsx_expression));

        // Only check functions with exactly one parameter
        if arrow.params.items.len() == 1 {
            let param = &arrow.params.items[0];
            if let BindingPatternKind::ObjectPattern(pattern) = &param.pattern.kind {
                if let Some(frame) = self.current_frame_mut() {
                    frame.destructured_param = Some(pattern.span());
                }
            }
        }

        // Walk the arrow function body
        walk::walk_arrow_function_expression(self, arrow);

        // Pop and check on exit
        self.on_function_exit();
    }

    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement<'a>) {
        // Mark current function as having JSX
        if let Some(frame) = self.current_frame_mut() {
            frame.has_jsx = true;
        }
        walk::walk_jsx_element(self, elem);
    }

    fn visit_jsx_fragment(&mut self, frag: &oxc_ast::ast::JSXFragment<'a>) {
        // Mark current function as having JSX
        if let Some(frame) = self.current_frame_mut() {
            frame.has_jsx = true;
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
        let rule = NoDestructure::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoDestructure::NAME, "solid/no-destructure");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoDestructure::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_props_not_destructured_valid() {
        let diagnostics = check_code(r#"const Component = (props) => <div>{props.name}</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_no_params_valid() {
        let diagnostics = check_code(r#"const Component = () => <div>Hello</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_multiple_params_valid() {
        // Multiple params means it's probably not a component
        let diagnostics = check_code(r#"const fn = (a, b) => <div>{a}{b}</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_no_jsx_valid() {
        // Function with destructuring but no JSX - not a component
        let diagnostics = check_code(r#"const fn = ({ name }) => name;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_render_prop_valid() {
        // Render prop pattern - function inside JSXExpressionContainer
        let diagnostics = check_code(r#"
            const Parent = () => (
                <Child render={({ item }) => <div>{item}</div>} />
            );
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics for render prop but got: {:?}", diagnostics);
    }

    #[test]
    fn test_children_as_function_valid() {
        // Children as function pattern
        let diagnostics = check_code(r#"
            const Parent = () => (
                <Child>
                    {({ item }) => <div>{item}</div>}
                </Child>
            );
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics for children as function but got: {:?}", diagnostics);
    }

    // ===== Invalid cases =====

    #[test]
    fn test_destructured_props_invalid() {
        let diagnostics = check_code(r#"const Component = ({ name }) => <div>{name}</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for destructured props");
        assert!(diagnostics[0].message.contains("Destructuring"));
    }

    #[test]
    fn test_destructured_with_default_invalid() {
        let diagnostics = check_code(r#"const Component = ({ name = "default" }) => <div>{name}</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for destructured props with default");
    }

    #[test]
    fn test_destructured_with_rest_invalid() {
        let diagnostics = check_code(r#"const Component = ({ name, ...rest }) => <div>{name}</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for destructured props with rest");
    }

    #[test]
    fn test_function_declaration_invalid() {
        let diagnostics = check_code(r#"function Component({ name }) { return <div>{name}</div>; }"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for function declaration with destructured props");
    }

    #[test]
    fn test_jsx_fragment_invalid() {
        let diagnostics = check_code(r#"const Component = ({ name }) => <>{name}</>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for component with JSX fragment");
    }
}
