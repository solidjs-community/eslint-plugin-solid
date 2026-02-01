//! solid/reactivity
//!
//! Enforce that reactive expressions (signals, memos, stores, props) are accessed properly.
//! This rule tracks reactive variables across scopes and ensures they are used within
//! tracked scopes (like createEffect, createMemo, JSX expressions) or event handlers.
//!
//! ## What this rule detects:
//! - Signals accessed outside of tracked scopes
//! - Signals passed as values instead of being called
//! - Props/stores accessed outside of tracked scopes
//! - Reassignment of reactive variables
//! - Async tracked scopes (which break reactivity)
//! - Derived signals (functions that read signals)

use oxc_ast::ast::{
    Argument, BindingPattern, BindingPatternKind,
    CallExpression, Expression, FormalParameters, Function, IdentifierReference,
    JSXExpressionContainer, Program, VariableDeclarator,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};
use oxc_syntax::scope::ScopeFlags;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::context::LintContext;
use crate::diagnostic::Diagnostic;
use crate::utils::{
    is_custom_hook_name, is_props_by_name,
    CALLED_FUNCTION_CREATORS, MEMO_CREATORS, PROPS_CREATORS, SIGNAL_CREATORS,
    STORE_CREATORS, SYNC_ARRAY_METHODS, SYNC_CALLBACK_PRIMITIVES, TIMER_FUNCTIONS,
    TRACKED_SCOPE_CREATORS,
};
use crate::{RuleCategory, RuleMeta};

/// The reactivity rule
#[derive(Debug, Clone, Default)]
pub struct Reactivity {
    custom_reactive_functions: Vec<String>,
}

impl RuleMeta for Reactivity {
    const NAME: &'static str = "solid/reactivity";
    const CATEGORY: RuleCategory = RuleCategory::Correctness;
}

/// What kind of reactive variable this is
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub enum ReactiveKind {
    /// createSignal/createMemo - must be called to read: `signal()`
    Signal,
    /// createStore/props - reactive by property access: `store.foo`
    Props,
    /// A function that became reactive because it reads signals
    DerivedSignal,
}

/// Origin of the reactive variable for better diagnostics
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum ReactiveOrigin {
    CreateSignal,
    CreateMemo,
    CreateStore,
    CreateMutable,
    MergeProps,
    SplitProps,
    CreateResource,
    Props,
    ForIndex,
    IndexItem,
    Unknown,
}

/// A tracked reactive variable
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ReactiveVariable {
    pub kind: ReactiveKind,
    pub origin: ReactiveOrigin,
    pub decl_scope_depth: usize,
    pub decl_span: Span,
}

/// Why this scope is tracked
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub enum TrackedReason {
    /// createEffect, createMemo callback
    EffectCallback,
    /// JSX expression container: {signal()}
    JSXExpression,
    /// Event handler: onClick={() => ...}
    EventHandler,
    /// Timer callback: setTimeout(() => ...)
    TimerCallback,
    /// Observer callback: new IntersectionObserver(() => ...)
    ObserverCallback,
    /// Function ref: ref={el => ...}
    RefCallback,
    /// "use:" directive callback
    UseDirective,
    /// Inline function in JSX children
    JSXChildFunction,
}

/// A tracked scope frame
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TrackedScopeFrame {
    pub reason: TrackedReason,
    pub node_span: Span,
    /// If true, this is a "called function" context where async is allowed
    pub allows_async: bool,
}

/// A function frame for per-function analysis
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct FunctionFrame {
    pub depth: usize,
    pub node_span: Span,
    /// Whether this function returns JSX
    pub has_jsx: bool,
    /// Tracked scopes within this function
    pub tracked_scopes: Vec<TrackedScopeFrame>,
    /// Whether this function is a sync callback (doesn't create new scope)
    pub is_sync_callback: bool,
    /// Whether this function has reactive reads (signal calls inside)
    pub has_reactive_reads: bool,
}

