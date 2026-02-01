//! Diagnostic types for rule violations

use oxc_span::Span;

/// A diagnostic message from a rule
#[derive(Debug, Clone)]
pub struct Diagnostic {
    /// Rule name that produced this diagnostic
    pub rule: &'static str,
    /// Span of the problematic code
    pub span: Span,
    /// Primary message
    pub message: String,
    /// Severity level
    pub severity: Severity,
    /// Optional help text
    pub help: Option<String>,
    /// Optional labels for additional context
    pub labels: Vec<Label>,
    /// Optional fix
    pub fix: Option<Fix>,
}

/// Severity of a diagnostic
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Warning,
    Error,
}

/// A labeled span for additional context
#[derive(Debug, Clone)]
pub struct Label {
    pub span: Span,
    pub message: String,
}

/// A suggested fix
#[derive(Debug, Clone)]
pub struct Fix {
    pub span: Span,
    pub replacement: String,
}

impl Diagnostic {
    /// Create a warning diagnostic
    pub fn warning(rule: &'static str, span: Span, message: impl Into<String>) -> Self {
        Self {
            rule,
            span,
            message: message.into(),
            severity: Severity::Warning,
            help: None,
            labels: Vec::new(),
            fix: None,
        }
    }

    /// Create an error diagnostic
    pub fn error(rule: &'static str, span: Span, message: impl Into<String>) -> Self {
        Self {
            rule,
            span,
            message: message.into(),
            severity: Severity::Error,
            help: None,
            labels: Vec::new(),
            fix: None,
        }
    }

    /// Add help text
    pub fn with_help(mut self, help: impl Into<String>) -> Self {
        self.help = Some(help.into());
        self
    }

    /// Add a label
    pub fn with_label(mut self, span: Span, message: impl Into<String>) -> Self {
        self.labels.push(Label {
            span,
            message: message.into(),
        });
        self
    }

    /// Add a fix
    pub fn with_fix(mut self, span: Span, replacement: impl Into<String>) -> Self {
        self.fix = Some(Fix {
            span,
            replacement: replacement.into(),
        });
        self
    }
}
