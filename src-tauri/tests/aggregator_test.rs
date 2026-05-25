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
