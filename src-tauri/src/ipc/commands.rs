use crate::{
    aggregator::{list_skills, SkillView},
    config::{
        known_bundles, load_or_init, save,
        ownership::{OwnershipClass, OwnershipEntry, OwnershipFile},
        settings::Settings,
        targets::{Target, TargetKind, TargetsFile},
    },
    drift::{status_for, DriftStatus},
    paths::Paths,
    sync::{plan, Input, SyncPlan},
};
use std::collections::BTreeMap;

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

fn default_targets(paths: &Paths) -> TargetsFile {
    let mut targets = std::collections::BTreeMap::new();
    targets.insert(
        "claude".into(),
        Target {
            install_path: Some(paths.claude_skills()),
            kind: TargetKind::DirectoryMirror,
        },
    );
    targets.insert(
        "codex".into(),
        Target {
            install_path: Some(paths.codex_skills()),
            kind: TargetKind::DirectoryMirror,
        },
    );
    targets.insert(
        "cursor".into(),
        Target {
            install_path: Some(paths.cursor_skills()),
            kind: TargetKind::DirectoryMirror,
        },
    );
    TargetsFile { version: 1, targets }
}

fn gather_inputs() -> Result<(Paths, Settings, OwnershipFile, TargetsFile), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home.clone());
    let cfg = paths.config_dir();
    let settings: Settings = load_or_init(&cfg.join("settings.json"), Settings::defaults(&home))
        .map_err(|e| e.to_string())?;
    let ownership: OwnershipFile = load_or_init(
        &cfg.join("ownership.json"),
        OwnershipFile { version: 1, skills: Default::default() },
    )
    .map_err(|e| e.to_string())?;
    let targets: TargetsFile =
        load_or_init(&cfg.join("targets.json"), default_targets(&paths))
            .map_err(|e| e.to_string())?;
    Ok((paths, settings, ownership, targets))
}

#[tauri::command]
pub fn cmd_plan_sync() -> Result<SyncPlan, String> {
    let (paths, settings, ownership, targets) = gather_inputs()?;
    let mine: Vec<(String, std::path::PathBuf)> = ownership
        .skills
        .iter()
        .filter(|(_, e)| e.class == OwnershipClass::Mine)
        .map(|(name, e)| {
            let src = e
                .source_path
                .clone()
                .unwrap_or_else(|| settings.source_root.join(name));
            (name.clone(), src)
        })
        .collect();
    let target_list: Vec<(String, std::path::PathBuf)> = targets
        .targets
        .iter()
        .filter(|(name, t)| settings.enabled_targets.contains(name) && t.install_path.is_some())
        .map(|(name, t)| (name.clone(), t.install_path.clone().unwrap()))
        .collect();
    Ok(plan(&Input {
        paths: &paths,
        source_root: &settings.source_root,
        mine_skills: &mine,
        targets: &target_list,
    }))
}

#[tauri::command]
pub fn cmd_drift_matrix() -> Result<BTreeMap<String, BTreeMap<String, DriftStatus>>, String> {
    let (_paths, settings, ownership, targets) = gather_inputs()?;
    let mut out = BTreeMap::new();
    for (name, entry) in ownership.skills.iter() {
        if entry.class != OwnershipClass::Mine {
            continue;
        }
        let src = entry
            .source_path
            .clone()
            .unwrap_or_else(|| settings.source_root.join(name));
        let mut per_target = BTreeMap::new();
        for (tname, t) in targets.targets.iter() {
            if !settings.enabled_targets.contains(tname) {
                continue;
            }
            if let Some(install) = &t.install_path {
                let dest = install.join(name);
                let st = status_for(&src, &dest).unwrap_or(DriftStatus::MissingInTarget);
                per_target.insert(tname.clone(), st);
            }
        }
        out.insert(name.clone(), per_target);
    }
    Ok(out)
}

#[tauri::command]
pub fn cmd_execute_sync(plan: SyncPlan) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    crate::sync::execute(&plan, &crate::trash::TrashAction, &paths.trash_archive_root())
        .map_err(|e| e.to_string())?;
    // TODO: append_event when audit lands (Task 30)
    Ok(())
}

#[tauri::command]
pub fn cmd_pull_back(skill: String, target: String) -> Result<(), String> {
    let (_paths, settings, ownership, targets) = gather_inputs()?;
    let entry = ownership
        .skills
        .get(&skill)
        .ok_or("skill not tagged")?;
    if entry.class != OwnershipClass::Mine {
        return Err("only Mine skills can be pulled back".into());
    }
    let src = entry
        .source_path
        .clone()
        .unwrap_or_else(|| settings.source_root.join(&skill));
    let install = targets
        .targets
        .get(&target)
        .and_then(|t| t.install_path.clone())
        .ok_or("unknown target")?;
    let dest = install.join(&skill);
    let home = dirs::home_dir().ok_or("no home")?;
    let paths_for_archive = Paths::for_home(home);
    let label = format!("pullback-{target}-{skill}");
    crate::sync::pull_back(
        &src,
        &dest,
        &crate::trash::TrashAction,
        &paths_for_archive.trash_archive_root(),
        &label,
    )
    .map_err(|e| e.to_string())
}
