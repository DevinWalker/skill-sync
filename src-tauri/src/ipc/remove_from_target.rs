use std::path::PathBuf;

use crate::{
    paths::Paths,
    trash::{MoveArchive, TrashAction},
};

#[derive(Debug, serde::Serialize, ts_rs::TS)]
#[ts(export, export_to = "../../../src/types/bindings.ts")]
pub struct RemoveResult {
    pub archived_to: PathBuf,
}

// Module-level (NOT cfg(test)) — production + tests both call this.
fn remove_inner(
    paths: &Paths,
    archiver: &dyn MoveArchive,
    skill: &str,
    target: &str,
) -> Result<RemoveResult, String> {
    let target_root = match target {
        "claude" => paths.claude_skills(),
        "codex"  => paths.codex_skills(),
        "cursor" => paths.cursor_skills(),
        "cowork" => return Err("cowork is package-only".into()),
        other    => return Err(format!("unknown target: {other}")),
    };

    let skill_path = target_root.join(skill);
    if !skill_path.exists() {
        return Err(format!("{} does not exist", skill_path.display()));
    }
    let meta = std::fs::symlink_metadata(&skill_path).map_err(|e| e.to_string())?;
    if meta.file_type().is_symlink() {
        return Err("refusing to remove a symlink".into());
    }

    let archive_root = paths.trash_archive_root();
    let label = format!("{target}-{skill}");
    let archived_to = archiver
        .archive(&skill_path, &archive_root, &label)
        .map_err(|e| format!("could not archive {skill}: {e}"))?;

    let _ = crate::audit::append_event(
        "target.remove",
        serde_json::json!({
            "skill": skill,
            "target": target,
            "archived_to": archived_to.display().to_string(),
        }),
    );

    Ok(RemoveResult { archived_to })
}

#[tauri::command]
pub fn cmd_remove_from_target(skill: String, target: String) -> Result<RemoveResult, String> {
    let home = dirs::home_dir().ok_or_else(|| "no home dir".to_string())?;
    let paths = Paths::for_home(home);
    remove_inner(&paths, &TrashAction, &skill, &target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{paths::Paths, trash::MoveToDir};

    fn setup_skill(home: &std::path::Path, target: &str, name: &str) -> PathBuf {
        let target_root = match target {
            "claude" => home.join(".claude/skills"),
            "codex"  => home.join(".codex/skills"),
            "cursor" => home.join(".cursor/skills"),
            _ => panic!("bad target"),
        };
        let skill = target_root.join(name);
        std::fs::create_dir_all(&skill).unwrap();
        std::fs::write(skill.join("SKILL.md"), "stub").unwrap();
        skill
    }

    #[test]
    fn archives_directory_then_removes_it() {
        let tmp = tempfile::tempdir().unwrap();
        let original = setup_skill(tmp.path(), "claude", "demo");
        let paths = Paths::for_home(tmp.path().to_path_buf());
        let res = remove_inner(&paths, &MoveToDir, "demo", "claude").expect("ok");
        assert!(!original.exists(), "original removed");
        assert!(
            !res.archived_to.as_os_str().is_empty(),
            "archived_to recorded",
        );
    }

    #[cfg(unix)]
    #[test]
    fn refuses_symlink() {
        let tmp = tempfile::tempdir().unwrap();
        let real = setup_skill(tmp.path(), "claude", "real");
        let link = tmp.path().join(".claude/skills/linked");
        std::os::unix::fs::symlink(&real, &link).unwrap();
        let paths = Paths::for_home(tmp.path().to_path_buf());
        let err = remove_inner(&paths, &MoveToDir, "linked", "claude").unwrap_err();
        assert!(err.contains("symlink"), "got: {err}");
    }

    #[test]
    fn missing_path_errors() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join(".claude/skills")).unwrap();
        let paths = Paths::for_home(tmp.path().to_path_buf());
        let err = remove_inner(&paths, &MoveToDir, "nope", "claude").unwrap_err();
        assert!(err.contains("does not exist"), "got: {err}");
    }

    #[test]
    fn cowork_rejected() {
        let tmp = tempfile::tempdir().unwrap();
        let paths = Paths::for_home(tmp.path().to_path_buf());
        let err = remove_inner(&paths, &MoveToDir, "x", "cowork").unwrap_err();
        assert!(err.contains("package-only"));
    }
}
