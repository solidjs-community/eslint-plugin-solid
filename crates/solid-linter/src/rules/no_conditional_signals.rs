//! solid/no-conditional-signals
//!
//! Disallow creating signals inside conditionals or loops.
//! Signals must be created at the top level of a component to maintain
//! consistent reactivity across renders.

use oxc_ast::ast::{CallExpression, Expression, Program};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;
use oxc_syntax::scope::ScopeFlags;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const SIGNAL_CREATORS: &[&str] = &[
    "createSignal",
    "createMemo",
    "createStore",
    "createEffect",
    "createResource",
    "createComputed",
    "createRenderEffect",
    "createDeferred",
];

#[derive(Debug, Clone, Default)]
pub struct NoConditionalSignals;

impl RuleMeta for NoConditionalSignals {
    const NAME: &'static str = "solid/no-conditional-signals";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoConditionalSignals {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(&self, program: &Program<'a>, ctx: &LintContext<'a>) -> Vec<Diagnostic> {
        let mut visitor = NoConditionalSignalsVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ConditionalContext {
    If,
    Ternary,
    Switch,
    For,
    While,
    DoWhile,
    ForIn,
    ForOf,
}

impl ConditionalContext {
    fn description(&self) -> &'static str {
        match self {
            Self::If => "if statement",
            Self::Ternary => "ternary expression",
            Self::Switch => "switch statement",
            Self::For => "for loop",
            Self::While => "while loop",
            Self::DoWhile => "do-while loop",
            Self::ForIn => "for-in loop",
            Self::ForOf => "for-of loop",
        }
    }
}

struct NoConditionalSignalsVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    conditional_stack: Vec<ConditionalContext>,
}

