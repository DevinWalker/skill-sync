use skill_sync::discovery::discover_in_root;
use std::fs;
use tempfile::tempdir;

#[test]
fn discovers_skills_with_skill_md_at_depth_one() {
    let dir = tempdir().unwrap();
    let a = dir.path().join("alpha");
    fs::create_dir_all(&a).unwrap();
    fs::write(a.join("SKILL.md"), "---\nname: alpha\n---\nbody\n").unwrap();
    let b = dir.path().join("not-a-skill");
    fs::create_dir_all(&b).unwrap();
    fs::write(b.join("README.md"), "no skill md").unwrap();

    let found = discover_in_root(dir.path()).unwrap();
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].dir_name, "alpha");
}

#[test]
fn flags_symlink_locations() {
    let dir = tempdir().unwrap();
    let real = dir.path().join("real-skill");
    fs::create_dir_all(&real).unwrap();
    fs::write(real.join("SKILL.md"), "---\nname: real\n---\n").unwrap();
    let link = dir.path().join("link-skill");
    std::os::unix::fs::symlink(&real, &link).unwrap();

    let mut found = discover_in_root(dir.path()).unwrap();
    found.sort_by(|a, b| a.dir_name.cmp(&b.dir_name));
    assert_eq!(found.len(), 2);
    let link_entry = found.iter().find(|c| c.dir_name == "link-skill").unwrap();
    assert!(link_entry.is_symlink);
    assert_eq!(link_entry.real_path, real.canonicalize().unwrap());
}
