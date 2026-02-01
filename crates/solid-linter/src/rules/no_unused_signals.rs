//! solid/no-unused-signals
//!
//! Detect signals that are created but the getter is never called.
//! An unused signal getter suggests dead code or a missing subscription.

use oxc_ast::ast::{
    BindingPatternKind, CallExpression, Expression, Program, VariableDeclarator,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::Span;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct NoUnusedSignals;

impl RuleMeta for NoUnusedSignals {
    const NAME: &'static str = "solid/no-unused-signals";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoUnusedSignals {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(&self, program: &Program<'a>, ctx: &LintContext<'a>) -> Vec<Diagnostic> {
        let mut visitor = Visitor::new(ctx);
        visitor.visit_program(program);
        visitor.finish()
    }
}

#[derive(Debug)]
struct SignalInfo {
    name: String,
    span: Span,
}

struct Visitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    /// Signal getter names -> their declaration info
    signal_getters: FxHashMap<String, SignalInfo>,
    /// Memo names -> their declaration info
    memos: FxHashMap<String, SignalInfo>,
    /// Signal/memo names that have been called
    called: FxHashSet<String>,
}

impl<'a, 'ctx> Visitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            signal_getters: FxHashMap::default(),
            memos: FxHashMap::default(),
            called: FxHashSet::default(),
        }
    }

    fn finish(self) -> Vec<Diagnostic> {
        let mut diagnostics = Vec::new();

        for (name, info) in self.signal_getters.iter().chain(self.memos.iter()) {
            if !self.called.contains(name) {
                diagnostics.push(
                    Diagnostic::warning(
                        NoUnusedSignals::NAME,
                        info.span,
                        format!("Signal getter `{}` is never called.", name),
                    )
                    .with_help("Either use the signal value or remove the unused signal."),
                );
            }
        }

        diagnostics
    }

    fn track_signal(&mut self, decl: &VariableDeclarator<'a>) {
        let Some(init) = &decl.init else { return };
        let Expression::CallExpression(call) = init else { return };
        let Expression::Identifier(callee) = &call.callee else { return };

        match callee.name.as_str() {
            "createSignal" => {
                // const [getter, setter] = createSignal(...)
                if let BindingPatternKind::ArrayPattern(pattern) = &decl.id.kind {
                    if let Some(Some(first)) = pattern.elements.first() {
                        if let BindingPatternKind::BindingIdentifier(ident) = &first.kind {
                            let name = ident.name.to_string();
                            self.signal_getters.insert(
                                name.clone(),
                                SignalInfo {
                                    name,
                                    span: ident.span,
                                },
                            );
                        }
                    }
                }
            }
            "createMemo" => {
                // const memo = createMemo(...)
                if let BindingPatternKind::BindingIdentifier(ident) = &decl.id.kind {
                    let name = ident.name.to_string();
                    self.memos.insert(
                        name.clone(),
                        SignalInfo {
                            name,
                            span: ident.span,
                        },
                    );
                }
            }
            _ => {}
        }
    }

    fn track_call(&mut self, call: &CallExpression<'a>) {
        if let Expression::Identifier(ident) = &call.callee {
            let name = ident.name.as_str();
            if self.signal_getters.contains_key(name) || self.memos.contains_key(name) {
                self.called.insert(name.to_string());
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for Visitor<'a, 'ctx> {
    fn visit_variable_declarator(&mut self, decl: &VariableDeclarator<'a>) {
        self.track_signal(decl);
        walk::walk_variable_declarator(self, decl);
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.track_call(call);
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
        NoUnusedSignals::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_signal_used() {
        let diags = check_code(r#"
            const [count, setCount] = createSignal(0);
            console.log(count());
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_signal_in_jsx() {
        let diags = check_code(r#"
            const [count, setCount] = createSignal(0);
            const App = () => <div>{count()}</div>;
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_memo_used() {
        let diags = check_code(r#"
            const doubled = createMemo(() => count() * 2);
            console.log(doubled());
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_signal_unused() {
        let diags = check_code(r#"
            const [count, setCount] = createSignal(0);
            setCount(1);
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("count"));
        assert!(diags[0].message.contains("never called"));
    }

    #[test]
    fn test_invalid_memo_unused() {
        let diags = check_code(r#"
            const doubled = createMemo(() => x * 2);
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("doubled"));
    }

    #[test]
    fn test_valid_not_signal() {
        let diags = check_code(r#"
            const [a, b] = someFunction();
        "#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_multiple_unused() {
        let diags = check_code(r#"
            const [a, setA] = createSignal(0);
            const [b, setB] = createSignal(0);
            setA(1);
            setB(2);
        "#);
        assert_eq!(diags.len(), 2);
    }

    #[test]
    fn test_one_used_one_unused() {
        let diags = check_code(r#"
            const [a, setA] = createSignal(0);
            const [b, setB] = createSignal(0);
            console.log(a());
            setB(2);
        "#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("b"));
    }
}
