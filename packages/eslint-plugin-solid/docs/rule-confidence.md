# Rule confidence policy and audit

This document records the plugin's stance on false positives and the confidence
classification behind every rule enabled in the `v2` and `v2-strict` configs.

## Policy

A growing share of the code this plugin lints is written and repaired by AI
agents, and agents comply with lint output unquestioningly: a false positive
doesn't get ignored the way a human skims past it — it gets "fixed", warping
correct code into cargo-cult shapes. That inverts the historical trade-off.
A missed warning costs one bug; a false positive at scale costs trust in the
whole channel and quietly rewrites working code.

The rules therefore follow three principles:

1. **Errors are reserved for structural facts.** A rule may report at error
   level only when the flagged code is _certainly_ wrong under Solid's
   semantics (or is a security hazard). If a rule needs a heuristic to decide,
   it is not error material.
2. **Heuristics stay warnings and must name their escape.** When a rule infers
   intent (component detection, naming conventions, known-call lists), it
   reports at warn level and its message says how to opt out — a naming prefix,
   an option, a different form. An inescapable warning trains readers to
   suppress the rule.
3. **Behavior belongs to the runtime.** Whether a computation re-runs, goes
   stale, or wastes work is measurable in dev mode through Solid's diagnostics
   channel (`DEV.diagnostics`, `@solidjs/diagnostics`). Static analysis should
   not speculate about what the runtime can observe; lint rules assert
   structure, diagnostics assert behavior.

When an audit finds a false positive in an error-level rule, the preferred fix
is **precision, not demotion**: tighten the detection so the rule keeps its
strength on the cases it is sure about.

## Audit (2026-08)

Every rule enabled in `v2`/`v2-strict`, its level, confidence class, and known
edges. "Certain" means the report is a structural fact; "heuristic" means the
rule infers intent and has documented escapes.

### Error-level rules in `v2`

