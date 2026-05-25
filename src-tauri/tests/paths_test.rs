use skill_sync::paths::Paths;
use std::path::PathBuf;

#[test]
fn resolves_paths_relative_to_a_given_home() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    assert_eq!(p.claude_skills(), PathBuf::from("/Users/test/.claude/skills"));
    assert_eq!(p.codex_skills(), PathBuf::from("/Users/test/.codex/skills"));
    assert_eq!(p.codex_system_marker(), PathBuf::from("/Users/test/.codex/skills/.system/.codex-system-skills.marker"));
    assert_eq!(p.cursor_skills(), PathBuf::from("/Users/test/.cursor/skills"));
    assert_eq!(p.cursor_skills_cursor(), PathBuf::from("/Users/test/.cursor/skills-cursor"));
    assert_eq!(p.agents_skills(), PathBuf::from("/Users/test/.agents/skills"));
    assert_eq!(p.claude_plugins(), PathBuf::from("/Users/test/.claude/plugins"));
    assert_eq!(p.config_dir(), PathBuf::from("/Users/test/Library/Application Support/skill-sync"));
    assert_eq!(p.trash_archive_root(), PathBuf::from("/Users/test/.Trash/skill-sync-archive"));
}