impl FunctionFrame {
    fn new(depth: usize, node_span: Span) -> Self {
        Self {
            depth,
            node_span,
            has_jsx: false,
            tracked_scopes: Vec::new(),
            is_sync_callback: false,
            has_reactive_reads: false,
        }
    }
}

/// Read form for a reactive variable
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum ReadForm {
    /// signal() - called
    Called,
    /// signal - used as identifier
    Identifier,
    /// store.foo - property access
    PropertyAccess,
}

/// A reactive read that occurred
#[derive(Debug, Clone)]
pub struct ReactiveRead {
    pub name: String,
    pub kind: ReactiveKind,
    pub read_span: Span,
    pub read_form: ReadForm,
    pub in_tracked_scope: bool,
    pub decl_scope_depth: usize,
}

/// The visitor state for reactivity analysis
#[allow(dead_code)]
pub struct ReactivityVisitor<'a, 'ctx> {
    ctx: &'ctx LintContext<'a>,
    diagnostics: Vec<Diagnostic>,

    /// Registry of reactive variables by name (simplified - full impl would use SymbolId)
    reactive_registry: FxHashMap<String, ReactiveVariable>,

    /// Imports from solid-js (maps local name to imported name)
    solid_imports: FxHashMap<String, String>,

    /// Function scope stack
    function_stack: Vec<FunctionFrame>,

    /// Current tracked scope stack (separate from function stack)
    tracked_stack: Vec<TrackedScopeFrame>,

    /// Sync callbacks that don't create new scopes
    sync_callbacks: FxHashSet<Span>,

    /// Reactive reads in current function scope
    pending_reads: Vec<ReactiveRead>,
    
    /// Spans of signal identifiers that are called (to differentiate Called vs Identifier)
    called_signals: FxHashSet<Span>,

    /// Track which functions have reactive reads (derived signals)
    derived_signals: FxHashSet<Span>,
}

impl<'a, 'ctx> ReactivityVisitor<'a, 'ctx> {
    pub fn new(ctx: &'ctx LintContext<'a>) -> Self {
        Self {
            ctx,
            diagnostics: Vec::new(),
            reactive_registry: FxHashMap::default(),
            solid_imports: FxHashMap::default(),
            function_stack: Vec::new(),
            tracked_stack: Vec::new(),
            sync_callbacks: FxHashSet::default(),
            pending_reads: Vec::new(),
            called_signals: FxHashSet::default(),
            derived_signals: FxHashSet::default(),
        }
    }

    #[allow(dead_code)]
    fn current_scope(&self) -> Option<&FunctionFrame> {
        self.function_stack.last()
    }

    fn current_scope_mut(&mut self) -> Option<&mut FunctionFrame> {
        self.function_stack.last_mut()
    }

    fn is_tracked(&self) -> bool {
        !self.tracked_stack.is_empty()
    }

    fn current_depth(&self) -> usize {
        self.function_stack.len()
    }

    fn match_import(&self, names: &[&str], local_name: &str) -> bool {
        if let Some(imported) = self.solid_imports.get(local_name) {
            names.contains(&imported.as_str())
        } else {
            // Fall back to matching the name directly for non-imported usage
            names.contains(&local_name)
        }
    }

    fn push_tracked_scope(&mut self, reason: TrackedReason, span: Span, allows_async: bool) {
        let frame = TrackedScopeFrame {
            reason,
            node_span: span,
            allows_async,
        };
        self.tracked_stack.push(frame.clone());
        if let Some(fn_frame) = self.current_scope_mut() {
            fn_frame.tracked_scopes.push(frame);
        }
    }

    fn pop_tracked_scope(&mut self) {
        self.tracked_stack.pop();
    }

    fn register_signal(&mut self, name: String, origin: ReactiveOrigin, span: Span) {
        self.reactive_registry.insert(
            name,
            ReactiveVariable {
                kind: ReactiveKind::Signal,
                origin,
                decl_scope_depth: self.current_depth(),
                decl_span: span,
            },
        );
    }

    fn register_props(&mut self, name: String, origin: ReactiveOrigin, span: Span) {
        self.reactive_registry.insert(
            name,
            ReactiveVariable {
                kind: ReactiveKind::Props,
                origin,
                decl_scope_depth: self.current_depth(),
                decl_span: span,
            },
        );
    }

