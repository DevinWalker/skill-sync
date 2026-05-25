use skill_sync::config::{load_or_init, save, settings::Settings, ownership::{OwnershipFile, OwnershipEntry, OwnershipClass}};
use tempfile::tempdir;

#[test]
fn settings_default_seeds_a_file() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("settings.json");
    let s = load_or_init(&path, Settings::defaults(dir.path())).unwrap();
    assert!(path.exists());
    assert_eq!(s.version, 1);
    assert_eq!(s.enabled_targets.len(), 3);
}

#[test]
fn ownership_roundtrip() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("ownership.json");
    let mut o = OwnershipFile { version: 1, skills: Default::default() };
    o.skills.insert("foo".into(), OwnershipEntry {
        class: OwnershipClass::Mine, source_path: None, confirmed_at: None, note: None,
    });
    save(&path, &o).unwrap();
    let loaded: OwnershipFile = load_or_init(&path, OwnershipFile::default()).unwrap();
    assert_eq!(loaded.skills.get("foo").unwrap().class, OwnershipClass::Mine);
}

#[test]
fn save_is_atomic() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("settings.json");
    save(&path, &Settings::defaults(dir.path())).unwrap();
    assert!(!dir.path().join("settings.json.tmp").exists());
}
