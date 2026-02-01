//! solid/jsx-uses-vars
//!
//! This rule marks variables used in JSX as used.
//! In ESLint, this prevents false positives from no-unused-vars.
//! In the Rust linter, this is implemented as a no-op since we don't
//! have integration with a separate unused-vars rule.

use oxc_ast::ast::Program;

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::{RuleCategory, RuleMeta};

#[derive(Debug, Clone, Default)]
pub struct JsxUsesVars;

impl RuleMeta for JsxUsesVars {
    const NAME: &'static str = "solid/jsx-uses-vars";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

impl JsxUsesVars {
    pub fn new() -> Self {
        Self
    }

    pub fn check_program<'a>(
        &self,
        _program: &Program<'a>,
        _ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        Vec::new()
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
        let rule = JsxUsesVars::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(JsxUsesVars::NAME, "solid/jsx-uses-vars");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(JsxUsesVars::CATEGORY, RuleCategory::Correctness);
    }

    #[test]
    fn test_no_diagnostics() {
        let diagnostics = check_code(
            r#"import MyComponent from "./MyComponent";
const el = <MyComponent />;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "jsx-uses-vars should not produce diagnostics"
        );
    }

    #[test]
    fn test_component_used_in_jsx() {
        let diagnostics = check_code(
            r#"import { Show, For } from "solid-js";
const el = <Show when={true}><For each={items}>{(item) => <div>{item}</div>}</For></Show>;"#,
        );
        assert!(
            diagnostics.is_empty(),
            "jsx-uses-vars should not produce diagnostics"
        );
    }
}
