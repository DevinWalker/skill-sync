pub mod types;
pub mod paths;
pub mod frontmatter;
pub mod config;
pub mod discovery;
pub mod provenance;
pub mod identity;
pub mod aggregator;
pub mod ipc;
pub mod trash;
pub mod sync;
pub mod drift;
pub mod package;
pub mod audit;

use ipc::commands::{
    cmd_build_package, cmd_drift_matrix, cmd_execute_sync, cmd_get_ownership, cmd_get_settings,
    cmd_list_skills, cmd_plan_sync, cmd_pull_back, cmd_read_audit, cmd_set_ownership,
    cmd_set_settings, cmd_test_target_write,
};
use ipc::skills_scaffold::cmd_scaffold_skill;
use ipc::git_status::cmd_git_status;
use ipc::remove_from_target::cmd_remove_from_target;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            cmd_list_skills,
            cmd_get_ownership,
            cmd_set_ownership,
            cmd_plan_sync,
            cmd_execute_sync,
            cmd_drift_matrix,
            cmd_pull_back,
            cmd_build_package,
            cmd_test_target_write,
            cmd_get_settings,
            cmd_set_settings,
            cmd_read_audit,
            cmd_scaffold_skill,
            cmd_git_status,
            cmd_remove_from_target,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
