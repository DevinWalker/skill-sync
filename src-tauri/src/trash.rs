use std::path::{Path, PathBuf};

/// Move a directory out of the way (so it can be overwritten) into a stamped
/// archive location. Real implementation routes through Finder Trash;
/// test implementation just moves into a sibling dir.
pub trait MoveArchive {
    fn archive(&self, src: &Path, archive_root: &Path, label: &str) -> std::io::Result<PathBuf>;
}

/// Production: rename src into archive_root/<stamp>-<label>/, then send that to Trash.
pub struct TrashAction;

impl MoveArchive for TrashAction {
    fn archive(&self, src: &Path, archive_root: &Path, label: &str) -> std::io::Result<PathBuf> {
        std::fs::create_dir_all(archive_root)?;
        let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%S");
        let dest = archive_root.join(format!("{stamp}-{label}"));
        std::fs::create_dir_all(&dest)?;
        let target = dest.join(src.file_name().ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::InvalidInput, "src has no file name")
        })?);
        std::fs::rename(src, &target)?;
        trash::delete(&target).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
        })?;
        Ok(target)
    }
}

/// Tests: rename into a stamped dir but skip the Trash step.
pub struct MoveToDir;

impl MoveArchive for MoveToDir {
    fn archive(&self, src: &Path, archive_root: &Path, label: &str) -> std::io::Result<PathBuf> {
        std::fs::create_dir_all(archive_root)?;
        let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%S");
        let dest = archive_root
            .join(format!("{stamp}-{label}"))
            .join(src.file_name().ok_or_else(|| {
                std::io::Error::new(std::io::ErrorKind::InvalidInput, "src has no file name")
            })?);
        if let Some(p) = dest.parent() {
            std::fs::create_dir_all(p)?;
        }
        std::fs::rename(src, &dest)?;
        Ok(dest)
    }
}
