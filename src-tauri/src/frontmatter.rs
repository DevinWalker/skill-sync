use serde::Deserialize;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Deserialize, Clone)]
pub struct Frontmatter {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Error)]
pub enum FrontmatterError {
    #[error("file IO: {0}")]
    Io(#[from] std::io::Error),
    #[error("no frontmatter delimiters found")]
    Missing,
    #[error("invalid yaml: {0}")]
    InvalidYaml(String),
}

pub fn parse_skill_md(path: &Path) -> Result<Frontmatter, FrontmatterError> {
    let text = std::fs::read_to_string(path)?;
    let mut lines = text.lines();
    if lines.next() != Some("---") {
        return Err(FrontmatterError::Missing);
    }
    let mut yaml = String::new();
    let mut closed = false;
    for line in lines {
        if line.trim_end() == "---" {
            closed = true;
            break;
        }
        yaml.push_str(line);
        yaml.push('\n');
    }
    if !closed {
        return Err(FrontmatterError::Missing);
    }
    serde_yaml::from_str(&yaml).map_err(|e| FrontmatterError::InvalidYaml(e.to_string()))
}