impl<'a, 'ctx> NoConditionalSignalsVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            conditional_stack: Vec::new(),
        }
    }

    fn is_signal_creator(&self, name: &str) -> bool {
        SIGNAL_CREATORS.contains(&name)
    }

    fn check_call(&mut self, call: &CallExpression<'a>) {
        if let Expression::Identifier(ident) = &call.callee {
            let name = ident.name.as_str();
            if self.is_signal_creator(name) {
                if let Some(context) = self.conditional_stack.last() {
                    self.diagnostics.push(
                        Diagnostic::error(
                            NoConditionalSignals::NAME,
                            call.span(),
                            format!(
                                "`{}` called inside {}. Signals must be created unconditionally.",
                                name,
                                context.description()
                            ),
                        )
                        .with_help("Move the signal creation to the top level of the component."),
                    );
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoConditionalSignalsVisitor<'a, 'ctx> {
    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.check_call(call);
        walk::walk_call_expression(self, call);
    }

    fn visit_if_statement(&mut self, stmt: &oxc_ast::ast::IfStatement<'a>) {
        self.conditional_stack.push(ConditionalContext::If);
        walk::walk_if_statement(self, stmt);
        self.conditional_stack.pop();
    }

    fn visit_conditional_expression(&mut self, expr: &oxc_ast::ast::ConditionalExpression<'a>) {
        // Visit test without conditional context
        self.visit_expression(&expr.test);
        
        // Visit consequent and alternate with ternary context
        self.conditional_stack.push(ConditionalContext::Ternary);
        self.visit_expression(&expr.consequent);
        self.visit_expression(&expr.alternate);
        self.conditional_stack.pop();
    }

    fn visit_switch_statement(&mut self, stmt: &oxc_ast::ast::SwitchStatement<'a>) {
        // Visit discriminant without conditional context
        self.visit_expression(&stmt.discriminant);
        
        // Visit cases with switch context
        self.conditional_stack.push(ConditionalContext::Switch);
        for case in &stmt.cases {
            walk::walk_switch_case(self, case);
        }
        self.conditional_stack.pop();
    }

    fn visit_for_statement(&mut self, stmt: &oxc_ast::ast::ForStatement<'a>) {
        self.conditional_stack.push(ConditionalContext::For);
        walk::walk_for_statement(self, stmt);
        self.conditional_stack.pop();
    }

    fn visit_while_statement(&mut self, stmt: &oxc_ast::ast::WhileStatement<'a>) {
        self.conditional_stack.push(ConditionalContext::While);
        walk::walk_while_statement(self, stmt);
        self.conditional_stack.pop();
    }

    fn visit_do_while_statement(&mut self, stmt: &oxc_ast::ast::DoWhileStatement<'a>) {
        self.conditional_stack.push(ConditionalContext::DoWhile);
        walk::walk_do_while_statement(self, stmt);
        self.conditional_stack.pop();
    }

    fn visit_for_in_statement(&mut self, stmt: &oxc_ast::ast::ForInStatement<'a>) {
        self.conditional_stack.push(ConditionalContext::ForIn);
        walk::walk_for_in_statement(self, stmt);
        self.conditional_stack.pop();
    }

    fn visit_for_of_statement(&mut self, stmt: &oxc_ast::ast::ForOfStatement<'a>) {
        self.conditional_stack.push(ConditionalContext::ForOf);
        walk::walk_for_of_statement(self, stmt);
        self.conditional_stack.pop();
    }

    fn visit_function(&mut self, func: &oxc_ast::ast::Function<'a>, flags: ScopeFlags) {
        // Reset conditional stack for new function scope
        let saved = std::mem::take(&mut self.conditional_stack);
        walk::walk_function(self, func, flags);
        self.conditional_stack = saved;
    }

    fn visit_arrow_function_expression(&mut self, arrow: &oxc_ast::ast::ArrowFunctionExpression<'a>) {
        // Reset conditional stack for new function scope
        let saved = std::mem::take(&mut self.conditional_stack);
        walk::walk_arrow_function_expression(self, arrow);
        self.conditional_stack = saved;
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
        NoConditionalSignals::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_top_level_signal() {
        let diags = check_code(r#"
            const Component = () => {
                const [count, setCount] = createSignal(0);
                return <div>{count()}</div>;
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_signal_in_nested_function() {
        let diags = check_code(r#"
            const Component = () => {
                if (true) {
                    const inner = () => {
                        const [x, setX] = createSignal(0);
                    };
                }
                return <div />;
            };
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_signal_in_if() {
        let diags = check_code(r#"
            const Component = () => {
                if (condition) {
                    const [count, setCount] = createSignal(0);
                }
                return <div />;
            };
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("if statement"));
    }

    #[test]
    fn test_invalid_signal_in_for_loop() {
        let diags = check_code(r#"
            const Component = () => {
                for (let i = 0; i < 10; i++) {
                    const [x, setX] = createSignal(i);
                }
                return <div />;
            };
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("for loop"));
    }

    #[test]
    fn test_invalid_signal_in_while() {
        let diags = check_code(r#"
            const Component = () => {
                while (running) {
                    const memo = createMemo(() => 1);
                }
                return <div />;
            };
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("while loop"));
    }

    #[test]
    fn test_invalid_signal_in_ternary() {
        let diags = check_code(r#"
            const Component = () => {
                const x = condition ? createSignal(1) : createSignal(2);
                return <div />;
            };
        "#);
        assert_eq!(diags.len(), 2);
        assert!(diags[0].message.contains("ternary"));
    }

    #[test]
    fn test_invalid_signal_in_switch() {
        let diags = check_code(r#"
            const Component = () => {
                switch (type) {
                    case 'a':
                        const [a, setA] = createSignal(0);
                        break;
                }
                return <div />;
            };
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("switch"));
    }

    #[test]
    fn test_invalid_effect_in_conditional() {
        let diags = check_code(r#"
            const Component = () => {
                if (enabled) {
                    createEffect(() => console.log('effect'));
                }
                return <div />;
            };
        "#);
        assert_eq!(diags.len(), 1);
    }
}
