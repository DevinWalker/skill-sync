use skill_sync::discovery::CandidateLocation;
use skill_sync::paths::Paths;
use skill_sync::provenance::{classify, Class, Signal};
use std::path::PathBuf;

fn loc(real: &str, original: &str, symlink: bool) -> CandidateLocation {
    CandidateLocation {
        dir_name: PathBuf::from(original).file_name().unwrap().to_string_lossy().into(),
        path: PathBuf::from(original),
        real_path: PathBuf::from(real),
        is_symlink: symlink,
    }
}

#[test]
fn codex_system_path_is_tool_builtin() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc(
        "/Users/test/.codex/skills/.system/skill-creator",
        "/Users/test/.codex/skills/.system/skill-creator",
        false,
    );
    let r = classify(&c, &p, &["my-skill".into()], &[]);
    assert_eq!(r.class, Class::ToolBuiltin);
    assert!(r.signals.contains(&Signal::CodexSystemPath));
}

#[test]
fn symlink_into_agents_is_bundle() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc(
        "/Users/test/.agents/skills/brainstorming",
        "/Users/test/.claude/skills/brainstorming",
        true,
    );
    let r = classify(&c, &p, &["my-skill".into()], &[]);
    assert_eq!(r.class, Class::Bundle);
    assert!(r.signals.contains(&Signal::SymlinkIntoBundle));
}

#[test]
fn user_dir_with_known_bundle_name_is_bundle_via_namelist() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc(
        "/Users/test/.claude/skills/brainstorming",
        "/Users/test/.claude/skills/brainstorming",
        false,
    );
    let r = classify(&c, &p, &["brainstorming".into()], &[]);
    assert_eq!(r.class, Class::Bundle);
}

#[test]
fn fresh_user_skill_is_mine_heuristic() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc(
        "/Users/test/.claude/skills/jetpack-thing",
        "/Users/test/.claude/skills/jetpack-thing",
        false,
    );
    let r = classify(&c, &p, &["other-known".into()], &[]);
    assert_eq!(r.class, Class::MineHeuristic);
}

#[test]
fn cursor_builtin_dir_is_tool_builtin() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc(
        "/Users/test/.cursor/skills-cursor/babysit",
        "/Users/test/.cursor/skills-cursor/babysit",
        false,
    );
    let r = classify(&c, &p, &[], &[]);
    assert_eq!(r.class, Class::ToolBuiltin);
}
