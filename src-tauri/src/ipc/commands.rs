use crate::{
    aggregator::{list_skills, SkillView},
    config::{known_bundles, load_or_init, settings::Settings},
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
