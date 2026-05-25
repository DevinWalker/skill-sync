use serde::Serialize;
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct CandidateLocation {
    pub dir_name: String,
    pub path: PathBuf,
    pub real_path: PathBuf,
    pub is_symlink: bool,
}

pub fn discover_in_root(root: &Path) -> std::io::Result<Vec<CandidateLocation>> {
    let mut out = Vec::new();
    if !root.exists() {
        return Ok(out);
    }
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        let meta = std::fs::symlink_metadata(&path)?;
        let is_symlink = meta.file_type().is_symlink();
        let real_path = std::fs::canonicalize(&path)?;
        if !real_path.is_dir() {
            continue;
        }
        if !real_path.join("SKILL.md").exists() {
            continue;
        }
        out.push(CandidateLocation { dir_name: name, path, real_path, is_symlink });
    }
    Ok(out)
}
