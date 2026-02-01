//! solid/no-react-specific-props
//!
//! Disallow React-specific props that don't work in Solid.
//! This rule detects React patterns and suggests Solid alternatives.

use oxc_ast::ast::{
    JSXAttributeItem, JSXAttributeName, JSXElementName, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

/// The no-react-specific-props rule
#[derive(Debug, Clone, Default)]
pub struct NoReactSpecificProps;

impl RuleMeta for NoReactSpecificProps {
    const NAME: &'static str = "solid/no-react-specific-props";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoReactSpecificProps {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoReactSpecificPropsVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoReactSpecificPropsVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> NoReactSpecificPropsVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn is_dom_element(name: &JSXElementName) -> bool {
        match name {
            JSXElementName::Identifier(ident) => {
                let name = ident.name.as_str();
                !name.is_empty() && name.chars().next().unwrap().is_lowercase()
            }
            JSXElementName::IdentifierReference(ident) => {
                let name = ident.name.as_str();
                !name.is_empty() && name.chars().next().unwrap().is_lowercase()
            }
            JSXElementName::NamespacedName(_) => true,
            JSXElementName::MemberExpression(_) => false,
            JSXElementName::ThisExpression(_) => false,
        }
    }

    fn check_jsx_opening_element(&mut self, node: &JSXOpeningElement<'a>) {
        let is_dom = Self::is_dom_element(&node.name);

        for attr in &node.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::Identifier(ident) = &jsx_attr.name {
                    let name = ident.name.as_str();

                    match name {
                        "className" => {
                            self.diagnostics.push(
                                Diagnostic::warning(
                                    NoReactSpecificProps::NAME,
                                    jsx_attr.span(),
                                    "Prefer the `class` prop over the deprecated `className` prop.",
                                )
                                .with_fix(ident.span(), "class"),
                            );
                        }
                        "htmlFor" => {
                            self.diagnostics.push(
                                Diagnostic::warning(
                                    NoReactSpecificProps::NAME,
                                    jsx_attr.span(),
                                    "Prefer the `for` prop over the deprecated `htmlFor` prop.",
                                )
                                .with_fix(ident.span(), "for"),
                            );
                        }
                        "key" if is_dom => {
                            self.diagnostics.push(Diagnostic::warning(
                                NoReactSpecificProps::NAME,
                                jsx_attr.span(),
                                "Elements in a <For> or <Index> list do not need a key prop.",
                            ));
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoReactSpecificPropsVisitor<'a, 'ctx> {
    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement<'a>) {
        self.check_jsx_opening_element(&elem.opening_element);
        walk::walk_jsx_element(self, elem);
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
        let rule = NoReactSpecificProps::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoReactSpecificProps::NAME, "solid/no-react-specific-props");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoReactSpecificProps::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_class_prop_valid() {
        let diagnostics = check_code(r#"const el = <div class="container" />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_for_prop_valid() {
        let diagnostics = check_code(r#"const el = <label for="input-id">Label</label>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_no_key_on_dom_valid() {
        let diagnostics = check_code(r#"const el = <div>Item</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_key_on_component_valid() {
        let diagnostics = check_code(r#"const el = <MyComponent key={id} />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics for key on component");
    }

    // ===== Invalid cases =====

    #[test]
    fn test_classname_invalid() {
        let diagnostics = check_code(r#"const el = <div className="container" />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for className");
        assert!(diagnostics[0].message.contains("class"));
        assert!(diagnostics[0].message.contains("className"));
    }

    #[test]
    fn test_htmlfor_invalid() {
        let diagnostics = check_code(r#"const el = <label htmlFor="input-id">Label</label>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for htmlFor");
        assert!(diagnostics[0].message.contains("for"));
        assert!(diagnostics[0].message.contains("htmlFor"));
    }

    #[test]
    fn test_key_on_dom_element_invalid() {
        let diagnostics = check_code(r#"const el = <div key={item.id}>Item</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for key on DOM element");
        assert!(diagnostics[0].message.contains("key"));
    }

    #[test]
    fn test_key_on_li_invalid() {
        let diagnostics = check_code(r#"const el = <li key={id}>Item</li>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for key on li element");
    }

    #[test]
    fn test_classname_has_fix() {
        let diagnostics = check_code(r#"const el = <div className="container" />;"#);
        assert!(!diagnostics.is_empty());
        assert!(diagnostics[0].fix.is_some(), "Expected fix for className");
        assert_eq!(diagnostics[0].fix.as_ref().unwrap().replacement, "class");
    }

    #[test]
    fn test_htmlfor_has_fix() {
        let diagnostics = check_code(r#"const el = <label htmlFor="input-id">Label</label>;"#);
        assert!(!diagnostics.is_empty());
        assert!(diagnostics[0].fix.is_some(), "Expected fix for htmlFor");
        assert_eq!(diagnostics[0].fix.as_ref().unwrap().replacement, "for");
    }

    #[test]
    fn test_multiple_react_props_invalid() {
        let diagnostics = check_code(r#"const el = <label className="label" htmlFor="input">Text</label>;"#);
        assert_eq!(diagnostics.len(), 2, "Expected 2 diagnostics for className and htmlFor");
    }
}
