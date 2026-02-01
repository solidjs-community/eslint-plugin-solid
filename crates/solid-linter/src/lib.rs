//! SolidJS linting rules using oxc
//!
//! This crate provides linting rules for SolidJS applications, focusing on
//! reactivity correctness, JSX patterns, and Solid-specific best practices.

pub mod context;
pub mod diagnostic;
pub mod rules;
pub mod utils;
pub mod visitor;

pub use context::LintContext;
pub use diagnostic::Diagnostic;

/// Rule category for organizing rules
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuleCategory {
    /// Rules that prevent bugs
    Correctness,
    /// Rules that prevent possible errors
    Suspicious,
    /// Rules that enforce best practices
    BestPractices,
    /// Rules that enforce style
    Style,
    /// Rules that suggest improvements
    Suggestion,
}

/// Trait for rule metadata
pub trait RuleMeta {
    const NAME: &'static str;
    const CATEGORY: RuleCategory;
}
