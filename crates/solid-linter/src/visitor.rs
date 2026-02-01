//! AST visitor for running lint rules

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;

use oxc_ast::ast::Program;

/// A lint runner that traverses the AST and collects diagnostics
pub struct LintRunner<'a> {
    ctx: LintContext<'a>,
    diagnostics: Vec<Diagnostic>,
}

impl<'a> LintRunner<'a> {
    /// Create a new lint runner
    pub fn new(ctx: LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
        }
    }

    /// Get the context
    pub fn context(&self) -> &LintContext<'a> {
        &self.ctx
    }

    /// Add a diagnostic
    pub fn add_diagnostic(&mut self, diagnostic: Diagnostic) {
        self.diagnostics.push(diagnostic);
    }

    /// Add multiple diagnostics
    pub fn add_diagnostics(&mut self, diagnostics: impl IntoIterator<Item = Diagnostic>) {
        self.diagnostics.extend(diagnostics);
    }

    /// Run the linter on the given program
    pub fn run(mut self, program: &Program<'a>) -> Vec<Diagnostic> {
        // Run the reactivity rule
        let reactivity = crate::rules::Reactivity::new();
        let reactivity_diagnostics = reactivity.check_program(program, &self.ctx);
        self.add_diagnostics(reactivity_diagnostics);

        // Run the jsx-no-duplicate-props rule
        let jsx_no_duplicate_props = crate::rules::JsxNoDuplicateProps::new();
        let jsx_no_duplicate_props_diagnostics = jsx_no_duplicate_props.check_program(program, &self.ctx);
        self.add_diagnostics(jsx_no_duplicate_props_diagnostics);

        // Run the no-destructure rule
        let no_destructure = crate::rules::NoDestructure::new();
        let no_destructure_diagnostics = no_destructure.check_program(program, &self.ctx);
        self.add_diagnostics(no_destructure_diagnostics);

        // Run the self-closing-comp rule
        let self_closing_comp = crate::rules::SelfClosingComp::new();
        let self_closing_comp_diagnostics = self_closing_comp.check_program(program, &self.ctx);
        self.add_diagnostics(self_closing_comp_diagnostics);

        // Run the components-return-once rule
        let components_return_once = crate::rules::ComponentsReturnOnce::new();
        let components_return_once_diagnostics =
            components_return_once.check_program(program, &self.ctx);
        self.add_diagnostics(components_return_once_diagnostics);

        // Run the event-handlers rule
        let event_handlers = crate::rules::EventHandlers::new();
        let event_handlers_diagnostics = event_handlers.check_program(program, &self.ctx);
        self.add_diagnostics(event_handlers_diagnostics);

        self.diagnostics
    }
}
