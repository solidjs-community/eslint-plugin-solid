//! solid-lint CLI - A fast linter for SolidJS applications

use std::path::PathBuf;
use std::process::ExitCode;

use clap::Parser;
use colored::Colorize;
use ignore::WalkBuilder;
use oxc_allocator::Allocator;
use oxc_parser::Parser as OxcParser;
use oxc_span::SourceType;

use solid_linter::{LintContext, Diagnostic};
use solid_linter::rules::*;

#[derive(Parser)]
#[command(name = "solid-lint")]
#[command(about = "A fast linter for SolidJS applications", long_about = None)]
#[command(version)]
struct Cli {
    /// Files or directories to lint
    #[arg(default_value = ".")]
    paths: Vec<PathBuf>,

    /// Fix auto-fixable problems
    #[arg(short, long)]
    fix: bool,

    /// Quiet mode - only show errors
    #[arg(short, long)]
    quiet: bool,

    /// Output format (text, json)
    #[arg(long, default_value = "text")]
    format: String,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let mut total_errors = 0;
    let mut total_warnings = 0;
    let mut files_checked = 0;

    for path in &cli.paths {
        let walker = WalkBuilder::new(path)
            .hidden(true)
            .git_ignore(true)
            .build();

        for entry in walker.filter_map(Result::ok) {
            let path = entry.path();
            
            if !path.is_file() {
                continue;
            }

            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !matches!(ext, "js" | "jsx" | "ts" | "tsx" | "mjs" | "cjs") {
                continue;
            }

            let source = match std::fs::read_to_string(path) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("{}: {}", path.display(), e);
                    continue;
                }
            };

            let diagnostics = lint_file(&source, path.to_str().unwrap_or(""));
            files_checked += 1;

            if !diagnostics.is_empty() {
                if cli.format == "json" {
                    // JSON output
                    for d in &diagnostics {
                        println!(
                            r#"{{"file":"{}","line":{},"column":{},"rule":"{}","message":"{}","severity":"{}"}}"#,
                            path.display(),
                            get_line(&source, d.span.start as usize),
                            get_column(&source, d.span.start as usize),
                            d.rule,
                            d.message.replace('"', "\\\""),
                            match d.severity {
                                solid_linter::diagnostic::Severity::Error => "error",
                                solid_linter::diagnostic::Severity::Warning => "warning",
                            }
                        );
                    }
                } else {
                    // Text output
                    println!("\n{}", path.display().to_string().underline());
                    for d in &diagnostics {
                        let line = get_line(&source, d.span.start as usize);
                        let col = get_column(&source, d.span.start as usize);
                        let severity = match d.severity {
                            solid_linter::diagnostic::Severity::Error => "error".red(),
                            solid_linter::diagnostic::Severity::Warning => "warning".yellow(),
                        };
                        println!(
                            "  {}:{} {} {} {}",
                            line.to_string().dimmed(),
                            col.to_string().dimmed(),
                            severity,
                            d.message,
                            d.rule.dimmed()
                        );
                        if let Some(help) = &d.help {
                            println!("    {} {}", "help:".cyan(), help);
                        }
                    }
                }

                for d in &diagnostics {
                    match d.severity {
                        solid_linter::diagnostic::Severity::Error => total_errors += 1,
                        solid_linter::diagnostic::Severity::Warning => total_warnings += 1,
                    }
                }
            }
        }
    }

    if cli.format != "json" {
        println!();
        if total_errors == 0 && total_warnings == 0 {
            println!(
                "{} {} files checked",
                "✓".green(),
                files_checked
            );
        } else {
            println!(
                "{} {} problems ({} errors, {} warnings) in {} files",
                "✖".red(),
                total_errors + total_warnings,
                total_errors,
                total_warnings,
                files_checked
            );
        }
    }

    if total_errors > 0 {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    }
}

fn lint_file(source: &str, _filename: &str) -> Vec<Diagnostic> {
    let allocator = Allocator::default();
    let source_type = SourceType::default()
        .with_module(true)
        .with_jsx(true);

    let parser = OxcParser::new(&allocator, source, source_type);
    let parsed = parser.parse();

    if !parsed.errors.is_empty() {
        return vec![];
    }

    let ctx = LintContext::new(source, source_type);
    let program = &parsed.program;
    let mut diagnostics = Vec::new();

    // Run all rules
    diagnostics.extend(Reactivity::new().check_program(program, &ctx));
    diagnostics.extend(JsxNoDuplicateProps::new().check_program(program, &ctx));
    diagnostics.extend(NoDestructure::new().check_program(program, &ctx));
    diagnostics.extend(SelfClosingComp::new().check_program(program, &ctx));
    diagnostics.extend(ComponentsReturnOnce::new().check_program(program, &ctx));
    diagnostics.extend(EventHandlers::new().check_program(program, &ctx));
    diagnostics.extend(JsxNoScriptUrl::new().check_program(program, &ctx));
    diagnostics.extend(NoInnerhtml::new().check_program(program, &ctx));
    diagnostics.extend(NoReactSpecificProps::new().check_program(program, &ctx));
    diagnostics.extend(PreferFor::new().check_program(program, &ctx));
    diagnostics.extend(PreferShow::new().check_program(program, &ctx));
    diagnostics.extend(NoUnknownNamespaces::new().check_program(program, &ctx));
    diagnostics.extend(Imports::new().check_program(program, &ctx));
    diagnostics.extend(NoReactDeps::new().check_program(program, &ctx));
    diagnostics.extend(NoProxyApis::new().check_program(program, &ctx));
    diagnostics.extend(NoArrayHandlers::new().check_program(program, &ctx));
    diagnostics.extend(JsxNoUndef::new().check_program(program, &ctx));
    diagnostics.extend(PreferClasslist::new().check_program(program, &ctx));
    diagnostics.extend(StyleProp::new().check_program(program, &ctx));
    
    // New rules
    diagnostics.extend(NoConditionalSignals::new().check_program(program, &ctx));
    diagnostics.extend(PreferOn::new().check_program(program, &ctx));
    diagnostics.extend(NoSignalBooleanCoercion::new().check_program(program, &ctx));
    diagnostics.extend(ConsistentSignalNaming::new().check_program(program, &ctx));
    diagnostics.extend(NoTopLevelEffects::new().check_program(program, &ctx));
    diagnostics.extend(PreferBatch::new().check_program(program, &ctx));
    diagnostics.extend(NoDirectStoreMutation::new().check_program(program, &ctx));
    diagnostics.extend(RequireContextDefault::new().check_program(program, &ctx));
    diagnostics.extend(NoSignalInRenderBody::new().check_program(program, &ctx));
    diagnostics.extend(NoUnusedSignals::new().check_program(program, &ctx));

    diagnostics
}

fn get_line(source: &str, byte_offset: usize) -> usize {
    source[..byte_offset.min(source.len())]
        .chars()
        .filter(|&c| c == '\n')
        .count()
        + 1
}

fn get_column(source: &str, byte_offset: usize) -> usize {
    let offset = byte_offset.min(source.len());
    let line_start = source[..offset].rfind('\n').map(|i| i + 1).unwrap_or(0);
    offset - line_start + 1
}
