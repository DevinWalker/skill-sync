use std::path::PathBuf;

use crate::{
    config::{load_or_init, settings::Settings},
    paths::Paths,
};

#[derive(Debug, serde::Serialize, ts_rs::TS)]
#[ts(export, export_to = "../../../src/types/bindings.ts")]
pub struct PackageInfo {
    pub name: String,
    pub path: PathBuf,
    pub size_bytes: u64,
    pub modified_at: String,
}

fn list_inner(package_dir: &std::path::Path) -> Vec<PackageInfo> {
    let entries = match std::fs::read_dir(package_dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut packages: Vec<PackageInfo> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|x| x == "skill"))
        .filter_map(|e| {
            let meta = e.metadata().ok()?;
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .and_then(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.as_secs() as i64, 0))
                .map(|dt| dt.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
                .unwrap_or_default();
            Some(PackageInfo {
                name: e.file_name().to_string_lossy().into_owned(),
                path: e.path(),
                size_bytes: meta.len(),
                modified_at: modified,
            })
        })
        .collect();
    packages.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    packages
}

#[tauri::command]
pub fn cmd_list_packages() -> Result<Vec<PackageInfo>, String> {
    let home = dirs::home_dir().ok_or_else(|| "no home dir".to_string())?;
    let paths = Paths::for_home(home.clone());
    let settings: Settings = load_or_init(
        &paths.config_dir().join("settings.json"),
        Settings::defaults(&home),
    )
    .map_err(|e| e.to_string())?;

    Ok(list_inner(std::path::Path::new(&settings.package_output_dir)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_dir_returns_empty_list() {
        let tmp = tempfile::tempdir().unwrap();
        let pkg = tmp.path().join("does-not-exist");
        let pkgs = list_inner(&pkg);
        assert!(pkgs.is_empty());
    }

    #[test]
    fn filters_by_extension_and_sorts_mtime_desc() {
        let tmp = tempfile::tempdir().unwrap();
        let pkg = tmp.path().join("pkgs");
        std::fs::create_dir_all(&pkg).unwrap();
        std::fs::write(pkg.join("a.skill"), b"a").unwrap();
        std::fs::write(pkg.join("b.txt"), b"b").unwrap();
        std::thread::sleep(std::time::Duration::from_millis(1100));
        std::fs::write(pkg.join("c.skill"), b"c").unwrap();
        let pkgs = list_inner(&pkg);
        let names: Vec<&str> = pkgs.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["c.skill", "a.skill"], "filters .txt, newest first");
    }
}
