//! solid/style-prop
//!
//! Require CSS properties in style prop to be kebab-cased and valid.
//! Solid uses objects for style props and doesn't auto-append 'px' units.

use oxc_ast::ast::{
    Expression, JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXElement,
    ObjectPropertyKind, Program, PropertyKey,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const LENGTH_PROPERTIES: &[&str] = &[
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "border-width",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-radius",
    "top",
    "right",
    "bottom",
    "left",
    "font-size",
    "line-height",
    "letter-spacing",
    "text-indent",
    "gap",
    "row-gap",
    "column-gap",
    "flex-basis",
    "outline-width",
    "outline-offset",
];

#[derive(Debug, Clone)]
pub struct StyleProp {
    pub style_props: Vec<String>,
    pub allow_string: bool,
}

impl Default for StyleProp {
    fn default() -> Self {
        Self {
            style_props: vec!["style".into()],
            allow_string: false,
        }
    }
}

impl RuleMeta for StyleProp {
    const NAME: &'static str = "solid/style-prop";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl StyleProp {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = StylePropVisitor::new(ctx, self);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

fn to_kebab_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('-');
            }
            result.push(c.to_lowercase().next().unwrap());
        } else {
            result.push(c);
        }
    }
    result
}

fn is_camel_case(s: &str) -> bool {
    s.chars().any(|c| c.is_uppercase())
}

fn is_length_property(name: &str) -> bool {
    let kebab = to_kebab_case(name);
    LENGTH_PROPERTIES.contains(&kebab.as_str())
}

struct StylePropVisitor<'a, 'ctx, 'rule> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    rule: &'rule StyleProp,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx, 'rule> StylePropVisitor<'a, 'ctx, 'rule> {
    fn new(ctx: &'ctx LintContext<'a>, rule: &'rule StyleProp) -> Self {
        Self {
            ctx,
            rule,
            diagnostics: Vec::new(),
        }
    }

