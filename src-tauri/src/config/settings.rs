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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializing_legacy_settings_fills_mode_with_pro() {
        let legacy_json = r#"{
            "version": 1,
            "source_root": "/tmp/x",
            "package_output_dir": "/tmp/y",
            "show_builtins": false,
            "external_bundle_roots": [],
            "enabled_targets": ["claude"],
            "cowork_package_enabled": true,
            "theme": "dark"
        }"#;
        let settings: Settings = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(settings.mode, "pro");
        assert!(!settings.first_run_completed);
        assert!(!settings.mode_migration_announced);
    }

    #[test]
    fn fresh_defaults_use_simple_mode() {
        let home = std::path::Path::new("/tmp/home");
        let s = Settings::defaults(home);
        assert_eq!(s.mode, "simple");
        assert!(!s.first_run_completed);
    }
}
