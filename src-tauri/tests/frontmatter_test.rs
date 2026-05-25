use skill_sync::frontmatter::{parse_skill_md, FrontmatterError};
use std::path::PathBuf;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/skills").join(name).join("SKILL.md")
}

#[test]
fn parses_valid_frontmatter() {
    let fm = parse_skill_md(&fixture("good")).unwrap();
    assert_eq!(fm.name, "my-skill");
    assert_eq!(fm.description.as_deref(), Some("A test skill."));
}

#[test]
fn errors_when_no_frontmatter() {
    let err = parse_skill_md(&fixture("no-frontmatter")).unwrap_err();
    assert!(matches!(err, FrontmatterError::Missing));
}

#[test]
fn errors_on_invalid_yaml() {
    let err = parse_skill_md(&fixture("bad-yaml")).unwrap_err();
    assert!(matches!(err, FrontmatterError::InvalidYaml(_)));
}
