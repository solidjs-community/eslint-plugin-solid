//! Lint context providing access to source code and semantic information

use oxc_semantic::Semantic;
use oxc_span::SourceType;

/// Context passed to rules during linting
pub struct LintContext<'a> {
    source_text: &'a str,
    source_type: SourceType,
    semantic: Option<&'a Semantic<'a>>,
    file_path: Option<&'a str>,
}

impl<'a> LintContext<'a> {
    /// Create a new lint context
    pub fn new(source_text: &'a str, source_type: SourceType) -> Self {
        Self {
            source_text,
            source_type,
            semantic: None,
            file_path: None,
        }
    }

    /// Add semantic information to the context
    pub fn with_semantic(mut self, semantic: &'a Semantic<'a>) -> Self {
        self.semantic = Some(semantic);
        self
    }

    /// Add file path to the context
    pub fn with_file_path(mut self, file_path: &'a str) -> Self {
        self.file_path = Some(file_path);
        self
    }

    /// Get the source text
    pub fn source_text(&self) -> &str {
        self.source_text
    }

    /// Get the source type
    pub fn source_type(&self) -> SourceType {
        self.source_type
    }

    /// Get semantic information (if available)
    pub fn semantic(&self) -> Option<&Semantic<'a>> {
        self.semantic
    }

    /// Get the file path (if available)
    pub fn file_path(&self) -> Option<&str> {
        self.file_path
    }

    /// Get a slice of source text for the given span
    pub fn get_source_span(&self, start: u32, end: u32) -> &str {
        &self.source_text[start as usize..end as usize]
    }
}
