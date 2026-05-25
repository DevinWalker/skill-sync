pub mod settings;
pub mod ownership;
pub mod targets;

use std::path::Path;
use std::io::Write;

pub fn load_or_init<T: serde::de::DeserializeOwned + Clone>(path: &Path, default: T) -> std::io::Result<T>
where T: serde::Serialize {
    if path.exists() {
        let bytes = std::fs::read(path)?;
        Ok(serde_json::from_slice(&bytes).unwrap_or(default))
    } else {
        save(path, &default)?;
        Ok(default)
    }
}

pub fn save<T: serde::Serialize>(path: &Path, value: &T) -> std::io::Result<()> {
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(value)?;
    let mut f = std::fs::File::create(&tmp)?;
    f.write_all(&bytes)?;
    f.sync_all()?;
    std::fs::rename(tmp, path)?;
    Ok(())
}
