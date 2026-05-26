use skill_sync::aggregator::list_skills;
use skill_sync::paths::Paths;
use std::fs;
use tempfile::tempdir;

#[test]
fn aggregates_mine_and_bundle_across_locations() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());

    // user authored "alpha" in claude + codex
    for d in [&paths.claude_skills(), &paths.codex_skills()] {
        let alpha = d.join("alpha");
        fs::create_dir_all(&alpha).unwrap();
        fs::write(alpha.join("SKILL.md"), "---\nname: alpha\n---\n").unwrap();
    }
    // superpowers symlink in claude → agents
    let agents = paths.agents_skills();
    fs::create_dir_all(agents.join("brainstorming")).unwrap();
    fs::write(agents.join("brainstorming/SKILL.md"), "---\nname: brainstorming\n---\n").unwrap();
    let link = paths.claude_skills().join("brainstorming");
    std::os::unix::fs::symlink(agents.join("brainstorming"), &link).unwrap();

    let report = list_skills(&paths, &["brainstorming".into()]).unwrap();

    let alpha = report.iter().find(|s| s.name == "alpha").unwrap();
    assert_eq!(alpha.locations.len(), 2);
    assert!(matches!(alpha.class, skill_sync::provenance::Class::MineHeuristic));

    let bs = report.iter().find(|s| s.name == "brainstorming").unwrap();
    assert!(matches!(bs.class, skill_sync::provenance::Class::Bundle));
}

#[test]
fn location_view_carries_modified_at() {
    let tmp = tempdir().unwrap();
    let paths = Paths::for_home(tmp.path().to_path_buf());
    let skill_dir = paths.claude_skills().join("test-skill");
    fs::create_dir_all(&skill_dir).unwrap();
    fs::write(
        skill_dir.join("SKILL.md"),
        "---\nname: test-skill\ndescription: example\n---\n# test\n",
    ).unwrap();

    let skills = list_skills(&paths, &[]).unwrap();
    let s = skills.iter().find(|s| s.name == "test-skill").expect("skill found");
    let loc = s.locations.first().expect("at least one location");
    assert!(!loc.modified_at.is_empty(), "modified_at should be populated");
    assert!(loc.modified_at.starts_with("20"), "RFC 3339-ish, got: {}", loc.modified_at);
}
