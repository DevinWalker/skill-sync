use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
#[serde(rename_all = "kebab-case")]
pub enum TargetKind { DirectoryMirror, PackageOnly }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct Target {
    pub install_path: Option<PathBuf>,
    pub kind: TargetKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct TargetsFile {
    pub version: u32,
    pub targets: BTreeMap<String, Target>,
}
