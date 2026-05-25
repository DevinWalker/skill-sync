use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
#[serde(rename_all = "lowercase")]
pub enum OwnershipClass { Mine, External, Ignore }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct OwnershipEntry {
    pub class: OwnershipClass,
    pub source_path: Option<PathBuf>,
    #[ts(type = "string | null")]
    pub confirmed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct OwnershipFile {
    pub version: u32,
    pub skills: BTreeMap<String, OwnershipEntry>,
}
