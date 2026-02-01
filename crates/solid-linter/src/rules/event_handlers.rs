//! solid/event-handlers
//!
//! Enforces consistent naming for DOM event handlers.
//! Warns on ambiguous casing and nonstandard event names.

use oxc_ast::ast::{
    JSXAttribute, JSXAttributeItem, JSXAttributeName, JSXElementName, JSXOpeningElement, Program,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::GetSpan;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

const COMMON_EVENTS: &[&str] = &[
    "onAnimationEnd",
    "onAnimationIteration",
    "onAnimationStart",
    "onBeforeInput",
    "onBlur",
    "onChange",
    "onClick",
    "onContextMenu",
    "onCopy",
    "onCut",
    "onDblClick",
    "onDrag",
    "onDragEnd",
    "onDragEnter",
    "onDragExit",
    "onDragLeave",
    "onDragOver",
    "onDragStart",
    "onDrop",
    "onError",
    "onFocus",
    "onFocusIn",
    "onFocusOut",
    "onGotPointerCapture",
    "onInput",
    "onInvalid",
    "onKeyDown",
    "onKeyPress",
    "onKeyUp",
    "onLoad",
    "onLostPointerCapture",
    "onMouseDown",
    "onMouseEnter",
    "onMouseLeave",
    "onMouseMove",
    "onMouseOut",
    "onMouseOver",
    "onMouseUp",
    "onPaste",
    "onPointerCancel",
    "onPointerDown",
    "onPointerEnter",
    "onPointerLeave",
    "onPointerMove",
    "onPointerOut",
    "onPointerOver",
    "onPointerUp",
    "onReset",
    "onScroll",
    "onSelect",
    "onSubmit",
    "onToggle",
    "onTouchCancel",
    "onTouchEnd",
    "onTouchMove",
    "onTouchStart",
    "onTransitionEnd",
    "onWheel",
];

/// Options for the event-handlers rule
#[derive(Debug, Clone, Default)]
pub struct EventHandlersOptions {
    pub ignore_case: bool,
}

/// The event-handlers rule
#[derive(Debug, Clone, Default)]
pub struct EventHandlers {
    ignore_case: bool,
}

impl RuleMeta for EventHandlers {
    const NAME: &'static str = "solid/event-handlers";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl EventHandlers {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_options(options: EventHandlersOptions) -> Self {
        Self {
            ignore_case: options.ignore_case,
        }
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = EventHandlersVisitor::new(ctx, self.ignore_case);
        visitor.visit_program(program);
        visitor.diagnostics
    }
}

/// Visitor for detecting event handler issues
struct EventHandlersVisitor<'a, 'ctx> {
    #[allow(dead_code)]
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
    ignore_case: bool,
}

impl<'a, 'ctx> EventHandlersVisitor<'a, 'ctx> {
    fn new(ctx: &'ctx LintContext<'a>, ignore_case: bool) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            ignore_case,
        }
    }

    /// Check if element is a DOM element (lowercase name)
    fn is_dom_element(element: &JSXOpeningElement<'_>) -> bool {
        match &element.name {
            JSXElementName::Identifier(ident) => {
                let name = ident.name.as_str();
                // DOM elements are lowercase
                name.chars()
                    .next()
                    .map(|c| c.is_lowercase())
                    .unwrap_or(false)
            }
            _ => false,
        }
    }

    /// Check if a prop name is a namespaced prop (on:, oncapture:, attr:, etc.)
    fn is_namespaced_prop(attr: &JSXAttribute<'_>) -> bool {
        matches!(&attr.name, JSXAttributeName::NamespacedName(_))
    }

    /// Check if a prop name starts with "on" followed by a letter
    fn is_event_handler_prop(name: &str) -> bool {
        if name.len() < 3 {
            return false;
        }
        if !name.starts_with("on") {
            return false;
        }
        // The character after "on" must be a letter
        name.chars().nth(2).map(|c| c.is_alphabetic()).unwrap_or(false)
    }

    /// Find the matching common event for a given prop name
    fn find_common_event(name: &str) -> Option<&'static str> {
        let lower = name.to_lowercase();
        COMMON_EVENTS
            .iter()
            .find(|event| event.to_lowercase() == lower)
            .copied()
    }

    /// Check if the prop is all lowercase (ambiguous)
    fn is_all_lowercase(name: &str) -> bool {
        // Skip the "on" prefix and check if the rest is lowercase
        name[2..].chars().all(|c| c.is_lowercase())
    }

    /// Check for nonstandard event names
    fn check_nonstandard_event(name: &str) -> Option<&'static str> {
        let lower = name.to_lowercase();
        // ondoubleclick -> onDblClick
        if lower == "ondoubleclick" {
            return Some("onDblClick");
        }
        None
    }

    fn check_jsx_opening_element(&mut self, element: &JSXOpeningElement<'a>) {
        // Only check DOM elements
        if !Self::is_dom_element(element) {
            return;
        }

        for attr in &element.attributes {
            if let JSXAttributeItem::Attribute(jsx_attr) = attr {
                // Skip namespaced props
                if Self::is_namespaced_prop(jsx_attr) {
                    continue;
                }

                let name = match &jsx_attr.name {
                    JSXAttributeName::Identifier(ident) => ident.name.as_str(),
                    _ => continue,
                };

                // Only check props that look like event handlers
                if !Self::is_event_handler_prop(name) {
                    continue;
                }

                // Check for nonstandard event name
                if let Some(fixed_name) = Self::check_nonstandard_event(name) {
                    self.diagnostics.push(Diagnostic::warning(
                        EventHandlers::NAME,
                        jsx_attr.span(),
                        format!(
                            "The {} prop should be renamed to {} for readability.",
                            name, fixed_name
                        ),
                    ));
                    continue;
                }

                // Check if it's a known common event
                if let Some(common_event) = Self::find_common_event(name) {
                    // Check for ambiguous casing (all lowercase)
                    if !self.ignore_case && Self::is_all_lowercase(name) {
                        self.diagnostics.push(Diagnostic::warning(
                            EventHandlers::NAME,
                            jsx_attr.span(),
                            format!(
                                "The {} prop is ambiguous. If it is an event handler, change it to {}. If it is an attribute, change it to attr:{}.",
                                name, common_event, name
                            ),
                        ));
                    } else if name != common_event && !self.ignore_case {
                        // Wrong capitalization
                        self.diagnostics.push(Diagnostic::warning(
                            EventHandlers::NAME,
                            jsx_attr.span(),
                            format!(
                                "The {} prop should be renamed to {} for readability.",
                                name, common_event
                            ),
                        ));
                    }
                }
            }
        }
    }
}