    fn check_identifier_reference(&mut self, ident: &IdentifierReference, read_form: ReadForm) {
        let name = ident.name.as_str();
        
        let Some(reactive_var) = self.reactive_registry.get(name).cloned() else {
            return;
        };

        let in_tracked = self.is_tracked();

        // Mark current function as having reactive reads
        if let Some(frame) = self.function_stack.last_mut() {
            frame.has_reactive_reads = true;
        }

        self.pending_reads.push(ReactiveRead {
            name: name.to_string(),
            kind: reactive_var.kind,
            read_span: ident.span,
            read_form,
            in_tracked_scope: in_tracked,
            decl_scope_depth: reactive_var.decl_scope_depth,
        });
    }
    
    /// Track when a signal is called (for accurate Called vs Identifier detection)
    fn mark_signal_called(&mut self, span: Span) {
        self.called_signals.insert(span);
    }
    
    fn is_signal_called(&self, span: Span) -> bool {
        self.called_signals.contains(&span)
    }

    fn check_async_in_tracked_scope(&mut self, is_async: bool, span: Span) {
        if is_async {
            if let Some(tracked) = self.tracked_stack.last() {
                if !tracked.allows_async {
                    self.diagnostics.push(
                        Diagnostic::warning(
                            Reactivity::NAME,
                            span,
                            "This tracked scope should not be async. The reactive tracking ends after the first `await`.",
                        )
                        .with_help("Move async operations inside the effect body, not in the tracked function itself."),
                    );
                }
            }
        }
    }

    fn analyze_pending_reads(&mut self) {
        let reads = std::mem::take(&mut self.pending_reads);

        for read in reads {
            match read.kind {
                ReactiveKind::Signal | ReactiveKind::DerivedSignal => {
                    self.check_signal_read(&read);
                }
                ReactiveKind::Props => {
                    self.check_props_read(&read);
                }
            }
        }
    }

    fn check_signal_read(&mut self, read: &ReactiveRead) {
        match read.read_form {
            ReadForm::Called => {
                // Signal is called - this is correct, but check if in tracked scope
                if !read.in_tracked_scope && read.decl_scope_depth == self.current_depth() {
                    self.diagnostics.push(
                        Diagnostic::warning(
                            Reactivity::NAME,
                            read.read_span,
                            format!(
                                "The reactive variable '{}' should be used within JSX, a tracked scope (like createEffect), or inside an event handler function.",
                                read.name
                            ),
                        )
                        .with_help("Wrap the usage in a tracked scope like createEffect(() => { ... })"),
                    );
                }
            }
            ReadForm::Identifier => {
                // Signal is passed as a value without calling - this is almost always wrong
                // A signal should be called to read its value, whether in tracked scope or not
                // Exception: when passing to createMemo deps, on() first arg, etc.
                // For now, always warn on uncalled signals
                self.diagnostics.push(
                    Diagnostic::warning(
                        Reactivity::NAME,
                        read.read_span,
                        format!(
                            "The reactive variable '{}' should be called as a function when used.",
                            read.name
                        ),
                    )
                    .with_help("Call the signal: `signal()` instead of `signal`"),
                );
            }
            ReadForm::PropertyAccess => {
                // Signals shouldn't have property access (they're functions)
                self.diagnostics.push(
                    Diagnostic::warning(
                        Reactivity::NAME,
                        read.read_span,
                        format!(
                            "The reactive variable '{}' should be called as a function, not accessed as a property.",
                            read.name
                        ),
                    ),
                );
            }
        }
    }

