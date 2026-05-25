use crate::{
    aggregator::{list_skills, SkillView},
    config::{
        known_bundles, load_or_init, save,
        ownership::{OwnershipClass, OwnershipEntry, OwnershipFile},
        settings::Settings,
    },
    paths::Paths,
};

#[tauri::command]
pub fn cmd_list_skills() -> Result<Vec<SkillView>, String> {
    let home = dirs::home_dir().ok_or("no home dir")?;
    let paths = Paths::for_home(home.clone());
    let settings_path = paths.config_dir().join("settings.json");
    let _settings: Settings = load_or_init(&settings_path, Settings::defaults(&home))
        .map_err(|e| e.to_string())?;
    let known: Vec<String> = known_bundles::SEED.iter().map(|s| s.to_string()).collect();
    list_skills(&paths, &known).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_get_ownership() -> Result<OwnershipFile, String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    let path = paths.config_dir().join("ownership.json");
    load_or_init(
        &path,
        OwnershipFile { version: 1, skills: Default::default() },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_set_ownership(
    name: String,
    class: OwnershipClass,
    note: Option<String>,
) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    let path = paths.config_dir().join("ownership.json");
    let mut file: OwnershipFile = load_or_init(
        &path,
        OwnershipFile { version: 1, skills: Default::default() },
    )
    .map_err(|e| e.to_string())?;
    file.skills.insert(
        name,
        OwnershipEntry {
            class,
            source_path: None,
            confirmed_at: Some(chrono::Utc::now()),
            note,
        },
    );
    save(&path, &file).map_err(|e| e.to_string())
}
