//! Utility functions for Solid.js analysis

use oxc_ast::ast::{BindingPatternKind, Expression, FormalParameters};

/// Check if a name looks like props (for heuristic detection)
pub fn is_props_by_name(name: &str) -> bool {
    name == "props" || name.ends_with("Props") || name.ends_with("_props")
}

/// Check if a tag name is a DOM element (starts with lowercase)
pub fn is_dom_element_name(name: &str) -> bool {
    name.chars()
        .next()
        .map(|c| c.is_ascii_lowercase())
        .unwrap_or(false)
}

/// Check if a function name looks like a component (starts with uppercase)
pub fn is_component_name(name: &str) -> bool {
    name.chars().next().map(|c| c.is_ascii_uppercase()).unwrap_or(false)
}

/// Check if a name looks like a custom hook or reactive function
pub fn is_custom_hook_name(name: &str) -> bool {
    name.starts_with("use") && name.len() > 3 && name.chars().nth(3).map(|c| c.is_ascii_uppercase()).unwrap_or(false)
        || name.starts_with("create") && name.len() > 6 && name.chars().nth(6).map(|c| c.is_ascii_uppercase()).unwrap_or(false)
}

/// Solid.js primitives that create signals (returns [getter, setter])
pub const SIGNAL_CREATORS: &[&str] = &[
    "createSignal",
    "useTransition",
];

/// Solid.js primitives that return a single callable signal
pub const MEMO_CREATORS: &[&str] = &[
    "createMemo",
    "createSelector",
];

/// Solid.js primitives that create stores (returns [store, setStore])
pub const STORE_CREATORS: &[&str] = &[
    "createStore",
];

/// Solid.js primitives that return a single store/props-like object
pub const PROPS_CREATORS: &[&str] = &[
    "mergeProps",
    "createMutable",
];

/// Solid.js primitives that create tracked scopes (first arg is tracked function)
pub const TRACKED_SCOPE_CREATORS: &[&str] = &[
    "createMemo",
    "children",
    "createEffect",
    "createRenderEffect",
    "createDeferred",
    "createComputed",
    "createSelector",
    "untrack",
    "mapArray",
    "indexArray",
    "observable",
];

/// Solid.js primitives where first arg is a "called function" (not truly tracked but allows reactivity)
pub const CALLED_FUNCTION_CREATORS: &[&str] = &[
    "onMount",
    "onCleanup",
    "onError",
];

/// Timer/global functions that take callbacks
pub const TIMER_FUNCTIONS: &[&str] = &[
    "setInterval",
    "setTimeout",
    "setImmediate",
    "requestAnimationFrame",
    "requestIdleCallback",
];

/// Solid.js primitives that take sync callbacks (don't create new scope)
pub const SYNC_CALLBACK_PRIMITIVES: &[&str] = &[
    "batch",
    "produce",
];

/// Array methods that take sync callbacks
pub const SYNC_ARRAY_METHODS: &[&str] = &[
    "forEach",
    "map",
    "flatMap",
    "reduce",
    "reduceRight",
    "find",
    "findIndex",
    "filter",
    "every",
    "some",
];

/// Web API observers that take callback functions
pub const WEB_OBSERVERS: &[&str] = &[
    "IntersectionObserver",
    "MutationObserver",
    "PerformanceObserver",
    "ReportingObserver",
    "ResizeObserver",
];

/// Get the first parameter's identifier name from function parameters
pub fn get_first_param_name<'a>(params: &'a FormalParameters<'a>) -> Option<&'a str> {
    params.items.first().and_then(|param| {
        if let BindingPatternKind::BindingIdentifier(ident) = &param.pattern.kind {
            Some(ident.name.as_str())
        } else {
            None
        }
    })
}

/// Check if an expression is a function (arrow or regular)
pub fn is_function_expression(expr: &Expression) -> bool {
    matches!(
        expr,
        Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
    )
}
