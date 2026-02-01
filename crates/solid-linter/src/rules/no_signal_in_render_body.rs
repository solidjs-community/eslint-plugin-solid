//! solid/no-signal-in-render-body
//!
//! Disallow creating signals in component render body (inside JSX expressions or after JSX).
//! Signals should be created at the top of the component before any JSX.

use oxc_ast::ast::{CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const SIGNAL_CREATORS: &[&str] = &[
    "createSignal",
    "createMemo",
    "createStore",
    "createMutable",
    "createResource",
    "createEffect",
    "createRenderEffect",
    "createComputed",
];

#[derive(Debug, Clone, Default)]
pub struct NoSignalInRenderBody;

impl RuleMeta for NoSignalInRenderBody {
    const NAME: &'static str = "solid/no-signal-in-render-body";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoSignalInRenderBody {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoSignalInRenderBodyVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoSignalInRenderBodyVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    jsx_expression_depth: usize,
    in_callback_inside_jsx: bool,
}

impl<'a, 'ctx> NoSignalInRenderBodyVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            jsx_expression_depth: 0,
            in_callback_inside_jsx: false,
        }
    }

    fn is_signal_creator(name: &str) -> bool {
        SIGNAL_CREATORS.contains(&name)
    }

    fn get_callee_name<'b>(call: &'b CallExpression<'_>) -> Option<&'b str> {
        match &call.callee {
            Expression::Identifier(ident) => Some(ident.name.as_str()),
            Expression::StaticMemberExpression(member) => Some(member.property.name.as_str()),
            _ => None,
        }
    }

    fn check_call_expression(&mut self, call: &CallExpression<'a>) {
        if self.jsx_expression_depth > 0 && !self.in_callback_inside_jsx {
            if let Some(name) = Self::get_callee_name(call) {
                if Self::is_signal_creator(name) {
                    self.diagnostics.push(Diagnostic::error(
                        NoSignalInRenderBody::NAME,
                        call.span(),
                        format!(
                            "`{}` should not be called inside JSX expressions. Move signal creation to the top of the component.",
                            name
                        ),
                    ));
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoSignalInRenderBodyVisitor<'a, 'ctx> {
    fn visit_jsx_expression_container(
        &mut self,
        container: &oxc_ast::ast::JSXExpressionContainer<'a>,
    ) {
        self.jsx_expression_depth += 1;
        walk::walk_jsx_expression_container(self, container);
        self.jsx_expression_depth -= 1;
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.check_call_expression(call);
        walk::walk_call_expression(self, call);
    }

    fn visit_arrow_function_expression(
        &mut self,
        func: &oxc_ast::ast::ArrowFunctionExpression<'a>,
    ) {
        let was_in_callback = self.in_callback_inside_jsx;
        if self.jsx_expression_depth > 0 {
            self.in_callback_inside_jsx = true;
        }
        walk::walk_arrow_function_expression(self, func);
        self.in_callback_inside_jsx = was_in_callback;
    }

    fn visit_function(&mut self, func: &oxc_ast::ast::Function<'a>, flags: oxc_syntax::scope::ScopeFlags) {
        let was_in_callback = self.in_callback_inside_jsx;
        if self.jsx_expression_depth > 0 {
            self.in_callback_inside_jsx = true;
        }
        walk::walk_function(self, func, flags);
        self.in_callback_inside_jsx = was_in_callback;
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
        let rule = NoSignalInRenderBody::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoSignalInRenderBody::NAME, "solid/no-signal-in-render-body");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoSignalInRenderBody::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_signal_at_top_valid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                const [count, setCount] = createSignal(0);
                return <div>{count()}</div>;
            }
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_memo_at_top_valid() {
        let diagnostics = check_code(
            r#"
            function Component(props) {
                const double = createMemo(() => props.value * 2);
                return <div>{double()}</div>;
            }
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_store_at_top_valid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                const [store, setStore] = createStore({ count: 0 });
                return <div>{store.count}</div>;
            }
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_signal_in_callback_valid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                return <button onClick={() => {
                    const [local] = createSignal(0);
                }}>Click</button>;
            }
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for signal in callback but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_signal_in_render_prop_valid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                return <Parent render={() => {
                    const [count] = createSignal(0);
                    return <div>{count()}</div>;
                }} />;
            }
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for render prop but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_signal_in_children_function_valid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                return <Parent>{() => {
                    const [count] = createSignal(0);
                    return <div>{count()}</div>;
                }}</Parent>;
            }
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for children function but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_effect_at_top_valid() {
        let diagnostics = check_code(
            r#"
            function Component() {
                const [count, setCount] = createSignal(0);
                createEffect(() => console.log(count()));
                return <div>{count()}</div>;
            }
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
    fn test_signal_in_jsx_expression_invalid() {
        let diagnostics = check_code(r#"const el = <div>{createSignal(0)}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createSignal in JSX"
        );
        assert!(diagnostics[0].message.contains("createSignal"));
        assert!(diagnostics[0].message.contains("JSX expressions"));
    }

    #[test]
    fn test_memo_in_jsx_attribute_invalid() {
        let diagnostics = check_code(r#"const el = <Comp value={createMemo(() => x)} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createMemo in JSX attribute"
        );
        assert!(diagnostics[0].message.contains("createMemo"));
    }

    #[test]
    fn test_store_in_jsx_expression_invalid() {
        let diagnostics = check_code(r#"const el = <div>{createStore({ x: 1 })}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createStore in JSX"
        );
        assert!(diagnostics[0].message.contains("createStore"));
    }

    #[test]
    fn test_effect_in_jsx_expression_invalid() {
        let diagnostics = check_code(r#"const el = <div>{createEffect(() => {})}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createEffect in JSX"
        );
        assert!(diagnostics[0].message.contains("createEffect"));
    }

    #[test]
    fn test_resource_in_jsx_expression_invalid() {
        let diagnostics = check_code(r#"const el = <div>{createResource(fetcher)}</div>;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createResource in JSX"
        );
        assert!(diagnostics[0].message.contains("createResource"));
    }

    #[test]
    fn test_signal_in_nested_jsx_invalid() {
        let diagnostics = check_code(
            r#"
            const el = (
                <div>
                    <span>{createSignal(0)}</span>
                </div>
            );
            "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createSignal in nested JSX"
        );
    }

    #[test]
    fn test_multiple_signals_in_jsx_invalid() {
        let diagnostics = check_code(
            r#"const el = <div>{createSignal(0)}{createMemo(() => 1)}</div>;"#,
        );
        assert_eq!(
            diagnostics.len(),
            2,
            "Expected 2 diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_signal_in_ternary_in_jsx_invalid() {
        let diagnostics = check_code(
            r#"const el = <div>{condition ? createSignal(0) : null}</div>;"#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createSignal in ternary inside JSX"
        );
    }
}
