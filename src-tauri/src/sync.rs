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