impl<'a, 'ctx> Visit<'a> for EventHandlersVisitor<'a, 'ctx> {
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
        check_code_with_options(source, EventHandlersOptions::default())
    }

    fn check_code_with_options(source: &str, options: EventHandlersOptions) -> Vec<Diagnostic> {
        let allocator = Allocator::default();
        let source_type = SourceType::default().with_module(true).with_jsx(true);

        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();

        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }

        let ctx = LintContext::new(source, source_type);
        let rule = EventHandlers::with_options(options);
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(EventHandlers::NAME, "solid/event-handlers");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(EventHandlers::CATEGORY, RuleCategory::Correctness);
    }

    // ===== Valid cases =====

    #[test]
    fn test_correct_event_handler_valid() {
        let diagnostics = check_code(r#"const el = <div onClick={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_component_prop_valid() {
        // Components (capitalized) don't apply to this rule
        let diagnostics = check_code(r#"const el = <Button onclick={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for component but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_namespaced_event_valid() {
        // Namespaced props are skipped
        let diagnostics = check_code(r#"const el = <div on:click={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for namespaced prop but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_oncapture_valid() {
        let diagnostics = check_code(r#"const el = <div oncapture:click={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for oncapture but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_attr_namespace_valid() {
        let diagnostics = check_code(r#"const el = <div attr:onclick={handler} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics for attr: namespace but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_multiple_correct_events_valid() {
        let diagnostics =
            check_code(r#"const el = <div onClick={a} onMouseOver={b} onKeyDown={c} />;"#);
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics but got: {:?}",
            diagnostics
        );
    }

    #[test]
    fn test_ignore_case_option_valid() {
        let diagnostics = check_code_with_options(
            r#"const el = <div onclick={handler} />;"#,
            EventHandlersOptions { ignore_case: true },
        );
        assert!(
            diagnostics.is_empty(),
            "Expected no diagnostics with ignore_case but got: {:?}",
            diagnostics
        );
    }

    // ===== Invalid cases =====

    #[test]
    fn test_lowercase_onclick_invalid() {
        let diagnostics = check_code(r#"const el = <div onclick={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for lowercase onclick"
        );
        assert!(diagnostics[0].message.contains("ambiguous"));
        assert!(diagnostics[0].message.contains("onClick"));
    }

    #[test]
    fn test_lowercase_onmouseover_invalid() {
        let diagnostics = check_code(r#"const el = <div onmouseover={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for lowercase onmouseover"
        );
        assert!(diagnostics[0].message.contains("onMouseOver"));
    }

    #[test]
    fn test_ondoubleclick_invalid() {
        let diagnostics = check_code(r#"const el = <div ondoubleclick={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for ondoubleclick"
        );
        assert!(diagnostics[0].message.contains("onDblClick"));
    }

    #[test]
    fn test_wrong_capitalization_invalid() {
        let diagnostics = check_code(r#"const el = <div onCLICK={handler} />;"#);
        // onCLICK should be onClick
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for wrong capitalization"
        );
        assert!(diagnostics[0].message.contains("onClick"));
    }

    #[test]
    fn test_onkeydown_lowercase_invalid() {
        let diagnostics = check_code(r#"const el = <div onkeydown={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for lowercase onkeydown"
        );
        assert!(diagnostics[0].message.contains("onKeyDown"));
    }

    #[test]
    fn test_multiple_issues_invalid() {
        let diagnostics =
            check_code(r#"const el = <div onclick={a} onmouseover={b} ondoubleclick={c} />;"#);
        assert_eq!(diagnostics.len(), 3, "Expected 3 diagnostics");
    }

    #[test]
    fn test_onblur_lowercase_invalid() {
        let diagnostics = check_code(r#"const el = <input onblur={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for lowercase onblur"
        );
        assert!(diagnostics[0].message.contains("onBlur"));
    }

    #[test]
    fn test_onsubmit_lowercase_invalid() {
        let diagnostics = check_code(r#"const el = <form onsubmit={handler} />;"#);
        assert!(
            !diagnostics.is_empty(),
            "Expected diagnostics for lowercase onsubmit"
        );
        assert!(diagnostics[0].message.contains("onSubmit"));
    }
}
