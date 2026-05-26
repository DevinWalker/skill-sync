use serde::Serialize;
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct GitStatus {
    pub branch: String,
    pub uncommitted: u32,
    pub ahead: u32,
    pub behind: u32,
    pub has_upstream: bool,
}

pub fn git_status_at(path: &Path) -> Option<GitStatus> {
    use git2::{Repository, StatusOptions};

    let repo = Repository::discover(path).ok()?;
    let head = repo.head().ok()?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.include_ignored(false);
    let statuses = repo.statuses(Some(&mut opts)).ok()?;
    let uncommitted = statuses.iter().filter(|e| !e.status().is_empty()).count() as u32;

    let mut ahead = 0u32;
    let mut behind = 0u32;
    let mut has_upstream = false;
    if let Ok(local_oid) = head.peel_to_commit().map(|c| c.id()) {
        if let Ok(branch_obj) = repo.find_branch(&branch, git2::BranchType::Local) {
            if let Ok(upstream) = branch_obj.upstream() {
                has_upstream = true;
                if let Ok(upstream_oid) = upstream.into_reference().peel_to_commit().map(|c| c.id()) {
                    if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
                        ahead = a as u32;
                        behind = b as u32;
                    }
                }
            }
        }
    }

    Some(GitStatus {
        branch,
        uncommitted,
        ahead,
        behind,
        has_upstream,
    })
}

#[tauri::command]
pub fn cmd_git_status(path: PathBuf) -> Result<Option<GitStatus>, String> {
    Ok(git_status_at(&path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::process::Command;

    fn git(td: &TempDir, args: &[&str]) {
        let out = Command::new("git")
            .args(args)
            .current_dir(td.path())
            .output()
            .expect("git command");
        assert!(out.status.success(), "git {:?} failed: {}", args, String::from_utf8_lossy(&out.stderr));
    }

    #[test]
    fn returns_none_outside_repo() {
        let td = TempDir::new().unwrap();
        assert!(git_status_at(td.path()).is_none());
    }

    #[test]
    fn returns_branch_and_clean_status() {
        let td = TempDir::new().unwrap();
        git(&td, &["init", "-q", "-b", "main"]);
        git(&td, &["config", "user.email", "test@example.com"]);
        git(&td, &["config", "user.name", "Test"]);
        std::fs::write(td.path().join("a.txt"), "hi").unwrap();
        git(&td, &["add", "a.txt"]);
        git(&td, &["commit", "-q", "-m", "init"]);

        let s = git_status_at(td.path()).unwrap();
        assert_eq!(s.branch, "main");
        assert_eq!(s.uncommitted, 0);
        assert_eq!(s.ahead, 0);
        assert_eq!(s.behind, 0);
        assert!(!s.has_upstream);
    }

    #[test]
    fn counts_uncommitted_files() {
        let td = TempDir::new().unwrap();
        git(&td, &["init", "-q", "-b", "main"]);
        git(&td, &["config", "user.email", "test@example.com"]);
        git(&td, &["config", "user.name", "Test"]);
        std::fs::write(td.path().join("a.txt"), "hi").unwrap();
        git(&td, &["add", "a.txt"]);
        git(&td, &["commit", "-q", "-m", "init"]);
        std::fs::write(td.path().join("b.txt"), "new").unwrap();
        std::fs::write(td.path().join("a.txt"), "modified").unwrap();

        let s = git_status_at(td.path()).unwrap();
        assert_eq!(s.uncommitted, 2);
    }
}
