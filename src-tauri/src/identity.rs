use sha2::{Digest, Sha256};
use std::path::Path;
use walkdir::WalkDir;

fn ignored(name: &str) -> bool {
    name == ".DS_Store"
        || name.ends_with(".swp")
        || (name.starts_with('.') && name != ".skillignore")
}

pub fn content_hash(dir: &Path) -> std::io::Result<String> {
    let mut paths: Vec<_> = WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| !ignored(&e.file_name().to_string_lossy()))
        .map(|e| e.path().to_path_buf())
        .collect();
    paths.sort();
    let mut h = Sha256::new();
    for p in paths {
        let rel = p.strip_prefix(dir).unwrap();
        h.update(rel.to_string_lossy().as_bytes());
        h.update(b"\0");
        let bytes = std::fs::read(&p)?;
        h.update(&bytes);
        h.update(b"\0");
    }
    Ok(hex::encode(h.finalize()))
}
