use crate::{
    discovery::discover_in_root,
    frontmatter::parse_skill_md,
    identity::content_hash,
    paths::Paths,
    provenance::{classify, Class, Provenance},
};
use serde::Serialize;
use std::collections::BTreeMap;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct LocationView {
    pub path: PathBuf,
    pub real_path: PathBuf,
    pub is_symlink: bool,
    pub hash: String,
    pub provenance: Provenance,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct SkillView {
    pub name: String,
    pub description: Option<String>,
    pub class: Class,
    pub locations: Vec<LocationView>,
}

fn stronger(a: Class, b: Class) -> Class {
    use Class::*;
    let rank = |c: Class| match c {
        ToolBuiltin => 3,
        Bundle => 2,
        MineHeuristic => 1,
        Unknown => 0,
    };
    if rank(b) > rank(a) { b } else { a }
}

pub fn list_skills(paths: &Paths, known_bundles: &[String]) -> std::io::Result<Vec<SkillView>> {
    let roots = [
        paths.claude_skills(),
        paths.codex_skills(),
        paths.cursor_skills(),
        paths.cursor_skills_cursor(),
        paths.agents_skills(),
    ];
    let mut grouped: BTreeMap<String, SkillView> = BTreeMap::new();

    for root in roots.iter() {
        let candidates = discover_in_root(root).unwrap_or_default();
        for loc in candidates {
            let fm = match parse_skill_md(&loc.real_path.join("SKILL.md")) {
                Ok(f) => f,
                Err(_) => continue,
            };
            let prov = classify(&loc, paths, known_bundles, &[]);
            let hash = content_hash(&loc.real_path).unwrap_or_default();
            let lv = LocationView {
                path: loc.path.clone(),
                real_path: loc.real_path.clone(),
                is_symlink: loc.is_symlink,
                hash,
                provenance: prov.clone(),
            };
            let entry = grouped.entry(fm.name.clone()).or_insert(SkillView {
                name: fm.name.clone(),
                description: fm.description.clone(),
                class: prov.class,
                locations: vec![],
            });
            entry.class = stronger(entry.class, prov.class);
            entry.locations.push(lv);
        }
    }
    Ok(grouped.into_values().collect())
}
