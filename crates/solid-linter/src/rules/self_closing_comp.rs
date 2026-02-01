//! solid/self-closing-comp
//!
//! Disallow extra closing tags for components without children.
//! Enforces that empty components and elements use self-closing syntax when appropriate.

use oxc_ast::ast::{
    JSXChild, JSXElement, JSXElementName, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::utils::is_dom_element_name;
use crate::{RuleCategory, RuleMeta};

/// Void HTML elements that are always self-closing
const VOID_ELEMENTS: &[&str] = &[
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source",
    "track", "wbr",
];

/// Which components should be self-closing
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ComponentOption {
    #[default]
    All,
    None,
}

/// Which HTML elements should be self-closing
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum HtmlOption {
    #[default]
    All,
    Void,
    None,
}

/// Options for the self-closing-comp rule
#[derive(Debug, Clone, Default)]
pub struct SelfClosingCompOptions {
    /// Which Solid components should be self-closing when possible
    pub component: ComponentOption,
    /// Which native elements should be self-closing when possible
    pub html: HtmlOption,
}

/// The self-closing-comp rule
#[derive(Debug, Clone, Default)]
pub struct SelfClosingComp {
    options: SelfClosingCompOptions,
}

impl RuleMeta for SelfClosingComp {
    const NAME: &'static str = "solid/self-closing-comp";
    const CATEGORY: RuleCategory = RuleCategory::Style;
}

impl SelfClosingComp {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_options(options: SelfClosingCompOptions) -> Self {
        Self { options }
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = SelfClosingCompVisitor::new(ctx, &self.options);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

/// Check if a name is a void HTML element
fn is_void_element(name: &str) -> bool {
    VOID_ELEMENTS.contains(&name)
}

/// Check if an element name represents a component (uppercase first letter or member expression)
fn is_component(opening: &JSXOpeningElement) -> bool {
    match &opening.name {
        JSXElementName::Identifier(ident) => {
            // Components start with uppercase letter
            ident.name.chars().next().map(|c| c.is_ascii_uppercase()).unwrap_or(false)
        }
        JSXElementName::NamespacedName(_) => {
            // Namespaced names like foo:bar are not components
            false
        }
        JSXElementName::MemberExpression(_) => {
            // Member expressions like Foo.Bar are always components
            true
        }
        // IdentifierReference and ThisExpression are treated as components
        JSXElementName::IdentifierReference(_) | JSXElementName::ThisExpression(_) => true,
    }
}

/// Get the tag name for an opening element (if it's a simple identifier)
fn get_tag_name<'a>(opening: &'a JSXOpeningElement<'a>) -> Option<&'a str> {
    match &opening.name {
        JSXElementName::Identifier(ident) => Some(ident.name.as_str()),
        _ => None,
    }
}

/// Check if children are empty (no children or only whitespace with newlines)
fn children_is_empty(children: &oxc_allocator::Vec<'_, JSXChild<'_>>) -> bool {
    children.is_empty()
}

/// Check if children is only multiline whitespace (whitespace containing newlines)
fn children_is_multiline_spaces(children: &oxc_allocator::Vec<'_, JSXChild<'_>>) -> bool {
    if children.len() != 1 {
        return false;
    }

    if let JSXChild::Text(text) = &children[0] {
        let value = text.value.as_str();
        // Contains newline and is all whitespace
        value.contains('\n') && value.chars().all(|c| c.is_whitespace())
    } else {
        false
    }
}

/// Visitor for detecting self-closing issues
struct SelfClosingCompVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    options: &'ctx SelfClosingCompOptions,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> SelfClosingCompVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>, options: &'ctx SelfClosingCompOptions) -> Self {
        Self {
            ctx,
            options,
            diagnostics: Vec::new(),
        }
    }

    fn should_be_self_closed(&self, opening: &JSXOpeningElement) -> bool {
        if is_component(opening) {
            // Component
            self.options.component == ComponentOption::All
        } else if let Some(name) = get_tag_name(opening) {
            if is_dom_element_name(name) {
                // DOM element
                match self.options.html {
                    HtmlOption::All => true,
                    HtmlOption::Void => is_void_element(name),
                    HtmlOption::None => false,
                }
            } else {
                true
            }
        } else {
            true
        }
    }

    fn check_jsx_element(&mut self, elem: &JSXElement<'a>) {
        let opening = &elem.opening_element;
        // An element is self-closing if it has no closing element
        let is_self_closing = elem.closing_element.is_none();
        let can_self_close =
            children_is_empty(&elem.children) || children_is_multiline_spaces(&elem.children);

        if can_self_close {
            let should_self_close = self.should_be_self_closed(opening);

            if should_self_close && !is_self_closing {
                // Should be self-closing but isn't
                self.diagnostics.push(
                    Diagnostic::warning(
                        SelfClosingComp::NAME,
                        opening.span(),
                        "Empty components are self-closing.",
                    )
                    .with_help("Use self-closing syntax: `<Component />` instead of `<Component></Component>`."),
                );
            } else if !should_self_close && is_self_closing {
                // Should not be self-closing but is
                self.diagnostics.push(
                    Diagnostic::warning(
                        SelfClosingComp::NAME,
                        opening.span(),
                        "This element should not be self-closing.",
                    )
                    .with_help("Use explicit closing tag syntax."),
                );
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for SelfClosingCompVisitor<'a, 'ctx> {
    fn visit_jsx_element(&mut self, elem: &JSXElement<'a>) {
        self.check_jsx_element(elem);
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
        check_code_with_options(source, SelfClosingCompOptions::default())
    }

    fn check_code_with_options(source: &str, options: SelfClosingCompOptions) -> Vec<Diagnostic> {
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = SelfClosingComp::with_options(options);
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(SelfClosingComp::NAME, "solid/self-closing-comp");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(SelfClosingComp::CATEGORY, RuleCategory::Style);
    }

    // ===== Valid cases =====

    #[test]
    fn test_self_closing_component_valid() {
        let diagnostics = check_code(r#"const el = <Component />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_self_closing_div_valid() {
        let diagnostics = check_code(r#"const el = <div />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_component_with_children_valid() {
        let diagnostics = check_code(r#"const el = <Component>Hello</Component>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_div_with_children_valid() {
        let diagnostics = check_code(r#"const el = <div>Hello</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_void_element_self_closing_valid() {
        let diagnostics = check_code(r#"const el = <input />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_member_expression_self_closing_valid() {
        let diagnostics = check_code(r#"const el = <Foo.Bar />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_html_none_not_self_closing_valid() {
        let diagnostics = check_code_with_options(
            r#"const el = <div></div>;"#,
            SelfClosingCompOptions {
                component: ComponentOption::All,
                html: HtmlOption::None,
            },
        );
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_component_none_not_self_closing_valid() {
        let diagnostics = check_code_with_options(
            r#"const el = <Component></Component>;"#,
            SelfClosingCompOptions {
                component: ComponentOption::None,
                html: HtmlOption::All,
            },
        );
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    // ===== Invalid cases =====

    #[test]
    fn test_empty_component_not_self_closing_invalid() {
        let diagnostics = check_code(r#"const el = <Component></Component>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for non-self-closing empty component");
        assert!(diagnostics[0].message.contains("self-closing"));
    }

    #[test]
    fn test_empty_div_not_self_closing_invalid() {
        let diagnostics = check_code(r#"const el = <div></div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for non-self-closing empty div");
    }

    #[test]
    fn test_multiline_whitespace_not_self_closing_invalid() {
        let diagnostics = check_code(
            r#"const el = <Component>
            </Component>;"#,
        );
        assert!(!diagnostics.is_empty(), "Expected diagnostics for multiline whitespace");
    }

    #[test]
    fn test_member_expression_not_self_closing_invalid() {
        let diagnostics = check_code(r#"const el = <Foo.Bar></Foo.Bar>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for non-self-closing member expression");
    }

    #[test]
    fn test_html_none_self_closing_invalid() {
        let diagnostics = check_code_with_options(
            r#"const el = <div />;"#,
            SelfClosingCompOptions {
                component: ComponentOption::All,
                html: HtmlOption::None,
            },
        );
        assert!(!diagnostics.is_empty(), "Expected diagnostics for self-closing when html=none");
        assert!(diagnostics[0].message.contains("should not be self-closing"));
    }

    #[test]
    fn test_component_none_self_closing_invalid() {
        let diagnostics = check_code_with_options(
            r#"const el = <Component />;"#,
            SelfClosingCompOptions {
                component: ComponentOption::None,
                html: HtmlOption::All,
            },
        );
        assert!(!diagnostics.is_empty(), "Expected diagnostics for self-closing when component=none");
    }

    #[test]
    fn test_html_void_non_void_self_closing_invalid() {
        // Non-void elements should not self-close when html=void
        let diagnostics = check_code_with_options(
            r#"const el = <div />;"#,
            SelfClosingCompOptions {
                component: ComponentOption::All,
                html: HtmlOption::Void,
            },
        );
        assert!(!diagnostics.is_empty(), "Expected diagnostics for non-void element self-closing when html=void");
    }

    #[test]
    fn test_html_void_void_self_closing_valid() {
        // Void elements can self-close when html=void
        let diagnostics = check_code_with_options(
            r#"const el = <input />;"#,
            SelfClosingCompOptions {
                component: ComponentOption::All,
                html: HtmlOption::Void,
            },
        );
        assert!(diagnostics.is_empty(), "Expected no diagnostics for void element");
    }
}
