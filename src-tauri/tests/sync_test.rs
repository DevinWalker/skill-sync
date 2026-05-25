use skill_sync::paths::Paths;
use skill_sync::sync::{plan, Input, PlanAction};
use std::fs;
use tempfile::tempdir;

fn write_skill(dir: &std::path::Path, name: &str, body: &str) {
    let d = dir.join(name);
    fs::create_dir_all(&d).unwrap();
    fs::write(d.join("SKILL.md"), format!("---\nname: {name}\n---\n{body}\n")).unwrap();
}

#[test]
fn plans_create_when_target_missing() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills");
    fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "a");
    let codex = home.path().join(".codex/skills");
    fs::create_dir_all(&codex).unwrap();
    let input = Input {
        paths: &paths,
        source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex)],
    };
    let p = plan(&input);
    assert_eq!(p.rows.len(), 1);
    assert!(matches!(p.rows[0].action, PlanAction::Create));
}

#[test]
fn refuses_symlink_destination() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills");
    fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "a");
    let codex = home.path().join(".codex/skills");
    fs::create_dir_all(&codex).unwrap();
    let elsewhere = home.path().join("elsewhere/alpha");
    fs::create_dir_all(&elsewhere).unwrap();
    std::os::unix::fs::symlink(&elsewhere, codex.join("alpha")).unwrap();
    let input = Input {
        paths: &paths,
        source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex)],
    };
    let p = plan(&input);
    assert!(matches!(p.rows[0].action, PlanAction::Refuse));
    assert!(p.rows[0].reason.as_deref().unwrap().contains("symlink"));
}

#[test]
fn skips_when_hashes_match() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills");
    fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "same");
    let codex = home.path().join(".codex/skills");
    fs::create_dir_all(&codex).unwrap();
    write_skill(&codex, "alpha", "same");
    let input = Input {
        paths: &paths,
        source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex)],
    };
    let p = plan(&input);
    assert!(matches!(p.rows[0].action, PlanAction::Skip));
}
