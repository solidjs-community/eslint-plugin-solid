//! solid/jsx-no-duplicate-props
//!
//! Disallow passing the same prop twice in JSX.
//! This rule detects duplicate props on JSX elements and warns about conflicts
//! between children prop, JSX children, innerHTML, and textContent.

use oxc_ast::ast::{
    JSXAttribute, JSXAttributeItem, JSXAttributeName, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;
use rustc_hash::FxHashSet;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

/// Options for the jsx-no-duplicate-props rule
#[derive(Debug, Clone, Default)]
pub struct JsxNoDuplicatePropsOptions {
    /// Whether to treat prop names case-insensitively
    pub ignore_case: bool,
}

/// The jsx-no-duplicate-props rule
#[derive(Debug, Clone, Default)]
pub struct JsxNoDuplicateProps {
    options: JsxNoDuplicatePropsOptions,
}

impl RuleMeta for JsxNoDuplicateProps {
    const NAME: &'static str = "solid/jsx-no-duplicate-props";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl JsxNoDuplicateProps {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_options(options: JsxNoDuplicatePropsOptions) -> Self {
        Self { options }
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = JsxNoDuplicatePropsVisitor::new(ctx, &self.options);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

/// Visitor for detecting duplicate props
struct JsxNoDuplicatePropsVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    options: &'ctx JsxNoDuplicatePropsOptions,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> JsxNoDuplicatePropsVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>, options: &'ctx JsxNoDuplicatePropsOptions) -> Self {
        Self {
            ctx,
            options,
            diagnostics: Vec::new(),
        }
    }

    /// Normalize a prop name for comparison
    /// Event handlers like onClick and oncapture:click should normalize to the same key
    fn normalize_prop_name(&self, name: &str) -> String {
        let mut normalized = name.to_string();

        // Always normalize event handlers and respect ignore_case option
        if self.options.ignore_case || name.starts_with("on") {
            normalized = normalized.to_lowercase();
            // Normalize on:* and oncapture:* to on*
            if normalized.starts_with("oncapture:") {
                normalized = format!("on{}", &normalized[10..]);
            } else if normalized.starts_with("on:") {
                normalized = format!("on{}", &normalized[3..]);
            }
            // Remove attr: and prop: prefixes
            if let Some(rest) = normalized.strip_prefix("attr:") {
                normalized = rest.to_string();
            } else if let Some(rest) = normalized.strip_prefix("prop:") {
                normalized = rest.to_string();
            }
        }

        normalized
    }

    fn check_jsx_opening_element(&mut self, node: &JSXOpeningElement<'a>, children_count: usize) {
        let mut props: FxHashSet<String> = FxHashSet::default();

        // Check each attribute for duplicates
        for attr in &node.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let Some(name) = self.get_attribute_name(jsx_attr) {
                    let normalized = self.normalize_prop_name(&name);

                    if props.contains(&normalized) {
                        // Report duplicate
                        let message = if normalized == "class" {
                            "Duplicate `class` props are not allowed; while it might seem to work, it can break unexpectedly. Use `classList` instead."
                        } else {
                            "Duplicate props are not allowed."
                        };

                        self.diagnostics.push(Diagnostic::warning(
                            JsxNoDuplicateProps::NAME,
                            jsx_attr.span(),
                            message,
                        ));
                    } else {
                        props.insert(normalized);
                    }
                }
            }
        }

        // Check for conflicts between children prop, JSX children, innerHTML, and textContent
        let has_children_prop = props.contains("children");
        let has_children = children_count > 0;
        let has_inner_html = props.contains("innerhtml") || props.contains("innerHTML");
        let has_text_content = props.contains("textcontent") || props.contains("textContent");

        let mut used: Vec<&str> = Vec::new();
        if has_children_prop {
            used.push("`props.children`");
        }
        if has_children {
            used.push("JSX children");
        }
        if has_inner_html {
            used.push("`props.innerHTML`");
        }
        if has_text_content {
            used.push("`props.textContent`");
        }

        if used.len() > 1 {
            self.diagnostics.push(Diagnostic::warning(
                JsxNoDuplicateProps::NAME,
                node.span(),
                format!("Using {} at the same time is not allowed.", used.join(", ")),
            ));
        }
    }

    fn get_attribute_name(&self, attr: &JSXAttribute<'a>) -> Option<String> {
        match &attr.name {
            JSXAttributeName::Identifier(ident) => Some(ident.name.to_string()),
            JSXAttributeName::NamespacedName(ns) => {
                Some(format!("{}:{}", ns.namespace.name, ns.name.name))
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for JsxNoDuplicatePropsVisitor<'a, 'ctx> {
    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement<'a>) {
        let children_count = elem.children.len();
        self.check_jsx_opening_element(&elem.opening_element, children_count);
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
        check_code_with_options(source, JsxNoDuplicatePropsOptions::default())
    }

    fn check_code_with_options(source: &str, options: JsxNoDuplicatePropsOptions) -> Vec<Diagnostic> {
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = JsxNoDuplicateProps::with_options(options);
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(JsxNoDuplicateProps::NAME, "solid/jsx-no-duplicate-props");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(JsxNoDuplicateProps::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_no_duplicate_props_valid() {
        let diagnostics = check_code(r#"const el = <div foo="bar" baz="qux" />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_different_case_props_valid() {
        // Without ignoreCase, different cases are different props
        let diagnostics = check_code(r#"const el = <div foo="bar" Foo="baz" />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_children_only_valid() {
        let diagnostics = check_code(r#"const el = <div>Hello</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_innerhtml_only_valid() {
        let diagnostics = check_code(r#"const el = <div innerHTML="<span>Hi</span>" />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    // ===== Invalid cases =====

    #[test]
    fn test_duplicate_props_invalid() {
        let diagnostics = check_code(r#"const el = <div foo="bar" foo="baz" />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for duplicate props");
        assert!(diagnostics[0].message.contains("Duplicate props"));
    }

    #[test]
    fn test_duplicate_class_invalid() {
        let diagnostics = check_code(r#"const el = <div class="a" class="b" />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for duplicate class");
        assert!(diagnostics[0].message.contains("classList"));
    }

    #[test]
    fn test_duplicate_event_handlers_invalid() {
        // onClick and oncapture:click should be considered duplicates
        let diagnostics = check_code(r#"const el = <div onClick={a} oncapture:click={b} />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for duplicate event handlers");
    }

    #[test]
    fn test_ignore_case_duplicate_invalid() {
        let diagnostics = check_code_with_options(
            r#"const el = <div foo="bar" Foo="baz" />;"#,
            JsxNoDuplicatePropsOptions { ignore_case: true },
        );
        assert!(!diagnostics.is_empty(), "Expected diagnostics for case-insensitive duplicate");
    }

    #[test]
    fn test_children_and_children_prop_invalid() {
        let diagnostics = check_code(r#"const el = <div children="prop">JSX children</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for children conflict");
        assert!(diagnostics[0].message.contains("at the same time is not allowed"));
    }

    #[test]
    fn test_children_and_innerhtml_invalid() {
        let diagnostics = check_code(r#"const el = <div innerHTML="<span>Hi</span>">Hello</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for innerHTML with children");
    }

    #[test]
    fn test_innerhtml_and_textcontent_invalid() {
        let diagnostics = check_code(r#"const el = <div innerHTML="<span>Hi</span>" textContent="Hello" />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for innerHTML with textContent");
    }
}
