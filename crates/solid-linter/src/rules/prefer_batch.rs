//! solid/prefer-batch
//!
//! Suggest using batch() when multiple setters are called in the same synchronous scope.
//! Batching prevents unnecessary re-renders between setter calls.

use oxc_ast::ast::{CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};
use oxc_syntax::scope::ScopeFlags;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct PreferBatch;

impl RuleMeta for PreferBatch {
    const NAME: &'static str = "solid/prefer-batch";
    const CATEGORY: RuleCategory = RuleCategory::Suggestion;
}

impl PreferBatch {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(&self, program: &Program<'a>, ctx: &LintContext<'a>) -> Vec<Diagnostic> {
        let mut visitor = Visitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

#[derive(Debug)]
struct SetterCall {
    span: Span,
    name: String,
}

#[derive(Debug, Default)]
struct BlockFrame {
    setter_calls: Vec<SetterCall>,
}

struct Visitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    block_stack: Vec<BlockFrame>,
    /// Track when we're inside a batch callback
    in_batch_depth: usize,
}

impl<'a, 'ctx> Visitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            block_stack: vec![BlockFrame::default()],
            in_batch_depth: 0,
        }
    }

    fn is_setter_name(name: &str) -> bool {
        name.starts_with("set") && name.len() > 3 && name.chars().nth(3).map_or(false, |c| c.is_ascii_uppercase())
    }

    fn check_call(&mut self, call: &CallExpression<'a>) {
        if let Expression::Identifier(ident) = &call.callee {
            let name = ident.name.as_str();
            
            // Track setter calls only if not in batch
            if Self::is_setter_name(name) && self.in_batch_depth == 0 {
                if let Some(frame) = self.block_stack.last_mut() {
                    frame.setter_calls.push(SetterCall {
                        span: call.span(),
                        name: name.to_string(),
                    });
                }
            }
        }
    }

    fn check_block_exit(&mut self) {
        if let Some(frame) = self.block_stack.last() {
            if frame.setter_calls.len() >= 2 {
                // Report on the first setter call
                let first = &frame.setter_calls[0];
                let names: Vec<_> = frame.setter_calls.iter().map(|s| s.name.as_str()).collect();
                self.diagnostics.push(
                    Diagnostic::warning(
                        PreferBatch::NAME,
                        first.span,
                        format!(
                            "Multiple setter calls ({}) should be wrapped in `batch()`.",
                            names.join(", ")
                        ),
                    )
                    .with_help("Use `batch(() => { ... })` to prevent unnecessary re-renders."),
                );
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for Visitor<'a, 'ctx> {
    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        // Check if this is a batch() call
        let is_batch = matches!(&call.callee, Expression::Identifier(ident) if ident.name.as_str() == "batch");
        
        if is_batch {
            self.in_batch_depth += 1;
            walk::walk_call_expression(self, call);
            self.in_batch_depth -= 1;
        } else {
            self.check_call(call);
            walk::walk_call_expression(self, call);
        }
    }

    fn visit_block_statement(&mut self, block: &oxc_ast::ast::BlockStatement<'a>) {
        self.block_stack.push(BlockFrame::default());
        walk::walk_block_statement(self, block);
        self.check_block_exit();
        self.block_stack.pop();
    }

    fn visit_function(&mut self, func: &oxc_ast::ast::Function<'a>, flags: ScopeFlags) {
        self.block_stack.push(BlockFrame::default());
        walk::walk_function(self, func, flags);
        self.check_block_exit();
        self.block_stack.pop();
    }

    fn visit_arrow_function_expression(&mut self, arrow: &oxc_ast::ast::ArrowFunctionExpression<'a>) {
        self.block_stack.push(BlockFrame::default());
        walk::walk_arrow_function_expression(self, arrow);
        self.check_block_exit();
        self.block_stack.pop();
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
        PreferBatch::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_single_setter() {
        let diags = check_code(r#"
            const handler = () => {
                setCount(1);
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_with_batch() {
        let diags = check_code(r#"
            const handler = () => {
                batch(() => {
                    setA(1);
                    setB(2);
                });
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_different_scopes() {
        let diags = check_code(r#"
            const handler1 = () => { setA(1); };
            const handler2 = () => { setB(2); };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_multiple_setters() {
        let diags = check_code(r#"
            const handler = () => {
                setA(1);
                setB(2);
            };
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("batch"));
    }

    #[test]
    fn test_invalid_three_setters() {
        let diags = check_code(r#"
            const handler = () => {
                setX(1);
                setY(2);
                setZ(3);
            };
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("setX"));
        assert!(diags[0].message.contains("setY"));
        assert!(diags[0].message.contains("setZ"));
    }

    #[test]
    fn test_valid_not_setter() {
        let diags = check_code(r#"
            const handler = () => {
                setup(1);
                settings(2);
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_lowercase_after_set() {
        let diags = check_code(r#"
            const handler = () => {
                setattr(1);
                setup(2);
            };
        "#);
        assert!(diags.is_empty());
    }
}