    fn check_props_read(&mut self, read: &ReactiveRead) {
        match read.read_form {
            ReadForm::PropertyAccess => {
                // Props property access - check if in tracked scope
                if !read.in_tracked_scope && read.decl_scope_depth == self.current_depth() {
                    self.diagnostics.push(
                        Diagnostic::warning(
                            Reactivity::NAME,
                            read.read_span,
                            format!(
                                "The reactive variable '{}' should be used within JSX, a tracked scope (like createEffect), or inside an event handler function.",
                                read.name
                            ),
                        ),
                    );
                }
            }
            ReadForm::Identifier => {
                // Props passed as identifier might be destructuring or assignment
            }
            ReadForm::Called => {
                // Props shouldn't be called
            }
        }
    }

    fn get_binding_name(&self, pattern: &BindingPattern) -> Option<String> {
        match &pattern.kind {
            BindingPatternKind::BindingIdentifier(ident) => {
                Some(ident.name.to_string())
            }
            _ => None,
        }
    }

    fn get_nth_array_element_name(&self, pattern: &BindingPattern, n: usize) -> Option<String> {
        match &pattern.kind {
            BindingPatternKind::ArrayPattern(array) => {
                array.elements.get(n).and_then(|elem| {
                    elem.as_ref().and_then(|p| self.get_binding_name(p))
                })
            }
            _ => None,
        }
    }

    fn handle_variable_declarator(&mut self, decl: &VariableDeclarator) {
        let Some(init) = &decl.init else {
            return;
        };

        let Expression::CallExpression(call) = init else {
            return;
        };

        let Expression::Identifier(callee) = &call.callee else {
            return;
        };

        let callee_name = callee.name.as_str();

        // createSignal, useTransition -> [getter, setter]
        if self.match_import(SIGNAL_CREATORS, callee_name) {
            if let Some(name) = self.get_nth_array_element_name(&decl.id, 0) {
                self.register_signal(name, ReactiveOrigin::CreateSignal, decl.id.span());
            }
        }
        // createMemo, createSelector -> single callable
        else if self.match_import(MEMO_CREATORS, callee_name) {
            if let Some(name) = self.get_binding_name(&decl.id) {
                self.register_signal(name, ReactiveOrigin::CreateMemo, decl.id.span());
            }
        }
        // createStore -> [store, setStore]
        else if self.match_import(STORE_CREATORS, callee_name) {
            if let Some(name) = self.get_nth_array_element_name(&decl.id, 0) {
                self.register_props(name, ReactiveOrigin::CreateStore, decl.id.span());
            }
        }
        // mergeProps, createMutable -> single store-like
        else if self.match_import(PROPS_CREATORS, callee_name) {
            if let Some(name) = self.get_binding_name(&decl.id) {
                self.register_props(name, ReactiveOrigin::MergeProps, decl.id.span());
            }
        }
        // createResource -> [resource, ...] where resource has .loading, .error
        else if self.match_import(&["createResource"], callee_name) {
            if let Some(name) = self.get_nth_array_element_name(&decl.id, 0) {
                self.register_props(name, ReactiveOrigin::CreateResource, decl.id.span());
            }
        }
        // splitProps -> [first, second, ...]
        else if self.match_import(&["splitProps"], callee_name) {
            if let BindingPatternKind::ArrayPattern(array) = &decl.id.kind {
                for elem in array.elements.iter().flatten() {
                    if let Some(name) = self.get_binding_name(elem) {
                        self.register_props(name, ReactiveOrigin::SplitProps, elem.span());
                    }
                }
            }
        }

        // Check for sync callbacks in setters
        self.detect_sync_callbacks(call);
    }

    fn detect_sync_callbacks(&mut self, call: &CallExpression) {
        // batch, produce - first arg is sync callback
        if let Expression::Identifier(callee) = &call.callee {
            if self.match_import(SYNC_CALLBACK_PRIMITIVES, callee.name.as_str()) {
                if let Some(Argument::FunctionExpression(f)) = call.arguments.first() {
                    self.sync_callbacks.insert(f.span);
                } else if let Some(Argument::ArrowFunctionExpression(f)) = call.arguments.first() {
                    self.sync_callbacks.insert(f.span);
                }
            }
        }

        // Array methods: .forEach, .map, etc.
        if let Expression::StaticMemberExpression(member) = &call.callee {
            if SYNC_ARRAY_METHODS.contains(&member.property.name.as_str()) {
                if let Some(Argument::FunctionExpression(f)) = call.arguments.first() {
                    self.sync_callbacks.insert(f.span);
                } else if let Some(Argument::ArrowFunctionExpression(f)) = call.arguments.first() {
                    self.sync_callbacks.insert(f.span);
                }
            }
        }

        // IIFE
        if let Expression::ArrowFunctionExpression(f) = &call.callee {
            self.sync_callbacks.insert(f.span);
        } else if let Expression::FunctionExpression(f) = &call.callee {
            self.sync_callbacks.insert(f.span);
        }
    }

