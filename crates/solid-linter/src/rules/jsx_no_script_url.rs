//! solid/jsx-no-script-url
//!
//! Disallow javascript: URLs in JSX attributes.
//! This rule detects javascript: URLs which can be used for XSS attacks,
//! including obfuscated variants with control characters.

use oxc_ast::ast::{
    Expression, JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXOpeningElement, Program,
    StringLiteral,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};
use regex::Regex;
use std::sync::LazyLock;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

static JAVASCRIPT_PROTOCOL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)^[\x00-\x1f ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:"#).unwrap()
});

/// The jsx-no-script-url rule
#[derive(Debug, Clone, Default)]
pub struct JsxNoScriptUrl;

impl RuleMeta for JsxNoScriptUrl {
    const NAME: &'static str = "solid/jsx-no-script-url";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl JsxNoScriptUrl {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = JsxNoScriptUrlVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct JsxNoScriptUrlVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> JsxNoScriptUrlVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    fn is_javascript_url(value: &str) -> bool {
        JAVASCRIPT_PROTOCOL.is_match(value)
    }

    fn report(&mut self, span: Span) {
        self.diagnostics.push(Diagnostic::warning(
            JsxNoScriptUrl::NAME,
            span,
            "For security, don't use javascript: URLs. Use event handlers instead if you can.",
        ));
    }

    fn check_string_literal(&mut self, lit: &StringLiteral) {
        if Self::is_javascript_url(&lit.value) {
            self.report(lit.span());
        }
    }

    fn check_jsx_opening_element(&mut self, node: &JSXOpeningElement<'a>) {
        for attr in &node.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::Identifier(_) = &jsx_attr.name {
                    if let Some(value) = &jsx_attr.value {
                        match value {
                            JSXAttributeValue::StringLiteral(lit) => {
                                self.check_string_literal(lit);
                            }
                            JSXAttributeValue::ExpressionContainer(container) => {
                                if let Some(expr) = container.expression.as_expression() {
                                    self.check_expression(expr);
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    fn check_expression(&mut self, expr: &Expression<'a>) {
        match expr {
            Expression::StringLiteral(lit) => {
                self.check_string_literal(lit);
            }
            Expression::TemplateLiteral(template) => {
                if template.expressions.is_empty() {
                    let value: String = template.quasis.iter().map(|q| q.value.raw.as_str()).collect();
                    if Self::is_javascript_url(&value) {
                        self.report(template.span());
                    }
                }
            }
            Expression::ConditionalExpression(cond) => {
                self.check_expression(&cond.consequent);
                self.check_expression(&cond.alternate);
            }
            Expression::LogicalExpression(logical) => {
                self.check_expression(&logical.right);
            }
            _ => {}
        }
    }
}

impl<'a, 'ctx> Visit<'a> for JsxNoScriptUrlVisitor<'a, 'ctx> {
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
        let rule = JsxNoScriptUrl::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(JsxNoScriptUrl::NAME, "solid/jsx-no-script-url");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(JsxNoScriptUrl::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_normal_href_valid() {
        let diagnostics = check_code(r#"const el = <a href="https://example.com">Link</a>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_onclick_handler_valid() {
        let diagnostics = check_code(r#"const el = <a onClick={handleClick}>Click me</a>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_relative_url_valid() {
        let diagnostics = check_code(r#"const el = <a href="/path/to/page">Link</a>;"#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_hash_url_valid() {
        let diagnostics = check_code(r##"const el = <a href="#">Link</a>;"##);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    // ===== Invalid cases =====

    #[test]
    fn test_javascript_url_invalid() {
        let diagnostics = check_code(r#"const el = <a href="javascript:void(0)">Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for javascript: URL");
        assert!(diagnostics[0].message.contains("javascript:"));
    }

    #[test]
    fn test_javascript_url_uppercase_invalid() {
        let diagnostics = check_code(r#"const el = <a href="JAVASCRIPT:void(0)">Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for JAVASCRIPT: URL");
    }

    #[test]
    fn test_javascript_url_mixed_case_invalid() {
        let diagnostics = check_code(r#"const el = <a href="JavaScript:alert(1)">Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for JavaScript: URL");
    }

    #[test]
    fn test_javascript_url_with_leading_space_invalid() {
        let diagnostics = check_code(r#"const el = <a href=" javascript:void(0)">Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for javascript: URL with leading space");
    }

    #[test]
    fn test_javascript_url_expression_invalid() {
        let diagnostics = check_code(r#"const el = <a href={"javascript:void(0)"}>Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for javascript: URL in expression");
    }

    #[test]
    fn test_javascript_url_template_literal_invalid() {
        let diagnostics = check_code(r#"const el = <a href={`javascript:void(0)`}>Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for javascript: URL in template literal");
    }

    #[test]
    fn test_javascript_url_conditional_invalid() {
        let diagnostics = check_code(r#"const el = <a href={foo ? "javascript:void(0)" : "/safe"}>Link</a>;"#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for javascript: URL in conditional");
    }
}
