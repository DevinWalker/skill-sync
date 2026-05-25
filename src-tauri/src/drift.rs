use serde::Serialize;
use std::path::Path;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
#[serde(rename_all = "kebab-case")]
pub enum DriftStatus {
    InSync,
    DriftedTargetNewer,
    DriftedSourceNewer,
    MissingInTarget,
    Unmanaged,
    Refused,
}

pub fn status_for(source: &Path, dest: &Path) -> std::io::Result<DriftStatus> {
    match std::fs::symlink_metadata(dest) {
        Ok(meta) if meta.file_type().is_symlink() => return Ok(DriftStatus::Unmanaged),
        Err(_) => return Ok(DriftStatus::MissingInTarget),
        _ => {}
    }
    let h_src = crate::identity::content_hash(source)?;
    let h_dst = crate::identity::content_hash(dest)?;
    if h_src == h_dst {
        return Ok(DriftStatus::InSync);
    }
    let m_src = std::fs::metadata(source)?.modified()?;
    let m_dst = std::fs::metadata(dest)?.modified()?;
    Ok(if m_dst > m_src {
        DriftStatus::DriftedTargetNewer
    } else {
        DriftStatus::DriftedSourceNewer
    })
}
