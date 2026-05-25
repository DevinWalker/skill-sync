use crate::paths::Paths;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub enum PlanAction {
    Create,
    Update,
    Skip,
    Refuse,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct PlanRow {
    pub skill: String,
    pub target: String,
    pub action: PlanAction,
    pub source: PathBuf,
    pub destination: PathBuf,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct SyncPlan {
    pub rows: Vec<PlanRow>,
}

pub struct Input<'a> {
    pub paths: &'a Paths,
    pub source_root: &'a Path,
    pub mine_skills: &'a [(String, PathBuf)],
    pub targets: &'a [(String, PathBuf)],
}

pub fn plan(input: &Input) -> SyncPlan {
    let denylist = [
        input.paths.agents_skills(),
        input.paths.claude_plugins(),
        input.paths.codex_skills().join(".system"),
        input.paths.cursor_skills_cursor(),
    ];
    let mut rows = Vec::new();
    for (skill, source) in input.mine_skills {
        for (tname, install_dir) in input.targets {
            let dest = install_dir.join(skill);
            // Refusal 1: install dir resolves under a denylist root
            let real_dest_parent = std::fs::canonicalize(install_dir).ok();
            let refused_root = real_dest_parent
                .as_ref()
                .map(|p| denylist.iter().any(|d| p.starts_with(d)))
                .unwrap_or(false);
            if refused_root {
                rows.push(PlanRow {
                    skill: skill.clone(),
                    target: tname.clone(),
                    action: PlanAction::Refuse,
                    source: source.clone(),
                    destination: dest,
                    reason: Some("destination under bundle/builtin root".into()),
                });
                continue;
            }
            // Refusal 2: destination is itself a symlink
            if let Ok(meta) = std::fs::symlink_metadata(&dest) {
                if meta.file_type().is_symlink() {
                    rows.push(PlanRow {
                        skill: skill.clone(),
                        target: tname.clone(),
                        action: PlanAction::Refuse,
                        source: source.clone(),
                        destination: dest,
                        reason: Some("destination is a symlink".into()),
                    });
                    continue;
                }
            }
            // Refusal 3: install dir doesn't exist
            if !install_dir.exists() {
                rows.push(PlanRow {
                    skill: skill.clone(),
                    target: tname.clone(),
                    action: PlanAction::Refuse,
                    source: source.clone(),
                    destination: dest,
                    reason: Some("target install dir missing".into()),
                });
                continue;
            }
            // Compare hashes for Skip vs Update; Create if dest missing
            if dest.exists() {
                let h_src = crate::identity::content_hash(source).unwrap_or_default();
                let h_dst = crate::identity::content_hash(&dest).unwrap_or_default();
                rows.push(PlanRow {
                    skill: skill.clone(),
                    target: tname.clone(),
                    action: if h_src == h_dst { PlanAction::Skip } else { PlanAction::Update },
                    source: source.clone(),
                    destination: dest,
                    reason: None,
                });
            } else {
                rows.push(PlanRow {
                    skill: skill.clone(),
                    target: tname.clone(),
                    action: PlanAction::Create,
                    source: source.clone(),
                    destination: dest,
                    reason: None,
                });
            }
        }
    }
    SyncPlan { rows }
}

use crate::trash::MoveArchive;

pub fn execute(
    plan: &SyncPlan,
    archiver: &dyn MoveArchive,
    archive_root: &std::path::Path,
) -> std::io::Result<()> {
    for row in &plan.rows {
        match row.action {
            PlanAction::Refuse | PlanAction::Skip => continue,
            PlanAction::Update => {
                let label = format!("{}-{}", row.target, row.skill);
                archiver.archive(&row.destination, archive_root, &label)?;
                copy_dir(&row.source, &row.destination)?;
            }
            PlanAction::Create => copy_dir(&row.source, &row.destination)?,
        }
    }
    let _ = crate::audit::append_event(
        "sync.execute",
        serde_json::json!({ "rows": plan.rows.len() }),
    );
    Ok(())
}

pub fn pull_back(
    source: &std::path::Path,
    dest: &std::path::Path,
    archiver: &dyn crate::trash::MoveArchive,
    archive_root: &std::path::Path,
    label: &str,
) -> std::io::Result<()> {
    if !dest.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "target missing",
        ));
    }
    if std::fs::symlink_metadata(source)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "source is a symlink — refusing",
        ));
    }
    if source.exists() {
        archiver.archive(source, archive_root, label)?;
    }
    copy_dir(dest, source)?;
    let _ = crate::audit::append_event(
        "sync.pull_back",
        serde_json::json!({ "label": label }),
    );
    Ok(())
}

fn copy_dir(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::create_dir_all(dst)?;
    for entry in walkdir::WalkDir::new(src)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let rel = entry.path().strip_prefix(src).unwrap();
        if rel.as_os_str().is_empty() {
            continue;
        }
        let to = dst.join(rel);
        let ft = entry.file_type();
        if ft.is_symlink() {
            let target = std::fs::read_link(entry.path())?;
            if let Some(p) = to.parent() {
                std::fs::create_dir_all(p)?;
            }
            std::os::unix::fs::symlink(&target, &to)?;
        } else if ft.is_dir() {
            std::fs::create_dir_all(&to)?;
        } else if ft.is_file() {
            if let Some(p) = to.parent() {
                std::fs::create_dir_all(p)?;
            }
            std::fs::copy(entry.path(), &to)?;
            let mode = entry.metadata()?.permissions().mode();
            std::fs::set_permissions(&to, std::fs::Permissions::from_mode(mode))?;
        }
    }
    Ok(())
}
