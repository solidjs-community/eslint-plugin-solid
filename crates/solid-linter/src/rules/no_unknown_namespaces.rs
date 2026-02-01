//! solid/no-unknown-namespaces
//!
//! Enforce using only Solid-specific namespaced attribute names.
//! Solid.js uses namespaced attributes like `on:click`, `use:directive`, `prop:value`
//! for special behavior. Unknown namespaces are likely typos or mistakes.

use oxc_ast::ast::{
    JSXAttributeItem, JSXAttributeName, JSXElement, JSXElementName, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const KNOWN_NAMESPACES: &[&str] = &["on", "oncapture", "use", "prop", "attr", "bool"];

const OTHER_ALLOWED_NAMESPACES: &[&str] = &["xmlns", "xlink"];

const STYLE_NAMESPACES: &[&str] = &["style", "class"];

#[derive(Debug, Clone, Default)]
pub struct NoUnknownNamespaces {
    allowed_namespaces: Vec<String>,
}

impl RuleMeta for NoUnknownNamespaces {
    const NAME: &'static str = "solid/no-unknown-namespaces";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoUnknownNamespaces {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_allowed_namespaces(mut self, namespaces: Vec<String>) -> Self {
        self.allowed_namespaces = namespaces;
        self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoUnknownNamespacesVisitor::new(ctx, &self.allowed_namespaces);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoUnknownNamespacesVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    allowed_namespaces: &'ctx [String],
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> NoUnknownNamespacesVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>, allowed_namespaces: &'ctx [String]) -> Self {
        Self {
            ctx,
            allowed_namespaces,
            diagnostics: Vec::new(),
        }
    }

    fn is_component(opening: &JSXOpeningElement) -> bool {
        match &opening.name {
            JSXElementName::Identifier(ident) => ident
                .name
                .chars()
                .next()
                .map(|c| c.is_ascii_uppercase())
                .unwrap_or(false),
            JSXElementName::NamespacedName(_) => false,
            JSXElementName::MemberExpression(_) => true,
            JSXElementName::IdentifierReference(_) | JSXElementName::ThisExpression(_) => true,
        }
    }

    fn is_known_namespace(&self, ns: &str) -> bool {
        KNOWN_NAMESPACES.contains(&ns)
            || OTHER_ALLOWED_NAMESPACES.contains(&ns)
            || self.allowed_namespaces.iter().any(|s| s == ns)
    }

    fn is_style_namespace(ns: &str) -> bool {
        STYLE_NAMESPACES.contains(&ns)
    }

    fn check_jsx_opening_element(&mut self, opening: &JSXOpeningElement<'a>) {
        let is_component = Self::is_component(opening);

        for attr in &opening.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::NamespacedName(ns_name) = &jsx_attr.name {
                    let namespace = ns_name.namespace.name.as_str();

                    if is_component {
                        self.diagnostics.push(
                            Diagnostic::warning(
                                NoUnknownNamespaces::NAME,
                                jsx_attr.span(),
                                "Namespaced props have no effect on components.",
                            )
                            .with_help(format!(
                                "Remove the '{}:' prefix or use a regular prop name",
                                namespace
                            )),
                        );
                    } else if Self::is_style_namespace(namespace) {
                        self.diagnostics.push(
                            Diagnostic::warning(
                                NoUnknownNamespaces::NAME,
                                jsx_attr.span(),
                                format!(
                                    "Using the '{}:' special prefix is potentially confusing, prefer the '{}' prop instead.",
                                    namespace, namespace
                                ),
                            )
                            .with_help(format!(
                                "Replace '{}:{}' with '{{{{{}: {{...}}}}}}' or use the '{}' attribute directly",
                                namespace,
                                ns_name.name.name,
                                namespace,
                                namespace
                            )),
                        );
                    } else if !self.is_known_namespace(namespace) {
                        self.diagnostics.push(
                            Diagnostic::error(
                                NoUnknownNamespaces::NAME,
                                jsx_attr.span(),
                                format!(
                                    "'{}:' is not one of Solid's special prefixes for JSX attributes.",
                                    namespace
                                ),
                            )
                            .with_help(format!(
                                "Valid namespaces are: {}",
                                KNOWN_NAMESPACES.join(", ")
                            )),
                        );
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoUnknownNamespacesVisitor<'a, 'ctx> {
    fn visit_jsx_element(&mut self, elem: &JSXElement<'a>) {
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
        check_code_with_options(source, vec![])
    }

    fn check_code_with_options(source: &str, allowed: Vec<String>) -> Vec<Diagnostic> {
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = NoUnknownNamespaces::new().with_allowed_namespaces(allowed);
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoUnknownNamespaces::NAME, "solid/no-unknown-namespaces");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoUnknownNamespaces::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_on_namespace_valid() {
        let diagnostics = check_code(r#"const el = <div on:click={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_oncapture_namespace_valid() {
        let diagnostics = check_code(r#"const el = <div oncapture:click={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_use_namespace_valid() {
        let diagnostics = check_code(r#"const el = <div use:directive={options} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_prop_namespace_valid() {
        let diagnostics = check_code(r#"const el = <input prop:value={value} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_attr_namespace_valid() {
        let diagnostics = check_code(r#"const el = <div attr:data-custom={value} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_bool_namespace_valid() {
        let diagnostics = check_code(r#"const el = <input bool:disabled={isDisabled} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_xmlns_namespace_valid() {
        let diagnostics = check_code(r#"const el = <svg xmlns:xlink="http://www.w3.org/1999/xlink" />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_xlink_namespace_valid() {
        let diagnostics = check_code(r##"const el = <use xlink:href="#icon" />;"##);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_custom_allowed_namespace_valid() {
        let diagnostics = check_code_with_options(
            r#"const el = <div custom:attr={value} />;"#,
            vec!["custom".to_string()],
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_regular_attribute_valid() {
        let diagnostics = check_code(r#"const el = <div class="foo" id="bar" />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_unknown_namespace_invalid() {
        let diagnostics = check_code(r#"const el = <div unknown:attr={value} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for unknown namespace"
        );
        assert!(diagnostics[0].message.contains("unknown:"));
        assert!(diagnostics[0].message.contains("not one of Solid's special prefixes"));
    }

    #[test]
    fn test_typo_namespace_invalid() {
        let diagnostics = check_code(r#"const el = <div onCapture:click={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for typo namespace"
        );
    }

    #[test]
    fn test_style_namespace_warning() {
        let diagnostics = check_code(r#"const el = <div style:color="red" />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for style namespace"
        );
        assert!(diagnostics[0].message.contains("potentially confusing"));
        assert!(diagnostics[0].message.contains("prefer the 'style' prop"));
    }

    #[test]
    fn test_class_namespace_warning() {
        let diagnostics = check_code(r#"const el = <div class:active={isActive} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for class namespace"
        );
        assert!(diagnostics[0].message.contains("potentially confusing"));
    }

    #[test]
    fn test_namespace_on_component_invalid() {
        let diagnostics = check_code(r#"const el = <MyComponent on:click={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for namespace on component"
        );
        assert!(diagnostics[0].message.contains("no effect on components"));
    }

    #[test]
    fn test_namespace_on_member_expression_component_invalid() {
        let diagnostics = check_code(r#"const el = <UI.Button on:click={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for namespace on member expression component"
        );
        assert!(diagnostics[0].message.contains("no effect on components"));
    }

    #[test]
    fn test_multiple_invalid_namespaces() {
        let diagnostics = check_code(r#"const el = <div foo:bar={a} baz:qux={b} />;"#);
        assert!(
            diagnostics.len() == 2,
            "Expected 2 diagnostics for two invalid namespaces but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_nested_elements_with_invalid_namespace() {
        let diagnostics = check_code(
            r#"const el = <div><span unknown:attr={value} /></div>;"#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for nested element with unknown namespace"
        );
    }
}
