//! solid/no-array-handlers
//!
//! Disallow passing arrays as event handlers (type-unsafe).
//! In Solid, passing an array like `[handler, data]` as an event handler is allowed
//! but potentially type-unsafe.

use oxc_ast::ast::{
    JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXElementName,
    JSXExpression, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct NoArrayHandlers;

impl RuleMeta for NoArrayHandlers {
    const NAME: &'static str = "solid/no-array-handlers";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl NoArrayHandlers {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = NoArrayHandlersVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

struct NoArrayHandlersVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a, 'ctx> NoArrayHandlersVisitor<'a, 'ctx> {
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

    fn is_event_handler_prop(attr: &JSXAttributeItem<'_>) -> bool {
        match attr {
            JSXAttributeItem::Attribute(jsx_attr) => match &jsx_attr.name {
                JSXAttributeName::Identifier(ident) => {
                    let name = ident.name.as_str();
                    if name.len() < 3 {
                        return false;
                    }
                    if !name.starts_with("on") {
                        return false;
                    }
                    name.chars().nth(2).map(|c| c.is_uppercase()).unwrap_or(false)
                }
                JSXAttributeName::NamespacedName(ns) => {
                    ns.namespace.name.as_str() == "on"
                }
            },
            JSXAttributeItem::SpreadAttribute(_) => false,
        }
    }

    fn check_jsx_opening_element(&mut self, node: &JSXOpeningElement<'a>) {
        if !Self::is_dom_element(&node.name) {
            return;
        }

        for attr in &node.attributes {
            if !Self::is_event_handler_prop(attr) {
                continue;
            }

            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                if let Some(JSXAttributeValue::ExpressionContainer(container)) = &jsx_attr.value {
                    if let JSXExpression::ArrayExpression(arr) = &container.expression {
                        self.diagnostics.push(Diagnostic::warning(
                            NoArrayHandlers::NAME,
                            arr.span(),
                            "Passing an array as an event handler is potentially type-unsafe.",
                        ));
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for NoArrayHandlersVisitor<'a, 'ctx> {
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
        let rule = NoArrayHandlers::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(NoArrayHandlers::NAME, "solid/no-array-handlers");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(NoArrayHandlers::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_function_handler_valid() {
        let diagnostics = check_code(r#"const el = <button onClick={handleClick} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_arrow_function_handler_valid() {
        let diagnostics = check_code(r#"const el = <button onClick={() => console.log("clicked")} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_inline_function_with_arg_valid() {
        let diagnostics = check_code(r#"const el = <button onClick={(e) => handleClick(e, data)} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_component_with_array_handler_valid() {
        let diagnostics = check_code(r#"const el = <Button onClick={[handler, data]} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for component"
        );
    }

    #[test]
    fn test_array_in_non_handler_prop_valid() {
        let diagnostics = check_code(r#"const el = <div data-items={[1, 2, 3]} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for non-handler prop"
        );
    }

    #[test]
    fn test_namespaced_attr_handler_valid() {
        let diagnostics = check_code(r#"const el = <button on:click={handleClick} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for namespaced handler"
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_array_handler_onclick_invalid() {
        let diagnostics = check_code(r#"const el = <button onClick={[handler, data]} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for array handler"
        );
        assert!(diagnostics[0].message.contains("array"));
        assert!(diagnostics[0].message.contains("type-unsafe"));
    }

    #[test]
    fn test_array_handler_onmousedown_invalid() {
        let diagnostics = check_code(r#"const el = <div onMouseDown={[handleDrag, position]} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for array handler on onMouseDown"
        );
    }

    #[test]
    fn test_array_handler_onkeydown_invalid() {
        let diagnostics = check_code(r#"const el = <input onKeyDown={[handleKey, config]} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for array handler on onKeyDown"
        );
    }

    #[test]
    fn test_array_handler_onsubmit_invalid() {
        let diagnostics = check_code(r#"const el = <form onSubmit={[handleSubmit, formData]} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for array handler on onSubmit"
        );
    }

    #[test]
    fn test_multiple_array_handlers_invalid() {
        let diagnostics = check_code(
            r#"const el = <button onClick={[click, 1]} onMouseOver={[hover, 2]} />;"#,
        );
        assert_eq!(
            diagnostics.len(),
            2,
            "Expected 2 diagnostics for multiple array handlers"
        );
    }

    #[test]
    fn test_namespaced_array_handler_invalid() {
        let diagnostics = check_code(r#"const el = <button on:click={[handler, data]} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for namespaced array handler"
        );
    }
}
