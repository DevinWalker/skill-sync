use serde::Serialize;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum ScaffoldError {
    #[error("invalid name: {0}")]
    InvalidName(String),
    #[error("a skill called {0} already exists")]
    Duplicate(String),
    #[error("source root is not set")]
    SourceRootUnset,
    #[error("io error: {0}")]
    Io(String),
}

const NAME_RE: &str = r"^[a-z0-9-]+$";

pub fn validate_name(name: &str) -> Result<(), ScaffoldError> {
    use regex::Regex;
    if name.is_empty() || name.len() > 64 {
        return Err(ScaffoldError::InvalidName(format!(
            "{} chars (must be 1..=64)",
            name.len()
        )));
    }
    let re = Regex::new(NAME_RE).unwrap();
    if !re.is_match(name) {
        return Err(ScaffoldError::InvalidName(
            "use lowercase letters, digits, and dashes only".into(),
        ));
    }
    Ok(())
}

pub fn scaffold_at(source_root: &Path, name: &str, description: &str) -> Result<PathBuf, ScaffoldError> {
    validate_name(name)?;
    let skill_dir = source_root.join(name);
    if skill_dir.exists() {
        return Err(ScaffoldError::Duplicate(name.into()));
    }
    std::fs::create_dir_all(&skill_dir).map_err(|e| ScaffoldError::Io(e.to_string()))?;
    let skill_md = skill_dir.join("SKILL.md");
    let body = format!(
        "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n<!-- Replace this with your skill content. -->\n",
        name, description, name
    );
    std::fs::write(&skill_md, body).map_err(|e| ScaffoldError::Io(e.to_string()))?;
    Ok(skill_md)
}

#[tauri::command]
pub fn cmd_scaffold_skill(name: String, description: String) -> Result<PathBuf, String> {
    use crate::config::{load_or_init, settings::Settings};
    use crate::paths::Paths;
    let home = dirs::home_dir().ok_or("no home dir")?;
    let paths = Paths::for_home(home.clone());
    let settings: Settings = load_or_init(&paths.config_dir().join("settings.json"), Settings::defaults(&home))
        .map_err(|e| e.to_string())?;
    scaffold_at(&settings.source_root, &name, &description).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn rejects_empty_name() {
        assert!(matches!(validate_name(""), Err(ScaffoldError::InvalidName(_))));
    }

    #[test]
    fn rejects_spaces() {
        assert!(matches!(validate_name("hello world"), Err(ScaffoldError::InvalidName(_))));
    }

    #[test]
    fn rejects_uppercase() {
        assert!(matches!(validate_name("HelloWorld"), Err(ScaffoldError::InvalidName(_))));
    }

    #[test]
    fn accepts_valid_kebab() {
        assert!(validate_name("my-cool-skill").is_ok());
    }

    #[test]
    fn scaffolds_directory_and_skill_md() {
        let td = TempDir::new().unwrap();
        let p = scaffold_at(td.path(), "test-skill", "Does a test thing.").unwrap();
        assert!(p.ends_with("test-skill/SKILL.md"));
        let body = std::fs::read_to_string(&p).unwrap();
        assert!(body.contains("name: test-skill"));
        assert!(body.contains("description: Does a test thing."));
        assert!(body.contains("# test-skill"));
    }

    #[test]
    fn rejects_duplicate() {
        let td = TempDir::new().unwrap();
        scaffold_at(td.path(), "dup", "first").unwrap();
        let err = scaffold_at(td.path(), "dup", "second").unwrap_err();
        assert!(matches!(err, ScaffoldError::Duplicate(_)));
    }
}
