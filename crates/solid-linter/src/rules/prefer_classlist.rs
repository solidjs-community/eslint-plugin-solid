//! solid/prefer-classlist
//!
//! Prefer using Solid's classlist prop over classnames helpers.
//! This rule is deprecated but included for parity with the original eslint plugin.

use oxc_ast::ast::{
    Argument, CallExpression, Expression, JSXAttributeItem, JSXAttributeName,
    JSXAttributeValue, JSXElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone)]
pub struct PreferClasslist {
    pub classnames: Vec<String>,
}

impl Default for PreferClasslist {
    fn default() -> Self {
        Self {
            classnames: vec!["cn".into(), "clsx".into(), "classnames".into()],
        }
    }
}

impl RuleMeta for PreferClasslist {
    const NAME: &'static str = "solid/prefer-classlist";
    const CATEGORY: RuleCategory = RuleCategory::BestPractices;
}

impl PreferClasslist {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = PreferClasslistVisitor::new(ctx, self);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct PreferClasslistVisitor<'a, 'ctx, 'rule> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    rule: &'rule PreferClasslist,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx, 'rule> PreferClasslistVisitor<'a, 'ctx, 'rule> {
    fn new(ctx: &'ctx LintContext<'a>, rule: &'rule PreferClasslist) -> Self {
        Self {
            ctx,
            rule,
            diagnostics: Vec::new(),
        }
    }

    fn get_callee_name(expr: &Expression<'a>) -> Option<&'a str> {
        match expr {
            Expression::Identifier(ident) => Some(ident.name.as_str()),
            _ => None,
        }
    }

    fn is_single_object_argument(call: &CallExpression<'a>) -> bool {
        if call.arguments.len() != 1 {
            return false;
        }

        matches!(
            call.arguments.first(),
            Some(Argument::ObjectExpression(_))
        )
    }

    fn check_jsx_element(&mut self, elem: &JSXElement<'a>) {
        for attr in &elem.opening_element.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let JSXAttributeName::Identifier(ident) = &jsx_attr.name {
                    let attr_name = ident.name.as_str();
                    if attr_name != "class" && attr_name != "className" {
                        continue;
                    }

                    if let Some(JSXAttributeValue::ExpressionContainer(container)) =
                        &jsx_attr.value
                    {
                        if let Some(expr) = container.expression.as_expression() {
                            if let Expression::CallExpression(call) = expr {
                                if let Some(callee_name) =
                                    Self::get_callee_name(&call.callee)
                                {
                                    if self.rule.classnames.contains(&callee_name.to_string())
                                        && Self::is_single_object_argument(call)
                                    {
                                        self.diagnostics.push(Diagnostic::warning(
                                            PreferClasslist::NAME,
                                            call.span(),
                                            format!(
                                                "The classlist prop should be used instead of {} to efficiently set classes based on an object.",
                                                callee_name
                                            ),
                                        ));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx, 'rule> Visit<'a> for PreferClasslistVisitor<'a, 'ctx, 'rule> {
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
        let rule = PreferClasslist::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(PreferClasslist::NAME, "solid/prefer-classlist");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(PreferClasslist::CATEGORY, RuleCategory::BestPractices);
    }

    // ===== Valid cases =====

    #[test]
    fn test_classlist_prop_valid() {
        let diagnostics =
            check_code(r#"const el = <div classList={{ active: isActive }} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_static_class_valid() {
        let diagnostics = check_code(r#"const el = <div class="container" />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_cn_with_multiple_args_valid() {
        let diagnostics =
            check_code(r#"const el = <div class={cn("base", { active: isActive })} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for cn with multiple args"
        );
    }

    #[test]
    fn test_clsx_with_string_valid() {
        let diagnostics = check_code(r#"const el = <div class={clsx("container")} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for clsx with string arg"
        );
    }

    #[test]
    fn test_other_attribute_valid() {
        let diagnostics =
            check_code(r#"const el = <div data-class={cn({ active: isActive })} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for non-class attribute"
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_cn_single_object_invalid() {
        let diagnostics =
            check_code(r#"const el = <div class={cn({ active: isActive })} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for cn with single object"
        );
        assert!(diagnostics[0].message.contains("classlist"));
        assert!(diagnostics[0].message.contains("cn"));
    }

    #[test]
    fn test_clsx_single_object_invalid() {
        let diagnostics =
            check_code(r#"const el = <div class={clsx({ active: isActive })} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for clsx with single object"
        );
        assert!(diagnostics[0].message.contains("clsx"));
    }

    #[test]
    fn test_classnames_single_object_invalid() {
        let diagnostics = check_code(
            r#"const el = <div class={classnames({ active: isActive, disabled: isDisabled })} />;"#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for classnames with single object"
        );
        assert!(diagnostics[0].message.contains("classnames"));
    }

    #[test]
    fn test_classname_attr_with_cn_invalid() {
        let diagnostics =
            check_code(r#"const el = <div className={cn({ active: isActive })} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for className with cn"
        );
    }

    #[test]
    fn test_nested_element_invalid() {
        let diagnostics = check_code(
            r#"const el = <div><span class={cn({ highlight: isHighlighted })} /></div>;"#,
        );
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for nested element with cn"
        );
    }
}
