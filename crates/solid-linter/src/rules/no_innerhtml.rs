//! solid/no-innerhtml
//!
//! Disallow usage of innerHTML attribute which can lead to XSS vulnerabilities.
//! This rule warns about the use of innerHTML and suggests safer alternatives.

use oxc_ast::ast::{
    Expression, JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

/// Options for the no-innerhtml rule
#[derive(Debug, Clone)]
pub struct NoInnerhtml {
    allow_static: bool,
}

impl Default for NoInnerhtml {
    fn default() -> Self {
        Self { allow_static: true }
    }
}

impl RuleMeta for NoInnerhtml {
    const NAME: &'static str = "solid/no-innerhtml";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoInnerhtml {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_allow_static(mut self, allow_static: bool) -> Self {
        self.allow_static = allow_static;
        self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoInnerhtmlVisitor::new(ctx, self.allow_static);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoInnerhtmlVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    allow_static: bool,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> NoInnerhtmlVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>, allow_static: bool) -> Self {
        Self {
            ctx,
            allow_static,
            diagnostics: Vec::new(),
        }
    }

    fn is_static_value(value: &JSXAttributeValue<'a>) -> bool {
        match value {
            JSXAttributeValue::StringLiteral(_) => true,
            JSXAttributeValue::ExpressionContainer(container) => {
                if let Some(expr) = container.expression.as_expression() {
                    Self::is_static_expression(expr)
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    fn is_static_expression(expr: &Expression) -> bool {
        match expr {
            Expression::StringLiteral(_) => true,
            Expression::TemplateLiteral(template) => template.expressions.is_empty(),
            _ => false,
        }
    }

    fn check_jsx_opening_element(&mut self, node: &JSXOpeningElement<'a>, children_count: usize) {
        let mut innerhtml_span: Option<Span> = None;
        let mut has_dangerously_set_inner_html = false;
        let mut dangerously_set_span: Option<Span> = None;
        let mut innerhtml_is_static = false;

        for attr in &node.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::Identifier(ident) = &jsx_attr.name {
                    let name = ident.name.as_str();

                    if name == "innerHTML" {
                        innerhtml_span = Some(jsx_attr.span());
                        if let Some(value) = &jsx_attr.value {
                            innerhtml_is_static = Self::is_static_value(value);
                        }
                    } else if name == "dangerouslySetInnerHTML" {
                        has_dangerously_set_inner_html = true;
                        dangerously_set_span = Some(jsx_attr.span());
                    }
                }
            }
        }

        if has_dangerously_set_inner_html {
            if let Some(span) = dangerously_set_span {
                self.diagnostics.push(
                    Diagnostic::warning(
                        NoInnerhtml::NAME,
                        span,
                        "The dangerouslySetInnerHTML prop is not supported; use innerHTML instead.",
                    )
                    .with_help("Replace dangerouslySetInnerHTML with innerHTML"),
                );
            }
        }

        if let Some(span) = innerhtml_span {
            if children_count > 0 {
                self.diagnostics.push(Diagnostic::warning(
                    NoInnerhtml::NAME,
                    span,
                    "The innerHTML attribute should not be used on an element with child elements; they will be overwritten.",
                ));
            } else if !self.allow_static || !innerhtml_is_static {
                self.diagnostics.push(Diagnostic::warning(
                    NoInnerhtml::NAME,
                    span,
                    "The innerHTML attribute is dangerous; passing unsanitized input can lead to security vulnerabilities.",
                ));
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoInnerhtmlVisitor<'a, 'ctx> {
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
        check_code_with_options(source, true)
    }

    fn check_code_with_options(source: &str, allow_static: bool) -> Vec<Diagnostic> {
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = NoInnerhtml::new().with_allow_static(allow_static);
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoInnerhtml::NAME, "solid/no-innerhtml");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoInnerhtml::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases (with allow_static: true) =====

    #[test]
    fn test_static_innerhtml_valid() {
        let diagnostics = check_code(r#"const el = <div innerHTML="<b>Hello</b>" />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_static_innerhtml_expression_valid() {
        let diagnostics = check_code(r#"const el = <div innerHTML={"<b>Hello</b>"} />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_static_innerhtml_template_valid() {
        let diagnostics = check_code(r#"const el = <div innerHTML={`<b>Hello</b>`} />;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_no_innerhtml_valid() {
        let diagnostics = check_code(r#"const el = <div>Hello</div>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    // ===== Invalid cases =====

    #[test]
    fn test_dynamic_innerhtml_invalid() {
        let diagnostics = check_code(r#"const el = <div innerHTML={userInput} />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for dynamic innerHTML");
        assert!(diagnostics[0].message.contains("dangerous"));
    }

    #[test]
    fn test_dangerously_set_inner_html_invalid() {
        let diagnostics = check_code(r#"const el = <div dangerouslySetInnerHTML={{ __html: html }} />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for dangerouslySetInnerHTML");
        assert!(diagnostics[0].message.contains("dangerouslySetInnerHTML"));
    }

    #[test]
    fn test_innerhtml_with_children_invalid() {
        let diagnostics = check_code(r#"const el = <div innerHTML="<b>Bold</b>">Text</div>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for innerHTML with children");
        assert!(diagnostics[0].message.contains("child elements"));
    }

    #[test]
    fn test_static_innerhtml_disallowed_invalid() {
        let diagnostics = check_code_with_options(r#"const el = <div innerHTML="<b>Hello</b>" />;"#, false);
        assert!(!diagnostics.is_empty(), "Expected diagnostics when allow_static is false");
    }

    #[test]
    fn test_dynamic_template_literal_invalid() {
        let diagnostics = check_code(r#"const el = <div innerHTML={`<b>${text}</b>`} />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for dynamic template literal");
    }

    #[test]
    fn test_function_call_innerhtml_invalid() {
        let diagnostics = check_code(r#"const el = <div innerHTML={sanitize(userInput)} />;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for function call innerHTML");
    }
}
