use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct AuditEntry {
    #[ts(type = "string")]
    pub ts: chrono::DateTime<chrono::Utc>,
    pub kind: String,
    #[ts(type = "any")]
    pub data: serde_json::Value,
}

fn audit_path() -> std::io::Result<std::path::PathBuf> {
    let home = dirs::home_dir()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::Other, "no home"))?;
    let dir = home.join("Library/Application Support/skill-sync");
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("audit.log"))
}

pub fn append_event(kind: &str, data: serde_json::Value) -> std::io::Result<()> {
    let entry = AuditEntry {
        ts: chrono::Utc::now(),
        kind: kind.to_string(),
        data,
    };
    let line = serde_json::to_string(&entry)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    let path = audit_path()?;
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    writeln!(f, "{line}")?;
    Ok(())
}

pub fn read_last(limit: usize) -> std::io::Result<Vec<AuditEntry>> {
    let path = audit_path()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let file = std::fs::File::open(path)?;
    let lines: Vec<String> = BufReader::new(file).lines().filter_map(|l| l.ok()).collect();
    let tail = lines.iter().rev().take(limit);
    Ok(tail.filter_map(|l| serde_json::from_str(l).ok()).collect())
}
