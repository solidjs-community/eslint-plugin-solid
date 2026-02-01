//! solid/consistent-signal-naming
//!
//! Enforce consistent naming for createSignal destructuring.
//! The setter should be named `set` + PascalCase of the getter name.

use oxc_ast::ast::{BindingPatternKind, Expression, Program, VariableDeclarator};
use oxc_ast_visit::{walk, Visit};

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct ConsistentSignalNaming;

impl RuleMeta for ConsistentSignalNaming {
    const NAME: &'static str = "solid/consistent-signal-naming";
    const CATEGORY: RuleCategory = RuleCategory::Style;
}

impl ConsistentSignalNaming {
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

    fn expected_setter_name(getter: &str) -> String {
        if getter.is_empty() {
            return "set".to_string();
        }
        let mut chars = getter.chars();
        let first = chars.next().unwrap().to_ascii_uppercase();
        format!("set{}{}", first, chars.as_str())
    }

    fn check_signal_destructuring(&mut self, decl: &VariableDeclarator<'a>) {
        let Some(init) = &decl.init else { return };

        // Check if init is createSignal call
        let Expression::CallExpression(call) = init else { return };
        let Expression::Identifier(callee) = &call.callee else { return };
        
        if callee.name.as_str() != "createSignal" {
            return;
        }

        // Check if destructured as array pattern [getter, setter]
        let BindingPatternKind::ArrayPattern(pattern) = &decl.id.kind else { return };
        
        if pattern.elements.len() < 2 {
            return;
        }

        let Some(Some(first)) = pattern.elements.first() else { return };
        let Some(Some(second)) = pattern.elements.get(1) else { return };

        let BindingPatternKind::BindingIdentifier(getter_ident) = &first.kind else { return };
        let BindingPatternKind::BindingIdentifier(setter_ident) = &second.kind else { return };

        let getter_name = getter_ident.name.as_str();
        let setter_name = setter_ident.name.as_str();
        let expected = Self::expected_setter_name(getter_name);

        if setter_name != expected {
            self.diagnostics.push(
                Diagnostic::warning(
                    ConsistentSignalNaming::NAME,
                    setter_ident.span,
                    format!(
                        "Setter `{}` should be named `{}` to match getter `{}`.",
                        setter_name, expected, getter_name
                    ),
                )
                .with_help(format!("Rename to `{}`.", expected)),
            );
        }
    }
}

impl<'a, 'ctx> Visit<'a> for Visitor<'a, 'ctx> {
    fn visit_variable_declarator(&mut self, decl: &VariableDeclarator<'a>) {
        self.check_signal_destructuring(decl);
        walk::walk_variable_declarator(self, decl);
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
        ConsistentSignalNaming::new().check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_valid_count_setCount() {
        let diags = check_code(r#"const [count, setCount] = createSignal(0);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_isOpen_setIsOpen() {
        let diags = check_code(r#"const [isOpen, setIsOpen] = createSignal(false);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_x_setX() {
        let diags = check_code(r#"const [x, setX] = createSignal(0);"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_userName_setUserName() {
        let diags = check_code(r#"const [userName, setUserName] = createSignal("");"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_invalid_updateCount() {
        let diags = check_code(r#"const [count, updateCount] = createSignal(0);"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("setCount"));
    }

    #[test]
    fn test_invalid_countSetter() {
        let diags = check_code(r#"const [count, countSetter] = createSignal(0);"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("setCount"));
    }

    #[test]
    fn test_invalid_setcount_lowercase() {
        let diags = check_code(r#"const [count, setcount] = createSignal(0);"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("setCount"));
    }

    #[test]
    fn test_invalid_wrong_prefix() {
        let diags = check_code(r#"const [value, changeValue] = createSignal(0);"#);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("setValue"));
    }

    #[test]
    fn test_valid_not_createSignal() {
        let diags = check_code(r#"const [data, setData] = someOtherFunction();"#);
        assert!(diags.is_empty());
    }

    #[test]
    fn test_valid_single_element() {
        let diags = check_code(r#"const [count] = createSignal(0);"#);
        assert!(diags.is_empty());
    }
}
