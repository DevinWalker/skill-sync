use skill_sync::trash::{MoveArchive, MoveToDir};
use std::fs;
use tempfile::tempdir;

#[test]
fn move_to_dir_relocates_and_stamps() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("payload");
    fs::create_dir(&src).unwrap();
    fs::write(src.join("a.txt"), "hi").unwrap();
    let archive_root = dir.path().join("archive");
    let dest = MoveToDir.archive(&src, &archive_root, "claude-foo").unwrap();
    assert!(dest.join("a.txt").exists(), "moved file should exist at dest");
    assert!(!src.exists(), "src should have been renamed away");
    // dest should be under archive_root and contain "claude-foo" in its parent dir name
    assert!(dest.starts_with(&archive_root));
    let parent_name = dest.parent().unwrap().file_name().unwrap().to_string_lossy();
    assert!(parent_name.ends_with("-claude-foo"));
}