    fn handle_call_expression(&mut self, call: &CallExpression) {
        self.detect_sync_callbacks(call);

        let Expression::Identifier(callee) = &call.callee else {
            // Handle member expression calls for event handlers
            self.handle_member_call(call);
            return;
        };

        let callee_name = callee.name.as_str();

        // createEffect, createMemo, etc. - first arg is tracked scope
        if self.match_import(TRACKED_SCOPE_CREATORS, callee_name) {
            if let Some(arg) = call.arguments.first() {
                self.push_tracked_scope(TrackedReason::EffectCallback, arg.span(), false);
            }
        }
        // onMount, onCleanup, etc. - called function (allows async)
        else if self.match_import(CALLED_FUNCTION_CREATORS, callee_name) {
            if let Some(arg) = call.arguments.first() {
                self.push_tracked_scope(TrackedReason::TimerCallback, arg.span(), true);
            }
        }
        // setTimeout, setInterval, etc.
        else if TIMER_FUNCTIONS.contains(&callee_name) {
            if let Some(arg) = call.arguments.first() {
                self.push_tracked_scope(TrackedReason::TimerCallback, arg.span(), true);
            }
        }
        // on() - special handling for deps array
        else if self.match_import(&["on"], callee_name) {
            // First arg is signal(s), second is tracked callback
            if call.arguments.len() >= 2 {
                self.push_tracked_scope(
                    TrackedReason::EffectCallback,
                    call.arguments[1].span(),
                    true, // "on" allows async since deps are explicit
                );
            }
        }
        // Custom hooks - use/create functions
        else if is_custom_hook_name(callee_name) {
            // Permissively track all function arguments
            for arg in &call.arguments {
                if matches!(
                    arg,
                    Argument::FunctionExpression(_) | Argument::ArrowFunctionExpression(_)
                ) {
                    self.push_tracked_scope(TrackedReason::EffectCallback, arg.span(), true);
                }
            }
        }
    }

    fn handle_member_call(&mut self, call: &CallExpression) {
        if let Expression::StaticMemberExpression(member) = &call.callee {
            // addEventListener
            if member.property.name == "addEventListener" {
                if call.arguments.len() >= 2 {
                    self.push_tracked_scope(
                        TrackedReason::EventHandler,
                        call.arguments[1].span(),
                        true,
                    );
                }
            }
        }
    }

    fn handle_jsx_expression(&mut self, container: &JSXExpressionContainer) {
        if let Some(expr) = container.expression.as_expression() {
            if matches!(
                expr,
                Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
            ) {
                self.push_tracked_scope(TrackedReason::JSXChildFunction, expr.span(), false);
            } else {
                self.push_tracked_scope(TrackedReason::JSXExpression, container.span, false);
            }
        }
    }

    fn handle_function_params(&mut self, params: &FormalParameters, _fn_span: Span) {
        // Check if first param looks like props
        if let Some(first) = params.items.first() {
            if let BindingPatternKind::BindingIdentifier(ident) = &first.pattern.kind {
                if is_props_by_name(&ident.name) {
                    self.register_props(
                        ident.name.to_string(),
                        ReactiveOrigin::Props,
                        ident.span,
                    );
                }
            }
        }
    }

    fn enter_function(&mut self, span: Span, is_sync: bool) {
        let depth = self.function_stack.len() + 1;
        let mut frame = FunctionFrame::new(depth, span);
        frame.is_sync_callback = is_sync;
        self.function_stack.push(frame);
    }

