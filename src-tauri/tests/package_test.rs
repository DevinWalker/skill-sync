use skill_sync::package::build_skill_package;
use std::fs;
use tempfile::tempdir;

#[test]
fn writes_a_skill_archive_with_expected_layout() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("myskill");
    fs::create_dir_all(src.join("references")).unwrap();
    fs::write(src.join("SKILL.md"), "---\nname: myskill\n---\nbody\n").unwrap();
    fs::write(src.join("references/r.md"), "ref\n").unwrap();
    fs::write(src.join(".DS_Store"), "junk").unwrap();
    let out = dir.path().join("myskill.skill");
    build_skill_package("myskill", &src, &out).unwrap();
    assert!(out.exists());

    let f = fs::File::open(&out).unwrap();
    let mut zip = zip::ZipArchive::new(f).unwrap();
    let names: Vec<String> = (0..zip.len())
        .map(|i| zip.by_index(i).unwrap().name().to_string())
        .collect();
    assert!(names.iter().any(|n| n == "myskill/SKILL.md"));
    assert!(names.iter().any(|n| n == "myskill/references/r.md"));
    assert!(!names.iter().any(|n| n.contains(".DS_Store")));
}
