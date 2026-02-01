//! solid/no-react-deps
//!
//! Disallow dependency arrays in createEffect/createMemo (React pattern).
//! In Solid, these functions automatically track their dependencies.

use oxc_ast::ast::{Argument, CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const REACTIVE_FUNCTIONS: &[&str] = &["createEffect", "createMemo"];

#[derive(Debug, Clone, Default)]
pub struct NoReactDeps;

impl RuleMeta for NoReactDeps {
    const NAME: &'static str = "solid/no-react-deps";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoReactDeps {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoReactDepsVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoReactDepsVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> NoReactDepsVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn get_callee_name<'b>(expr: &'b Expression<'_>) -> Option<&'b str> {
        match expr {
            Expression::Identifier(ident) => Some(ident.name.as_str()),
            _ => None,
        }
    }

    fn is_function_with_no_params(arg: &Argument<'_>) -> bool {
        match arg {
            Argument::ArrowFunctionExpression(arrow) => arrow.params.items.is_empty(),
            Argument::FunctionExpression(func) => func.params.items.is_empty(),
            _ => false,
        }
    }

    fn is_array_expression(arg: &Argument<'_>) -> bool {
        matches!(arg, Argument::ArrayExpression(_))
    }

    fn check_call_expression(&mut self, call: &CallExpression<'a>) {
        let callee_name = match Self::get_callee_name(&call.callee) {
            Some(name) => name,
            None => return,
        };

        if !REACTIVE_FUNCTIONS.contains(&callee_name) {
            return;
        }

        if call.arguments.len() < 2 {
            return;
        }

        let first_arg = &call.arguments[0];
        let second_arg = &call.arguments[1];

        if Self::is_function_with_no_params(first_arg) && Self::is_array_expression(second_arg) {
            self.diagnostics.push(Diagnostic::warning(
                NoReactDeps::NAME,
                second_arg.span(),
                format!(
                    "In Solid, `{}` doesn't accept a dependency array because it automatically tracks its dependencies. If you really need to override the list of dependencies, use `on`.",
                    callee_name
                ),
            ));
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoReactDepsVisitor<'a, 'ctx> {
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
        let rule = NoReactDeps::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoReactDeps::NAME, "solid/no-react-deps");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoReactDeps::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_create_effect_no_deps_valid() {
        let diagnostics = check_code(r#"createEffect(() => { console.log(count()); });"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_create_memo_no_deps_valid() {
        let diagnostics = check_code(r#"const doubled = createMemo(() => count() * 2);"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_create_effect_with_initial_value_valid() {
        let diagnostics = check_code(r#"createEffect((prev) => count() + prev, 0);"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_create_memo_with_initial_value_valid() {
        let diagnostics = check_code(r#"const sum = createMemo((prev) => count() + prev, 0);"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_use_effect_with_deps_valid() {
        let diagnostics = check_code(r#"useEffect(() => { console.log(count); }, [count]);"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for useEffect (React)"
        );
    }

    #[test]
    fn test_on_with_deps_valid() {
        let diagnostics = check_code(r#"createEffect(on(count, (v) => console.log(v)));"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for on()"
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_create_effect_with_deps_array_invalid() {
        let diagnostics =
            check_code(r#"createEffect(() => { console.log(count()); }, [count]);"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createEffect with deps array"
        );
        assert!(diagnostics[0].message.contains("createEffect"));
        assert!(diagnostics[0].message.contains("dependency array"));
    }

    #[test]
    fn test_create_memo_with_deps_array_invalid() {
        let diagnostics = check_code(r#"const doubled = createMemo(() => count() * 2, [count]);"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createMemo with deps array"
        );
        assert!(diagnostics[0].message.contains("createMemo"));
        assert!(diagnostics[0].message.contains("dependency array"));
    }

    #[test]
    fn test_create_effect_with_empty_deps_array_invalid() {
        let diagnostics = check_code(r#"createEffect(() => { console.log("once"); }, []);"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createEffect with empty deps array"
        );
    }

    #[test]
    fn test_create_effect_with_multiple_deps_invalid() {
        let diagnostics =
            check_code(r#"createEffect(() => { console.log(a(), b()); }, [a, b]);"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for createEffect with multiple deps"
        );
    }

    #[test]
    fn test_message_suggests_on() {
        let diagnostics =
            check_code(r#"createEffect(() => { console.log(count()); }, [count]);"#);
        assert!(!diagnostics.is_empty());
        assert!(
            diagnostics[0].message.contains("on"),
            "Expected message to suggest using `on`"
        );
    }
}
