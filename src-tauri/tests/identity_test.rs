use skill_sync::identity::content_hash;
use std::fs;
use tempfile::tempdir;

#[test]
fn identical_dirs_have_identical_hash() {
    let a = tempdir().unwrap();
    let b = tempdir().unwrap();
    for d in [&a, &b] {
        fs::write(d.path().join("SKILL.md"), "---\nname: x\n---\n").unwrap();
        fs::create_dir_all(d.path().join("references")).unwrap();
        fs::write(d.path().join("references/r.md"), "ref\n").unwrap();
    }
    assert_eq!(content_hash(a.path()).unwrap(), content_hash(b.path()).unwrap());
}

#[test]
fn modifying_a_file_changes_the_hash() {
    let a = tempdir().unwrap();
    fs::write(a.path().join("SKILL.md"), "---\nname: x\n---\n").unwrap();
    let h1 = content_hash(a.path()).unwrap();
    fs::write(a.path().join("SKILL.md"), "---\nname: x\n---\ny\n").unwrap();
    let h2 = content_hash(a.path()).unwrap();
    assert_ne!(h1, h2);
}

#[test]
fn ignores_ds_store_and_tmp_files() {
    let a = tempdir().unwrap();
    let b = tempdir().unwrap();
    fs::write(a.path().join("SKILL.md"), "x").unwrap();
    fs::write(b.path().join("SKILL.md"), "x").unwrap();
    fs::write(b.path().join(".DS_Store"), "junk").unwrap();
    fs::write(b.path().join("foo.swp"), "junk").unwrap();
    assert_eq!(content_hash(a.path()).unwrap(), content_hash(b.path()).unwrap());
}
