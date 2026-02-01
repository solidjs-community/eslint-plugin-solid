//! solid/no-direct-store-mutation
//!
//! Disallow direct mutation of stores. Use the setter function instead.
//! `store.x = y` breaks reactivity; use `setStore('x', y)` or `setStore(s => ({...s, x: y}))`.

use oxc_ast::ast::{
    AssignmentExpression, AssignmentTarget, BindingPatternKind, Expression, Program,
    VariableDeclarator,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;
use rustc_hash::FxHashSet;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct NoDirectStoreMutation;

impl RuleMeta for NoDirectStoreMutation {
    const NAME: &'static str = "solid/no-direct-store-mutation";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoDirectStoreMutation {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoDirectStoreMutationVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoDirectStoreMutationVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    store_names: FxHashSet<String>,
}

impl<'a, 'ctx> NoDirectStoreMutationVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            store_names: FxHashSet::default(),
        }
    }

    fn is_create_store_call(expr: &Expression<'_>) -> bool {
        match expr {
            Expression::CallExpression(call) => {
                if let Expression::Identifier(ident) = &call.callee {
                    return ident.name.as_str() == "createStore";
                }
                false
            }
            _ => false,
        }
    }

    fn check_variable_declarator(&mut self, decl: &VariableDeclarator<'a>) {
        let Some(init) = &decl.init else { return };

        if !Self::is_create_store_call(init) {
            return;
        }

        if let BindingPatternKind::ArrayPattern(array_pat) = &decl.id.kind {
            if let Some(Some(first_elem)) = array_pat.elements.first() {
                if let BindingPatternKind::BindingIdentifier(ident) = &first_elem.kind {
                    self.store_names.insert(ident.name.to_string());
                }
            }
        }
    }

    fn get_root_object_name(expr: &Expression<'_>) -> Option<String> {
        match expr {
            Expression::Identifier(ident) => Some(ident.name.to_string()),
            Expression::StaticMemberExpression(member) => Self::get_root_object_name(&member.object),
            Expression::ComputedMemberExpression(member) => {
                Self::get_root_object_name(&member.object)
            }
            _ => None,
        }
    }

    fn check_assignment_expression(&mut self, expr: &AssignmentExpression<'a>) {
        let target_expr: Option<&Expression<'a>> = match &expr.left {
            AssignmentTarget::StaticMemberExpression(member) => Some(&member.object),
            AssignmentTarget::ComputedMemberExpression(member) => Some(&member.object),
            AssignmentTarget::PrivateFieldExpression(member) => Some(&member.object),
            _ => None,
        };

        if let Some(obj_expr) = target_expr {
            if let Some(root_name) = Self::get_root_object_name(obj_expr) {
                if self.store_names.contains(&root_name) {
                    self.diagnostics.push(
                        Diagnostic::warning(
                            NoDirectStoreMutation::NAME,
                            expr.span(),
                            format!(
                                "Do not mutate `{}` directly. Use the setter function instead.",
                                root_name
                            ),
                        )
                        .with_help("Use the setter (e.g., `setStore('property', value)`) to maintain reactivity."),
                    );
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoDirectStoreMutationVisitor<'a, 'ctx> {
    fn visit_variable_declarator(&mut self, decl: &VariableDeclarator<'a>) {
        self.check_variable_declarator(decl);
        walk::walk_variable_declarator(self, decl);
    }

    fn visit_assignment_expression(&mut self, expr: &AssignmentExpression<'a>) {
        self.check_assignment_expression(expr);
        walk::walk_assignment_expression(self, expr);
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
        let rule = NoDirectStoreMutation::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoDirectStoreMutation::NAME, "solid/no-direct-store-mutation");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoDirectStoreMutation::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_setter_call_valid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            setStore('count', 1);
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_setter_with_function_valid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            setStore(s => ({ ...s, count: s.count + 1 }));
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_setter_with_produce_valid() {
        let diagnostics = check_code(
            r#"
            import { createStore, produce } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            setStore(produce(s => { s.count = 1; }));
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_non_store_mutation_valid() {
        let diagnostics = check_code(
            r#"
            const obj = { x: 1 };
            obj.x = 2;
            "#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_reading_store_valid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            const value = store.count;
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
    fn test_direct_mutation_invalid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            store.count = 1;
            "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for direct store mutation"
        );
        assert!(diagnostics[0].message.contains("store"));
        assert!(diagnostics[0].message.contains("setter"));
    }

    #[test]
    fn test_direct_mutation_computed_key_invalid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            store["count"] = 1;
            "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for direct store mutation with computed key"
        );
    }

    #[test]
    fn test_nested_mutation_invalid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ nested: { value: 0 } });
            store.nested.value = 1;
            "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for nested store mutation"
        );
    }

    #[test]
    fn test_deeply_nested_mutation_invalid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ a: { b: { c: 0 } } });
            store.a.b.c = 1;
            "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for deeply nested store mutation"
        );
    }

    #[test]
    fn test_compound_assignment_invalid() {
        let diagnostics = check_code(
            r#"
            import { createStore } from "solid-js/store";
            const [store, setStore] = createStore({ count: 0 });
            store.count += 1;
            "#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for compound assignment"
        );
    }
}
