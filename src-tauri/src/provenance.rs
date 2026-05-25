use crate::discovery::CandidateLocation;
use crate::paths::Paths;
use serde::Serialize;
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub enum Class {
    ToolBuiltin,
    Bundle,
    MineHeuristic,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub enum Signal {
    CodexSystemPath,
    CursorBuiltinPath,
    ClaudePluginPath,
    AgentsRoot,
    ExternalBundleRoot,
    SymlinkIntoBundle,
    KnownBundleName,
    FreshUserDir,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct Provenance {
    pub class: Class,
    pub signals: Vec<Signal>,
}

fn under(p: &Path, root: &Path) -> bool {
    p.starts_with(root)
}

pub fn classify(
    loc: &CandidateLocation,
    paths: &Paths,
    known_bundles: &[String],
    external_bundle_roots: &[PathBuf],
) -> Provenance {
    let r = &loc.real_path;
    let p = &loc.path;
    let mut signals = Vec::new();

    // 1. Tool built-in: Codex .system
    if r.ancestors().any(|a| a == paths.codex_skills().join(".system")) {
        signals.push(Signal::CodexSystemPath);
        return Provenance { class: Class::ToolBuiltin, signals };
    }
    // 1. Tool built-in: Cursor skills-cursor
    if under(r, &paths.cursor_skills_cursor()) {
        signals.push(Signal::CursorBuiltinPath);
        return Provenance { class: Class::ToolBuiltin, signals };
    }
    // 1. Tool built-in: Claude plugins cache
    if under(r, &paths.claude_plugins()) {
        signals.push(Signal::ClaudePluginPath);
        return Provenance { class: Class::ToolBuiltin, signals };
    }
    // 2. Symlink whose target is outside user source roots (more specific than raw root match)
    if loc.is_symlink {
        let in_source = under(r, &paths.claude_skills())
            || under(r, &paths.codex_skills())
            || under(r, &paths.cursor_skills());
        if !in_source {
            signals.push(Signal::SymlinkIntoBundle);
            return Provenance { class: Class::Bundle, signals };
        }
    }
    // 3. External bundle: Agents root
    if under(r, &paths.agents_skills()) {
        signals.push(Signal::AgentsRoot);
        return Provenance { class: Class::Bundle, signals };
    }
    // 4. External bundle: user-declared roots
    for ext in external_bundle_roots {
        if under(r, ext) {
            signals.push(Signal::ExternalBundleRoot);
            return Provenance { class: Class::Bundle, signals };
        }
    }
    // 5. Known bundle name list
    if known_bundles.iter().any(|n| n.as_str() == loc.dir_name.as_str()) {
        signals.push(Signal::KnownBundleName);
        return Provenance { class: Class::Bundle, signals };
    }
    // 6. Fresh user dir under one of the user source roots
    let in_user_source = under(p, &paths.claude_skills())
        || under(p, &paths.codex_skills())
        || under(p, &paths.cursor_skills());
    if in_user_source && !loc.is_symlink {
        signals.push(Signal::FreshUserDir);
        return Provenance { class: Class::MineHeuristic, signals };
    }
    // Fallback
    Provenance { class: Class::Unknown, signals }
}
