//! solid/no-top-level-effects
//!
//! Disallow createEffect at module/top level scope.
//! Effects should be created inside components or other reactive contexts.

use oxc_ast::ast::{CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;
use oxc_syntax::scope::ScopeFlags;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const EFFECT_CREATORS: &[&str] = &[
    "createEffect",
    "createRenderEffect",
    "createComputed",
];

#[derive(Debug, Clone, Default)]
pub struct NoTopLevelEffects;

impl RuleMeta for NoTopLevelEffects {
    const NAME: &'static str = "solid/no-top-level-effects";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoTopLevelEffects {
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
    function_depth: usize,
}

impl<'a, 'ctx> Visitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            function_depth: 0,
        }
    }

    fn check_call(&mut self, call: &CallExpression<'a>) {
        if self.function_depth > 0 {
            return;
        }

        if let Expression::Identifier(ident) = &call.callee {
            let name = ident.name.as_str();
            if EFFECT_CREATORS.contains(&name) {
                self.diagnostics.push(
                    Diagnostic::error(
                        NoTopLevelEffects::NAME,
                        call.span(),
                        format!("`{}` should not be called at module level.", name),
                    )
                    .with_help("Move the effect inside a component or wrap in a function."),
                );
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for Visitor<'a, 'ctx> {
    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.check_call(call);
        walk::walk_call_expression(self, call);
    }

    fn visit_function(&mut self, func: &oxc_ast::ast::Function<'a>, flags: ScopeFlags) {
        self.function_depth += 1;
        walk::walk_function(self, func, flags);
        self.function_depth -= 1;
    }

    fn visit_arrow_function_expression(&mut self, arrow: &oxc_ast::ast::ArrowFunctionExpression<'a>) {
        self.function_depth += 1;
        walk::walk_arrow_function_expression(self, arrow);
        self.function_depth -= 1;
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
        NoTopLevelEffects::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_in_component() {
        let diags = check_code(r#"
            const Component = () => {
                createEffect(() => console.log('effect'));
                return <div />;
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_in_function() {
        let diags = check_code(r#"
            function setup() {
                createEffect(() => console.log('effect'));
            }
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_in_nested_function() {
        let diags = check_code(r#"
            const outer = () => {
                const inner = () => {
                    createEffect(() => {});
                };
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_top_level_effect() {
        let diags = check_code(r#"createEffect(() => console.log('effect'));"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("module level"));
    }

    #[test]
    fn test_invalid_top_level_render_effect() {
        let diags = check_code(r#"createRenderEffect(() => {});"#);
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn test_invalid_top_level_computed() {
        let diags = check_code(r#"createComputed(() => {});"#);
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn test_valid_createSignal_at_top_level() {
        // createSignal at top level is fine (for module-level state)
        let diags = check_code(r#"const [count, setCount] = createSignal(0);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_createMemo_at_top_level() {
        // createMemo at top level is questionable but allowed
        let diags = check_code(r#"const doubled = createMemo(() => count() * 2);"#);
        assert!(diags.is_empty());
    }
}
