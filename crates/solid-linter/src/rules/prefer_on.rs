//! solid/prefer-on
//!
//! Suggest using the `on()` helper for explicit dependencies in effects.
//! The `on()` helper makes dependencies explicit and can prevent unnecessary re-runs.

use oxc_ast::ast::{CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct PreferOn;

impl RuleMeta for PreferOn {
    const NAME: &'static str = "solid/prefer-on";
    const CATEGORY: RuleCategory = RuleCategory::Suggestion;
}

impl PreferOn {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(&self, program: &Program<'a>, ctx: &LintContext<'a>) -> Vec<Diagnostic> {
        let mut visitor = PreferOnVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct PreferOnVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> PreferOnVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn check_effect_call(&mut self, call: &CallExpression<'a>) {
        if let Expression::Identifier(ident) = &call.callee {
            let name = ident.name.as_str();
            if name == "createEffect" || name == "createComputed" || name == "createRenderEffect" {
                if let Some(first_arg) = call.arguments.first() {
                    if let Some(expr) = first_arg.as_expression() {
                        // Check if it's wrapped in on()
                        let is_wrapped_in_on = matches!(expr, Expression::CallExpression(inner_call) 
                            if matches!(&inner_call.callee, Expression::Identifier(id) if id.name.as_str() == "on"));
                        
                        if !is_wrapped_in_on {
                            // Check if it's a function
                            let is_function = matches!(
                                expr,
                                Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
                            );
                            
                            if is_function {
                                self.diagnostics.push(
                                    Diagnostic::warning(
                                        PreferOn::NAME,
                                        call.span(),
                                        format!(
                                            "Consider using `on()` to make {} dependencies explicit.",
                                            name
                                        ),
                                    )
                                    .with_help("Wrap the callback with `on(deps, callback)` for explicit dependency tracking."),
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for PreferOnVisitor<'a, 'ctx> {
    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.check_effect_call(call);
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
        PreferOn::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_with_on() {
        let diags = check_code(r#"
            import { createEffect, on } from "solid-js";
            createEffect(on(count, () => console.log(count())));
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_with_on_array() {
        let diags = check_code(r#"
            createEffect(on([a, b], () => console.log(a() + b())));
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_without_on() {
        let diags = check_code(r#"
            createEffect(() => console.log(count()));
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("on()"));
    }

    #[test]
    fn test_invalid_render_effect() {
        let diags = check_code(r#"
            createRenderEffect(() => console.log(count()));
        "#);
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn test_invalid_computed() {
        let diags = check_code(r#"
            createComputed(() => setValue(count()));
        "#);
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn test_valid_non_effect() {
        let diags = check_code(r#"
            createMemo(() => count() * 2);
        "#);
        assert!(diags.is_empty());
    }
}
