use std::path::{Path, PathBuf};

pub struct Paths {
    home: PathBuf,
}

impl Paths {
    pub fn for_home(home: PathBuf) -> Self {
        Self { home }
    }
    pub fn home(&self) -> &Path { &self.home }
    pub fn claude_skills(&self) -> PathBuf { self.home.join(".claude/skills") }
    pub fn codex_skills(&self) -> PathBuf { self.home.join(".codex/skills") }
    pub fn codex_system_marker(&self) -> PathBuf {
        self.home.join(".codex/skills/.system/.codex-system-skills.marker")
    }
    pub fn cursor_skills(&self) -> PathBuf { self.home.join(".cursor/skills") }
    pub fn cursor_skills_cursor(&self) -> PathBuf { self.home.join(".cursor/skills-cursor") }
    pub fn agents_skills(&self) -> PathBuf { self.home.join(".agents/skills") }
    pub fn claude_plugins(&self) -> PathBuf { self.home.join(".claude/plugins") }
    pub fn config_dir(&self) -> PathBuf {
        self.home.join("Library/Application Support/skill-sync")
    }
    pub fn trash_archive_root(&self) -> PathBuf {
        self.home.join(".Trash/skill-sync-archive")
    }
}