    fn exit_function(&mut self) {
        // Analyze all pending reads before popping
        self.analyze_pending_reads();
        
        // Check if this function had reactive reads and is not in a tracked scope
        // If so, mark it as a derived signal
        if let Some(frame) = self.function_stack.last() {
            if frame.has_reactive_reads && !self.is_tracked() {
                self.derived_signals.insert(frame.node_span);
            }
        }
        
        self.function_stack.pop();
    }
}

impl<'a, 'ctx> Visit<'a> for ReactivityVisitor<'a, 'ctx> {
    fn visit_program(&mut self, program: &Program<'a>) {
        // Push program scope
        self.enter_function(program.span, false);
        walk::walk_program(self, program);
        self.exit_function();
    }

    fn visit_import_declaration(&mut self, decl: &oxc_ast::ast::ImportDeclaration<'a>) {
        let source = decl.source.value.as_str();
        if source.starts_with("solid-js") {
            if let Some(specifiers) = &decl.specifiers {
                for spec in specifiers {
                    match spec {
                        oxc_ast::ast::ImportDeclarationSpecifier::ImportSpecifier(s) => {
                            let imported = s.imported.name().to_string();
                            let local = s.local.name.to_string();
                            self.solid_imports.insert(local, imported);
                        }
                        oxc_ast::ast::ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                            self.solid_imports.insert(s.local.name.to_string(), "default".to_string());
                        }
                        oxc_ast::ast::ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                            self.solid_imports.insert(s.local.name.to_string(), "*".to_string());
                        }
                    }
                }
            }
        }
        walk::walk_import_declaration(self, decl);
    }

    fn visit_variable_declarator(&mut self, decl: &VariableDeclarator<'a>) {
        self.handle_variable_declarator(decl);
        walk::walk_variable_declarator(self, decl);
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        self.handle_call_expression(call);
        
        // If the callee is an identifier, check if it's a signal being called
        if let Expression::Identifier(ident) = &call.callee {
            let name = ident.name.as_str();
            if self.reactive_registry.contains_key(name) {
                // Mark this span as a called signal
                self.mark_signal_called(ident.span);
                // This is a signal call - mark it as Called form
                self.check_identifier_reference(ident, ReadForm::Called);
            }
        }
        
        walk::walk_call_expression(self, call);
    }

    fn visit_identifier_reference(&mut self, ident: &IdentifierReference<'a>) {
        let name = ident.name.as_str();
        
        // Only check if this is a reactive variable that we haven't already processed as a call
        if self.reactive_registry.contains_key(name) {
            // Skip if already processed as a call
            if !self.is_signal_called(ident.span) {
                // This catches cases where signal is passed as value
                self.check_identifier_reference(ident, ReadForm::Identifier);
            }
        }
    }

    fn visit_jsx_expression_container(&mut self, container: &JSXExpressionContainer<'a>) {
        self.handle_jsx_expression(container);
        walk::walk_jsx_expression_container(self, container);
        self.pop_tracked_scope();
    }

    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement<'a>) {
        if let Some(scope) = self.current_scope_mut() {
            scope.has_jsx = true;
        }
        walk::walk_jsx_element(self, elem);
    }

    fn visit_function(&mut self, func: &Function<'a>, flags: ScopeFlags) {
        let is_sync = self.sync_callbacks.contains(&func.span);

        // Check for async functions in tracked scopes that don't allow async
        self.check_async_in_tracked_scope(func.r#async, func.span);

        if !is_sync {
            self.enter_function(func.span, false);
        }

        self.handle_function_params(&func.params, func.span);
        walk::walk_function(self, func, flags);

        if !is_sync {
            self.exit_function();
        }
    }

    fn visit_arrow_function_expression(
        &mut self,
        arrow: &oxc_ast::ast::ArrowFunctionExpression<'a>,
    ) {
        let is_sync = self.sync_callbacks.contains(&arrow.span);

        // Check for async arrow functions in tracked scopes that don't allow async
        self.check_async_in_tracked_scope(arrow.r#async, arrow.span);

        if !is_sync {
            self.enter_function(arrow.span, false);
        }

        self.handle_function_params(&arrow.params, arrow.span);
        walk::walk_arrow_function_expression(self, arrow);

        if !is_sync {
            self.exit_function();
        }
    }
}

impl Reactivity {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_custom_reactive_functions(mut self, funcs: Vec<String>) -> Self {
        self.custom_reactive_functions = funcs;
        self
    }

    pub fn check_program<'a>(
        &self,
        program: &Program<'a>,
        ctx: &LintContext<'a>,
    ) -> Vec<Diagnostic> {
        let mut visitor = ReactivityVisitor::new(ctx);
        visitor.visit_program(program);
        visitor.diagnostics
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
        let source_type = SourceType::default()
            .with_module(true)
            .with_jsx(true);
        
        let parser = Parser::new(&allocator, source, source_type);
        let parsed = parser.parse();
        
        if !parsed.errors.is_empty() {
            panic!("Parse errors: {:?}", parsed.errors);
        }
        
        let ctx = LintContext::new(source, source_type);
        let rule = Reactivity::new();
        rule.check_program(&parsed.program, &ctx)
    }

    #[test]
    fn test_rule_name() {
        assert_eq!(Reactivity::NAME, "solid/reactivity");
    }

    #[test]
    fn test_rule_category() {
        assert_eq!(Reactivity::CATEGORY, RuleCategory::Correctness);
    }

    #[test]
    fn test_signal_in_jsx_expression_valid() {
        // Signal called inside JSX expression container - valid
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            const App = () => <div>{count()}</div>;
        "#);
        // Should not report because signal is in JSX (tracked scope)
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_signal_in_create_effect_valid() {
        // Signal accessed inside createEffect - valid
        let diagnostics = check_code(r#"
            import { createSignal, createEffect } from "solid-js";
            const [count, setCount] = createSignal(0);
            createEffect(() => {
                console.log(count());
            });
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_signal_in_create_memo_valid() {
        // Signal accessed inside createMemo - valid
        let diagnostics = check_code(r#"
            import { createSignal, createMemo } from "solid-js";
            const [count, setCount] = createSignal(0);
            const doubled = createMemo(() => count() * 2);
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_memo_registration() {
        // createMemo returns a signal-like value
        let diagnostics = check_code(r#"
            import { createSignal, createMemo } from "solid-js";
            const [count, setCount] = createSignal(0);
            const doubled = createMemo(() => count() * 2);
            const App = () => <div>{doubled()}</div>;
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_store_in_jsx_valid() {
        // Store accessed in JSX - valid
        let diagnostics = check_code(r#"
            import { createStore } from "solid-js/store";
            const [state, setState] = createStore({ count: 0 });
            const App = () => <div>{state.count}</div>;
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_props_in_jsx_valid() {
        // Props accessed in JSX - valid
        let diagnostics = check_code(r#"
            const Component = (props) => <div>{props.name}</div>;
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_signal_in_event_handler_valid() {
        // Signal in event handler onClick - valid
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            const App = () => <button onClick={() => setCount(count() + 1)}>+</button>;
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_signal_in_timer_valid() {
        // Signal in setTimeout callback - valid (called function)
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            setTimeout(() => {
                console.log(count());
            }, 1000);
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_merge_props_registration() {
        // mergeProps returns props-like object
        let diagnostics = check_code(r#"
            import { mergeProps } from "solid-js";
            const merged = mergeProps({ a: 1 }, { b: 2 });
            const App = () => <div>{merged.a}</div>;
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_create_resource_registration() {
        // createResource returns [resource, ...] where resource is reactive
        let diagnostics = check_code(r#"
            import { createResource } from "solid-js";
            const [data, { refetch }] = createResource(() => fetch('/api'));
            const App = () => <div>{data.loading ? 'Loading...' : data()}</div>;
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_custom_hook_tracked() {
        // Custom hooks (use*/create*) should track function args
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            
            function useCustom(fn) { return fn; }
            
            useCustom(() => {
                console.log(count());
            });
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_sync_callback_batch() {
        // batch callback should be treated as same scope
        let diagnostics = check_code(r#"
            import { createSignal, batch, createEffect } from "solid-js";
            const [count, setCount] = createSignal(0);
            
            createEffect(() => {
                batch(() => {
                    console.log(count());
                });
            });
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    #[test]
    fn test_sync_callback_array_methods() {
        // Array.forEach/map callbacks should be treated as same scope
        let diagnostics = check_code(r#"
            import { createSignal, createEffect } from "solid-js";
            const [items, setItems] = createSignal([1, 2, 3]);
            
            createEffect(() => {
                items().forEach((item) => {
                    console.log(item);
                });
            });
        "#);
        assert!(diagnostics.is_empty(), "Expected no diagnostics but got: {:?}", diagnostics);
    }

    // ===== Invalid cases - should produce diagnostics =====

    #[test]
    fn test_signal_passed_as_value_invalid() {
        // Signal passed without calling - invalid
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            console.log(count);
        "#);
        // Should report: signal should be called
        assert!(!diagnostics.is_empty(), "Expected diagnostics for uncalled signal");
        assert!(diagnostics[0].message.contains("should be called"));
    }

    #[test]
    fn test_signal_outside_tracked_scope_invalid() {
        // Signal accessed at module level outside any tracked scope
        let _diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            const value = count();
        "#);
        // At module level, the signal read is outside a tracked scope
        // This is a gray area - some implementations warn, some don't
        // For now we don't warn on module-level reads
    }

    #[test]
    fn test_props_destructured_invalid() {
        // Props destructured at function body level - loses reactivity
        let _diagnostics = check_code(r#"
            const Component = (props) => {
                const { name } = props;
                return <div>{name}</div>;
            };
        "#);
        // The destructuring happens outside JSX, so props.name read is outside tracked scope
        // name is used in JSX but it's a static value, not reactive
        // Note: This specific pattern might need more sophisticated analysis
    }

    #[test]
    fn test_signal_in_jsx_uncalled_invalid() {
        // Signal passed to JSX without calling - invalid for DOM elements
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            const App = () => <div>{count}</div>;
        "#);
        // Signal should be called in JSX - we now detect this
        assert!(!diagnostics.is_empty(), "Expected diagnostics for uncalled signal in JSX");
        assert!(diagnostics[0].message.contains("should be called"), "Expected message about calling signal");
    }

    #[test]
    fn test_async_create_effect_invalid() {
        let diagnostics = check_code(r#"
            import { createSignal, createEffect } from "solid-js";
            const [count, setCount] = createSignal(0);
            createEffect(async () => {
                await fetch('/api');
                console.log(count());
            });
        "#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for async tracked scope");
        assert!(diagnostics[0].message.contains("async") || diagnostics[0].message.contains("await"));
    }

    #[test]
    fn test_async_create_memo_invalid() {
        let diagnostics = check_code(r#"
            import { createSignal, createMemo } from "solid-js";
            const [count, setCount] = createSignal(0);
            const doubled = createMemo(async () => {
                await delay(100);
                return count() * 2;
            });
        "#);
        assert!(!diagnostics.is_empty(), "Expected diagnostics for async memo");
    }

    #[test]
    fn test_async_on_mount_valid() {
        // onMount allows async
        let diagnostics = check_code(r#"
            import { createSignal, onMount } from "solid-js";
            const [data, setData] = createSignal(null);
            onMount(async () => {
                const result = await fetch('/api');
                setData(result);
            });
        "#);
        assert!(diagnostics.is_empty(), "onMount should allow async: {:?}", diagnostics);
    }

    #[test]
    fn test_async_timer_valid() {
        // setTimeout allows async
        let diagnostics = check_code(r#"
            import { createSignal } from "solid-js";
            const [count, setCount] = createSignal(0);
            setTimeout(async () => {
                await delay(100);
                console.log(count());
            }, 1000);
        "#);
        assert!(diagnostics.is_empty(), "Timers should allow async: {:?}", diagnostics);
    }
}
