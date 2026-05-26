use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct Settings {
    pub version: u32,
    pub source_root: PathBuf,
    pub package_output_dir: PathBuf,
    pub show_builtins: bool,
    pub external_bundle_roots: Vec<PathBuf>,
    pub enabled_targets: Vec<String>,
    pub cowork_package_enabled: bool,
    pub theme: String,
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default)]
    pub first_run_completed: bool,
    #[serde(default)]
    pub mode_migration_announced: bool,
}

fn default_mode() -> String {
    "pro".into() // Existing installs migrate to pro; new installs override to "simple" via first-run.
}

impl Settings {
    pub fn defaults(home: &std::path::Path) -> Self {
        Self {
            version: 1,
            source_root: home.join(".claude/skills"),
            package_output_dir: home.join("Downloads"),
            show_builtins: false,
            external_bundle_roots: vec![home.join(".agents/skills")],
            enabled_targets: vec!["claude".into(), "codex".into(), "cursor".into()],
            cowork_package_enabled: true,
            theme: "system".into(),
            mode: "simple".into(),
            first_run_completed: false,
            mode_migration_announced: false,
        }
    }
}
