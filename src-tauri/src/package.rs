use std::io::Write;
use std::path::Path;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;

fn ignored(name: &str) -> bool {
    name == ".DS_Store" || name.ends_with(".swp") || name == ".git"
}

pub fn build_skill_package(skill_name: &str, src: &Path, out_path: &Path) -> std::io::Result<()> {
    if let Some(p) = out_path.parent() {
        std::fs::create_dir_all(p)?;
    }
    let f = std::fs::File::create(out_path)?;
    let mut zip = zip::ZipWriter::new(f);
    let opts = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let walk = WalkDir::new(src)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !ignored(&e.file_name().to_string_lossy()));
    for entry in walk.filter_map(|e| e.ok()) {
        let rel = entry.path().strip_prefix(src).unwrap();
        if rel.as_os_str().is_empty() {
            continue;
        }
        let zip_path = Path::new(skill_name).join(rel);
        let zip_name = zip_path.to_string_lossy().replace('\\', "/");
        if entry.file_type().is_dir() {
            zip.add_directory(zip_name, opts)?;
        } else if entry.file_type().is_file() {
            zip.start_file(zip_name, opts)?;
            zip.write_all(&std::fs::read(entry.path())?)?;
        }
    }
    zip.finish()?;
    Ok(())
}
