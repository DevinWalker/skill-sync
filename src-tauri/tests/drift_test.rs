use skill_sync::drift::{status_for, DriftStatus};
use std::fs;
use tempfile::tempdir;

fn write_skill(dir: &std::path::Path, body: &str) {
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("SKILL.md"), format!("---\nname: x\n---\n{body}\n")).unwrap();
}

#[test]
fn in_sync_when_hashes_match() {
    let d = tempdir().unwrap();
    let s = d.path().join("src");
    let t = d.path().join("dst");
    write_skill(&s, "same");
    write_skill(&t, "same");
    assert!(matches!(status_for(&s, &t).unwrap(), DriftStatus::InSync));
}

#[test]
fn missing_when_dest_absent() {
    let d = tempdir().unwrap();
    let s = d.path().join("src");
    write_skill(&s, "x");
    assert!(matches!(
        status_for(&s, &d.path().join("dst")).unwrap(),
        DriftStatus::MissingInTarget
    ));
}

#[test]
fn unmanaged_when_dest_is_symlink() {
    let d = tempdir().unwrap();
    let s = d.path().join("src");
    write_skill(&s, "x");
    let elsewhere = d.path().join("elsewhere");
    write_skill(&elsewhere, "x");
    let link = d.path().join("dst");
    std::os::unix::fs::symlink(&elsewhere, &link).unwrap();
    assert!(matches!(status_for(&s, &link).unwrap(), DriftStatus::Unmanaged));
}

#[test]
fn drifted_target_newer_when_dest_modified_later() {
    let d = tempdir().unwrap();
    let s = d.path().join("src");
    let t = d.path().join("dst");
    write_skill(&s, "old");
    std::thread::sleep(std::time::Duration::from_millis(20));
    write_skill(&t, "new");
    assert!(matches!(
        status_for(&s, &t).unwrap(),
        DriftStatus::DriftedTargetNewer
    ));
}