| Rule                          | Confidence          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :---------------------------- | :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jsx-no-duplicate-props`      | Certain             | Duplicate names are syntactic facts. Fixed in this audit: the duplicate-`class` message recommended `classList`, which no longer exists in 2.0 (v2 mode now recommends merging into one `class` array/object), and a typo made the `textcontent`-case check dead code.                                                                                                                                                                                                                           |
| `jsx-no-undef`                | Certain             | Scope analysis; self-gates when TypeScript handles undefined identifiers.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `jsx-uses-vars`               | Certain             | Marks JSX identifiers as used; produces no reports itself.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `no-unknown-namespaces`       | Certain (v2 mode)   | Only the formerly-special 1.x prefixes (`on:`, `use:`, `attr:`, `bool:`, `oncapture:`) are flagged, each with migration guidance; other colon-names are legal 2.0 attributes. `allowedNamespaces` is the escape. Colon-named props on _components_ are still reported — not an established Solid pattern, kept intentionally.                                                                                                                                                                    |
| `no-innerhtml`                | Certain (posture)   | Security rule: any non-static `innerHTML` is flagged by design, even values sanitized upstream — over-approximation is the point, as with every injection lint. The `notHtml` heuristic (is-html) only powers a suggestion, never an autofix.                                                                                                                                                                                                                                                    |
| `jsx-no-script-url`           | Certain             | Fires only on statically-known `javascript:` values.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `no-destructure`              | Certain (after fix) | **Fixed in this audit.** Previously any single-object-param function containing JSX was treated as a component, so data callbacks (`items.map(({ id }) => <li />)`) and lowercase-named helpers (`renderItem`) were flagged as props destructuring — and the autofix would have rewritten data access into `props` access. Now uses the same component identification as `components-return-once`: lowercase-named functions and call arguments (except PascalCase wrappers) are not components. |
| `prefer-for`                  | Near-certain        | `.map` returning JSX in JSX is list rendering; `<For>` is the canonical form and the fix is mechanical. The one soft spot — mapping a never-changing static array — still works identically under `<For>`, so the canonical-form value (one way to render lists, for humans and agents alike) outweighs it.                                                                                                                                                                                      |
| `event-handlers`              | Certain (v2 mode)   | Both v2 reports are structural facts: a camelCase handler with a static string/number value, and a lowercase `on*` attribute holding a function (a listener that never fires). Dynamic-string literal attributes are exempted.                                                                                                                                                                                                                                                                   |
| `no-react-specific-props`     | Certain on DOM      | `className`/`htmlFor` on DOM elements are dead attributes in 2.0. On components they are technically the component's own API, but a Solid component exposing `className` contradicts ecosystem convention so thoroughly that the report is still the right guidance; kept.                                                                                                                                                                                                                       |
| `removed-api`                 | Certain             | Import-based, verified against the 2.0 RC source. The `classList` JSX check also fires on components; as with `className`, a component exposing a `classList` prop in a 2.0 codebase is API that needs the same migration.                                                                                                                                                                                                                                                                       |
| `no-single-arg-create-effect` | Certain             | Import-gated; the single-argument form throws at runtime in dev. (`createEffect(...tuple)` spread would false-positive; considered negligible.)                                                                                                                                                                                                                                                                                                                                                  |
| `no-accessor-as-prop`         | Certain             | Only fires when the identifier statically resolves to a signal/memo/function, only on plain attributes of DOM elements, with `ref`/`children`/`on*` excluded.                                                                                                                                                                                                                                                                                                                                    |

### Warn-level rules in `v2`

| Rule                      | Confidence            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :------------------------ | :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reactivity`              | Heuristic             | The flagship rule and inherently inference-heavy (tracked-scope reasoning, signal naming, custom-primitive detection). Warn is the honest level. The #213 fixes removed its worst false positive (returned accessors are now the recognized custom-primitive contract) and added `staleCapture` with naming-convention escapes (`initial*`/`default*`/`static*`, `untrack`). Behavioral confirmation of what this rule suspects belongs to runtime diagnostics. |
| `components-return-once`  | Heuristic             | Early returns behind _static_ conditions (`if (isServer) ...`, env flags) don't break reactivity but are still flagged — the rule cannot tell static from reactive conditions. Known FP class, tolerable at warn; would need condition analysis to graduate.                                                                                                                                                                                                    |
| `imports`                 | Certain but stylistic | Specifier placement between modules; mechanical autofix. Wrong-source imports surface through TypeScript/bundlers anyway, so warn is enough.                                                                                                                                                                                                                                                                                                                    |
| `style-prop`              | Heuristic             | Property validity depends on the freshness of the `known-css-properties` list; numeric-value checks use a name allowlist. Correctly warn.                                                                                                                                                                                                                                                                                                                       |
| `self-closing-comp`       | Certain but layout    | Zero-FP autofix, pure style.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `prefer-structured-class` | Heuristic             | Flags manual class-string building (concat with conditionals, `.join`); plain interpolation and `clsx()`-style calls are deliberately not flagged. Warn in `v2`, error in `v2-strict` by explicit opt-in.                                                                                                                                                                                                                                                       |

### `v2-strict` additions

| Rule                                 | Level | Confidence          | Notes                                                                                                                                                                                                                                                                                             |
| :----------------------------------- | :---- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-module-scope-reactive-primitive` | error | Certain in context  | Module-scope reactive state _is_ shared across SSR requests; the "context" (SSR vs client-only app) is exactly what the strict config opts into. Wrapping in any function (incl. `createRoot`) is the escape.                                                                                     |
| `prefer-onSettled-for-side-effects`  | warn  | Heuristic           | Known-call list (timers, global listeners, observers) plus component-likeness inference; warn by design.                                                                                                                                                                                          |
| `no-restated-default-options`        | error | Certain (after fix) | **Fixed in this audit.** Previously matched `<For>`/`<Show>`/`<Match>` by element name alone, so a same-named component from another library would have its (differently-defaulted) prop deleted by the autofix. Now resolves through the import map (aliases included) and additionally accepts _unbound_ names, which the compiler auto-imports as the Solid built-ins; names bound to other imports or local declarations are skipped. |

### Rules kept off in `v2`

`no-react-deps` (premise gone in 2.0), `prefer-classlist` (anti-advice in 2.0),
`no-array-handlers`, `prefer-show` (style opt-ins), `no-proxy-apis` (niche
constraint). Off is the correct level for anti-advice and narrow preferences.

## Maintenance

When adding a rule or messageId, classify it against the policy above: if the
detection involves inference, it ships at warn with a documented escape; error
level requires the report to be a structural fact. When a false positive is
found in an error-level rule, fix the precision before considering demotion.
