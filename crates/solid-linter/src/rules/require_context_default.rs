//! solid/require-context-default
//!
//! Require createContext to have an explicit default value.
//! Without a default, consumers must handle undefined, which is error-prone.

use oxc_ast::ast::{CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct RequireContextDefault;

impl RuleMeta for RequireContextDefault {
    const NAME: &'static str = "solid/require-context-default";
    const CATEGORY: RuleCategory = RuleCategory::Suggestion;
}

impl RequireContextDefault {
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
}

impl<'a, 'ctx> Visitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn check_call(&mut self, call: &CallExpression<'a>) {
        if let Expression::Identifier(ident) = &call.callee {
            if ident.name.as_str() != "createContext" {
                return;
            }

            let needs_warning = if call.arguments.is_empty() {
                true
            } else if let Some(first_arg) = call.arguments.first() {
                if let Some(expr) = first_arg.as_expression() {
                    matches!(expr, Expression::Identifier(id) if id.name.as_str() == "undefined")
                } else {
                    false
                }
            } else {
                false
            };

            if needs_warning {
                self.diagnostics.push(
                    Diagnostic::warning(
                        RequireContextDefault::NAME,
                        call.span(),
                        "createContext should have an explicit default value.",
                    )
                    .with_help("Provide a default value to avoid undefined checks in consumers."),
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
        RequireContextDefault::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_with_object() {
        let diags = check_code(r#"const Ctx = createContext({ value: 0 });"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_with_null() {
        let diags = check_code(r#"const Ctx = createContext(null);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_with_empty_string() {
        let diags = check_code(r#"const Ctx = createContext("");"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_with_zero() {
        let diags = check_code(r#"const Ctx = createContext(0);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_with_false() {
        let diags = check_code(r#"const Ctx = createContext(false);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_no_args() {
        let diags = check_code(r#"const Ctx = createContext();"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("default value"));
    }

    #[test]
    fn test_invalid_undefined() {
        let diags = check_code(r#"const Ctx = createContext(undefined);"#);
        assert_eq!(diags.len(), 1);
    }

    #[test]
    fn test_valid_other_function() {
        let diags = check_code(r#"const result = otherFunction();"#);
        assert!(diags.is_empty());
    }
}