    fn check_jsx_element(&mut self, elem: &JSXElement<'a>) {
        for attr in &elem.opening_element.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::Identifier(ident) = &jsx_attr.name {
                    let attr_name = ident.name.as_str();
                    if !self.rule.style_props.contains(&attr_name.to_string()) {
                        continue;
                    }

                    if let Some(value) = &jsx_attr.value {
                        match value {
                            JSXAttributeValue::StringLiteral(lit) => {
                                if !self.rule.allow_string {
                                    self.diagnostics.push(Diagnostic::warning(
                                        StyleProp::NAME,
                                        lit.span(),
                                        "Use an object for the style prop instead of a string.",
                                    ));
                                }
                            }
                            JSXAttributeValue::ExpressionContainer(container) => {
                                if let Some(expr) = container.expression.as_expression() {
                                    self.check_style_expression(expr);
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    fn check_style_expression(&mut self, expr: &Expression<'a>) {
        match expr {
            Expression::StringLiteral(lit) => {
                if !self.rule.allow_string {
                    self.diagnostics.push(Diagnostic::warning(
                        StyleProp::NAME,
                        lit.span(),
                        "Use an object for the style prop instead of a string.",
                    ));
                }
            }
            Expression::TemplateLiteral(lit) => {
                if !self.rule.allow_string {
                    self.diagnostics.push(Diagnostic::warning(
                        StyleProp::NAME,
                        lit.span(),
                        "Use an object for the style prop instead of a string.",
                    ));
                }
            }
            Expression::ObjectExpression(obj) => {
                for prop in &obj.properties {
                    if let ObjectPropertyKind::ObjectProperty(prop) = prop {
                        let prop_name = match &prop.key {
                            PropertyKey::StaticIdentifier(ident) => {
                                Some(ident.name.as_str().to_string())
                            }
                            PropertyKey::StringLiteral(lit) => Some(lit.value.to_string()),
                            _ => None,
                        };

                        if let Some(name) = prop_name {
                            if is_camel_case(&name) {
                                let kebab_name = to_kebab_case(&name);
                                self.diagnostics.push(
                                    Diagnostic::warning(
                                        StyleProp::NAME,
                                        prop.key.span(),
                                        format!(
                                            "Use {} instead of {}.",
                                            kebab_name, name
                                        ),
                                    )
                                    .with_fix(prop.key.span(), format!("\"{}\"", kebab_name)),
                                );
                            }

                            if is_length_property(&name) {
                                if let Expression::NumericLiteral(_) = &prop.value {
                                    self.diagnostics.push(Diagnostic::warning(
                                        StyleProp::NAME,
                                        prop.value.span(),
                                        "This CSS property value should be a string with a unit; Solid does not automatically append a 'px' unit.",
                                    ));
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
}

impl<'a, 'ctx, 'rule> Visit<'a> for StylePropVisitor<'a, 'ctx, 'rule> {
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
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = StyleProp::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(StyleProp::NAME, "solid/style-prop");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(StyleProp::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_kebab_case_valid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ "font-size": "12px" }} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_kebab_case_multiple_valid() {
        let diagnostics = check_code(
            r#"const el = <div style={{ "background-color": "red", "margin-top": "10px" }} />;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_string_value_for_length_valid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ width: "100px" }} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for kebab-case with string value, got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_no_style_prop_valid() {
        let diagnostics = check_code(r#"const el = <div class="container" />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_color_value_numeric_valid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ "z-index": 10 }} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for z-index numeric value"
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_string_style_invalid() {
        let diagnostics = check_code(r#"const el = <div style="color: red" />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for string style"
        );
        assert!(diagnostics[0].message.contains("object"));
    }

    #[test]
    fn test_template_literal_style_invalid() {
        let diagnostics = check_code(r#"const el = <div style={`color: ${color}`} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for template literal style"
        );
        assert!(diagnostics[0].message.contains("object"));
    }

    #[test]
    fn test_camel_case_property_invalid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ fontSize: "12px" }} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for camelCase property"
        );
        assert!(diagnostics[0].message.contains("font-size"));
        assert!(diagnostics[0].message.contains("fontSize"));
    }

    #[test]
    fn test_camel_case_has_fix() {
        let diagnostics =
            check_code(r#"const el = <div style={{ fontSize: "12px" }} />;"#);
        assert!(!diagnostics.is_empty());
        assert!(
            diagnostics[0].fix.is_some(),
            "Expected fix for camelCase property"
        );
        assert!(diagnostics[0]
            .fix
            .as_ref()
            .unwrap()
            .replacement
            .contains("font-size"));
    }

    #[test]
    fn test_numeric_length_value_invalid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ width: 100 }} />;"#);
        assert!(
            diagnostics.len() >= 1,
            "Expected at least 1 diagnostic for numeric length"
        );
        let has_unit_warning = diagnostics.iter().any(|d| d.message.contains("unit"));
        assert!(has_unit_warning, "Expected warning about missing unit");
    }

    #[test]
    fn test_numeric_margin_invalid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ margin: 10 }} />;"#);
        let has_unit_warning = diagnostics.iter().any(|d| d.message.contains("unit"));
        assert!(has_unit_warning, "Expected warning about missing unit for margin");
    }

    #[test]
    fn test_multiple_issues_invalid() {
        let diagnostics =
            check_code(r#"const el = <div style={{ fontSize: 16, marginTop: 20 }} />;"#);
        assert!(
            diagnostics.len() >= 4,
            "Expected at least 4 diagnostics (2 camelCase + 2 numeric units)"
        );
    }

    #[test]
    fn test_nested_element_style_invalid() {
        let diagnostics = check_code(
            r#"const el = <div><span style={{ backgroundColor: "red" }} /></div>;"#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for nested element"
        );
        assert!(diagnostics[0].message.contains("background-color"));
    }
}
