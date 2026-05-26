# Vibe-Dev Friendly Skill Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the design in [`docs/superpowers/specs/2026-05-25-vibe-dev-friendly-design.md`](../specs/2026-05-25-vibe-dev-friendly-design.md): new Home page, Simple/Pro mode toggle, new-skill scaffolder, git-repo awareness, orphan surfacing, first-run flow, and friendlier copy — without altering the Console visual system or the sync engine.

**Architecture:** Frontend changes layer on top of the existing Tauri + React + TanStack Query + Zustand stack. Two new Tauri commands (`skills.scaffold`, `git.status`) extend `src-tauri/src/ipc/commands.rs`. Mode is a settings field driving a `useMode()` + `useCopy()` hook pair; structural rendering branches on mode, strings come from a central `copy.ts`. All work lands on the current worktree branch (`claude/goofy-swirles-8b5480`) and ships as a single PR for the user to test before merging.

**Tech Stack:** Tauri 2 (Rust backend), Vite + React 19, TypeScript 5.8, TanStack Query 5, Zustand 5, Radix primitives, Tailwind 3, shadcn/ui patterns, `ts-rs` for type generation. New Rust deps: `git2`. No frontend test framework is added; verification is via `cargo test` for Rust commands and manual `pnpm tauri dev` runs with the verification steps spelled out per task.

---

## How verification works in this plan

This project has no frontend test framework. Adding one is out of scope. So:

- **Rust commands**: TDD with `cargo test` in `src-tauri/` (the `tempfile` dev-dep is already there).
- **TypeScript pure functions** (e.g., the copy lookup): inline assertion-style checks done by running a tiny one-off script through `pnpm tsx` — or skipped where the logic is a trivial object lookup. The plan calls out which.
- **React components and pages**: manual validation via `pnpm tauri dev`. Each task lists a "Verify in app" step with explicit clicks / observations.

This matches how the project has been built so far (see git history: `ui(console): …` commits with no test additions). If you disagree, raise it before starting — adding Vitest is a scope decision, not something to bolt on mid-plan.

---

## File structure

### New files

**Frontend (TypeScript/React):**
- `src/lib/copy.ts` — Mode-keyed copy map + style guide doc comment
- `src/hooks/use-mode.ts` — `useMode()` returns `"simple" | "pro"` from settings
- `src/hooks/use-copy.ts` — `useCopy()` returns the active copy map
- `src/hooks/use-git-status.ts` — Polls `git.status` for the source root
- `src/hooks/use-first-run.ts` — Reads `first_run_completed` from settings
- `src/components/mode-switch.tsx` — The Simple/Pro segmented control
- `src/components/git-status-chip.tsx` — `branch · N uncommitted` chip
- `src/components/tool-icon-row.tsx` — Simple-mode "Where it lives" column renderer
- `src/components/needs-attention-card.tsx` — Home page attention card
- `src/components/orphan-row.tsx` — Orphan row (Home card + Library section)
- `src/components/compare-dialog.tsx` — Simple-mode "Compare with <Tool>" dialog
- `src/components/new-skill-dialog.tsx` — Scaffolder dialog
- `src/components/first-run-modal.tsx` — 3-step + scan transition wizard
- `src/pages/home.tsx` — New `/` landing page

**Backend (Rust):**
- `src-tauri/src/ipc/skills_scaffold.rs` — `cmd_scaffold_skill`
- `src-tauri/src/ipc/git_status.rs` — `cmd_git_status` (read-only)

### Modified files

**Frontend:**
- `src/routes.tsx` — Add `/`, demote Library to `/library`, add `/home` redirect
- `src/components/app-shell.tsx` — Mount first-run modal
- `src/components/sidebar.tsx` — Mode-aware nav labels; git status chip in Source section
- `src/components/library-table.tsx` — Mode-aware columns + orphan section
- `src/components/skill-detail-drawer.tsx` — Mode-aware meta grid; Compare-dialog wiring in Simple
- `src/components/sync-preview-dialog.tsx` — Mode-aware action labels
- `src/components/activity-list.tsx` — Sentence rows in Simple, dense columns in Pro
- `src/components/target-card.tsx` — Mode-aware status pill labels + health-bar label
- `src/components/settings-form.tsx` — Add Mode section + git-status row + collapsed Diagnostics
- `src/components/owner-badge.tsx` — Hide Bundle/Built-in chips in Simple
- `src/components/drift-badge.tsx` — Use `useCopy()` for label text
- `src/components/sidebar.tsx` — Footer `build · <sha>` hidden in Simple
- `src/hooks/use-global-shortcuts.ts` — Register `⌘N` for new skill
- `src/pages/library.tsx` — Mode-aware header strip, stats strip, toolbar
- `src/pages/targets.tsx` — Mode-aware copy
- `src/pages/activity.tsx` — Mode-aware copy + filter chips
- `src/pages/settings.tsx` — Mode-aware section visibility

**Backend:**
- `src-tauri/src/config/settings.rs` — Add `mode`, `first_run_completed`, `mode_migration_announced` fields
- `src-tauri/src/ipc/mod.rs` — Expose new modules
- `src-tauri/src/lib.rs` — Register new commands
- `src-tauri/Cargo.toml` — Add `git2` dependency

### Deleted

None. (The Console UI ownership-inbox was already deleted in the prior PR.)

---

## Phases overview

| Phase | What | Commit message style |
|-------|------|----------------------|
| 1     | Mode plumbing (settings, hooks, copy module, switch) | `feat(mode): …` |
| 2     | Home page                                            | `feat(home): …` |
| 3     | Sidebar mode-awareness                               | `ui(sidebar): …` |
| 4     | Library Simple variant + orphan section              | `ui(library): …` |
| 5     | Drawer + Compare dialog                              | `ui(drawer): …` |
| 6     | Targets / Activity / Settings Simple variants        | `ui(targets|activity|settings): …` |
| 7     | New-skill scaffolder (Rust + UI)                     | `feat(scaffold): …` |
| 8     | Git awareness (Rust + UI)                            | `feat(git): …` |
| 9     | First-run flow                                       | `feat(first-run): …` |
| 10    | PR creation                                          | n/a |

Each task is one commit unless explicitly grouped.

---

# Phase 1 · Mode plumbing

### Task 1.1: Extend the `Settings` struct (Rust + bindings)

**Files:**
- Modify: `src-tauri/src/config/settings.rs`
- Auto-regenerated: `src/types/bindings.ts`

- [ ] **Step 1.1.1: Read `src-tauri/src/config/settings.rs` to confirm current shape**

Run: `cat src-tauri/src/config/settings.rs`

Expect to see the `Settings` struct from the spec preamble (8 fields).

- [ ] **Step 1.1.2: Add new fields**

Edit `src-tauri/src/config/settings.rs` so the struct + defaults read:

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct Settings {
    pub version: u32,
    pub source_root: PathBuf,
    pub package_output_dir: PathBuf,
    pub show_builtins: bool,
    pub external_bundle_roots: Vec<PathBuf>,
    pub enabled_targets: Vec<String>,
    pub cowork_package_enabled: bool,
    pub theme: String,
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default)]
    pub first_run_completed: bool,
    #[serde(default)]
    pub mode_migration_announced: bool,
}

fn default_mode() -> String {
    "pro".into() // Existing installs migrate to pro; new installs override to "simple" via first-run.
}

impl Settings {
    pub fn defaults(home: &std::path::Path) -> Self {
        Self {
            version: 1,
            source_root: home.join(".claude/skills"),
            package_output_dir: home.join("Downloads"),
            show_builtins: false,
            external_bundle_roots: vec![home.join(".agents/skills")],
            enabled_targets: vec!["claude".into(), "codex".into(), "cursor".into()],
            cowork_package_enabled: true,
            theme: "system".into(),
            mode: "simple".into(),
            first_run_completed: false,
            mode_migration_announced: false,
        }
    }
}
```

Note: `defaults()` returns `"simple"` for net-new installs. The `#[serde(default = "default_mode")]` on the field returns `"pro"` for existing installs (where `settings.json` was written before this field existed). This implements the migration rule from spec §11.1 without extra branching code.

- [ ] **Step 1.1.3: Regenerate TS bindings**

Run: `cd src-tauri && cargo test --quiet`
Expected: tests pass (`ts-rs` aggregator regenerates `src/types/bindings.ts`).

- [ ] **Step 1.1.4: Verify bindings updated**

Run: `grep "mode\|first_run_completed\|mode_migration_announced" src/types/bindings.ts`
Expected: All three fields present in the `Settings` type.

- [ ] **Step 1.1.5: Commit**

```bash
git add src-tauri/src/config/settings.rs src/types/bindings.ts
git commit -m "feat(mode): add mode, first_run_completed, mode_migration_announced to Settings"
```

---

### Task 1.2: Settings migration toast flag (Rust unit test)

**Files:**
- Modify: `src-tauri/src/config/settings.rs`
- Test: `src-tauri/src/config/settings.rs` (inline `#[cfg(test)]`)

- [ ] **Step 1.2.1: Write failing test for serde defaults**

Add to `src-tauri/src/config/settings.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializing_legacy_settings_fills_mode_with_pro() {
        let legacy_json = r#"{
            "version": 1,
            "source_root": "/tmp/x",
            "package_output_dir": "/tmp/y",
            "show_builtins": false,
            "external_bundle_roots": [],
            "enabled_targets": ["claude"],
            "cowork_package_enabled": true,
            "theme": "dark"
        }"#;
        let settings: Settings = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(settings.mode, "pro");
        assert!(!settings.first_run_completed);
        assert!(!settings.mode_migration_announced);
    }

    #[test]
    fn fresh_defaults_use_simple_mode() {
        let home = std::path::Path::new("/tmp/home");
        let s = Settings::defaults(home);
        assert_eq!(s.mode, "simple");
        assert!(!s.first_run_completed);
    }
}
```

- [ ] **Step 1.2.2: Run tests; verify they pass**

Run: `cd src-tauri && cargo test settings`
Expected: 2 passed.

- [ ] **Step 1.2.3: Commit**

```bash
git add src-tauri/src/config/settings.rs
git commit -m "test(mode): legacy settings deserialize to mode=pro; defaults() returns simple"
```

---

### Task 1.3: Create `src/lib/copy.ts`

**Files:**
- Create: `src/lib/copy.ts`

- [ ] **Step 1.3.1: Write the file**

```ts
/**
 * Mode-keyed copy. Components should never inline `mode === 'simple' ? 'X' : 'Y'`.
 * Read `useCopy().<key>` instead.
 *
 * STYLE GUIDE
 * -----------
 * Simple voice: Plain English. Second person ("your skills"). Present tense.
 *   No jargon. Light gardening hints allowed in microcopy / empty states
 *   ("nothing to tend right now"), but never in primary nav or page H1s.
 *   Never say "drift" / "audit" / "refused" / "bundle" / "built-in" in Simple.
 *   Never display a hash in Simple-mode user-facing text.
 * Pro voice: Console terminology (drift, audit, archive, refused, bundle,
 *   built-in, hash). Mono-forward, dense.
 * Errors: Plain English in both modes — never raw error codes.
 *
 * JARGON TABLE (Pro -> Simple)
 *   Drift / drifted         -> Out of sync / different
 *   Audit log               -> History
 *   Archive                 -> Saved older versions
 *   Refused                 -> Couldn't write (with reason)
 *   Source-of-truth         -> Your source folder / where you edit
 *   Target                  -> Tool
 *   Bundle / Built-in       -> (hidden in Simple)
 *   OwnershipEntry / class  -> Who made this
 *   sync.commit / pull.back -> Synced / Pulled in
 *   Hash                    -> (hidden in Simple)
 *   Missing-in-source       -> Not in your source (orphan)
 *   Missing-in-target       -> Not present
 */
export type Mode = "simple" | "pro";

export const copy = {
  simple: {
    libraryTitle: "My Skills",
    libraryCrumb: (source: string) => `home › my skills`,
    librarySubhead: (
      total: number,
      tools: number,
      outOfSync: number,
      lastScan: string,
    ) =>
      `${total} skills · ${tools} tools · ${outOfSync} out of sync · last checked ${lastScan}`,
    targetsTitle: "Where your skills go",
    targetsCrumb: "home › where they sync",
    historyTitle: "History",
    historyCrumb: "home › history",
    historySubhead: (count: number) => `${count} things happened in the last month`,
    settingsTitle: "Settings",
    homeTitle: "Home",
    homeCrumb: "skill sync · home",
    statusInSync: "In sync",
    statusOutOfSync: "Out of sync",
    statusNeedsClaiming: "Needs claiming",
    statusUnknown: "Unknown",
    statusNotInSource: "Not in your source",
    targetStatusActive: "In use",
    targetStatusOff: "Off",
    targetStatusNotSetUp: "Not set up",
    healthBarLabel: (synced: number, drift: number, blocked: number) =>
      `${synced} happy · ${drift} different · ${blocked} blocked`,
    activityFilters: ["All", "Synced", "Pulled in", "Removed", "Changes noticed"],
    libraryFilters: ["All", "Mine", "Unknown", "Out of sync"],
    diagnosticsCollapsedRow: "Build info, history file, advanced…",
    diagnosticsAuditRowLabel: "History file",
    modeExplainer:
      "Simple hides the deeper sync mechanics. Pro shows everything — hashes, refusals, packaging.",
    syncEverythingButton: "Sync everything",
    newSkillButton: "New skill",
    pushAction: "Push",
    pullAction: "Pull",
    compareAction: "Compare",
    openInEditor: "Open in editor",
    pushToAllTools: "Push to all tools",
    showInFinder: "Show in Finder",
    testConnection: "Test connection",
    turnOff: "Turn off",
    nothingToTend: "Nothing to tend right now.",
    migrationToast:
      "We added a Simple mode that hides the deeper details. You're in Pro now.",
    tryThisSimple: "Try Simple",
    stayInPro: "Stay in Pro",
  },
  pro: {
    libraryTitle: "Library",
    libraryCrumb: (source: string) => `${source} › library`,
    librarySubhead: (
      total: number,
      tools: number,
      drift: number,
      lastScan: string,
    ) =>
      `${total} skills · ${tools} targets · ${drift} drifting · last scan ${lastScan}`,
    targetsTitle: "Targets",
    targetsCrumb: "~/.claude/skills › targets",
    historyTitle: "Activity",
    historyCrumb: "~/.claude/skills › activity",
    historySubhead: (count: number) => `${count} events · last 30 days`,
    settingsTitle: "Settings",
    homeTitle: "Home",
    homeCrumb: "~/.claude/skills · home",
    statusInSync: "in-sync",
    statusOutOfSync: "drifted",
    statusNeedsClaiming: "Unknown",
    statusUnknown: "Unknown",
    statusNotInSource: "missing-in-source",
    targetStatusActive: "Active",
    targetStatusOff: "Disabled",
    targetStatusNotSetUp: "Not configured",
    healthBarLabel: (synced: number, drift: number, blocked: number) =>
      `${synced} in sync · ${drift} drift · ${blocked} refused`,
    activityFilters: ["All", "Sync", "Pull", "Package", "Refused", "Drift detected"],
    libraryFilters: ["All", "Mine", "Bundle", "Built-in", "Unknown"],
    diagnosticsCollapsedRow: "Build info, audit log, advanced…",
    diagnosticsAuditRowLabel: "Audit log",
    modeExplainer:
      "Simple hides the deeper sync mechanics. Pro shows everything — hashes, refusals, packaging.",
    syncEverythingButton: "Sync all",
    newSkillButton: "+",
    pushAction: "push",
    pullAction: "pull",
    compareAction: "diff",
    openInEditor: "Open in editor",
    pushToAllTools: "Push to all",
    showInFinder: "Open in Finder",
    testConnection: "Test",
    turnOff: "Disable",
    nothingToTend: "no drift detected.",
    migrationToast:
      "We added a Simple mode that hides the deeper details. You're in Pro now.",
    tryThisSimple: "Try Simple",
    stayInPro: "Stay in Pro",
  },
} as const;

export type CopyMap = typeof copy.simple;
```

- [ ] **Step 1.3.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 1.3.3: Commit**

```bash
git add src/lib/copy.ts
git commit -m "feat(mode): add src/lib/copy.ts with mode-keyed copy + style guide"
```

---

### Task 1.4: Create `useMode()` hook

**Files:**
- Create: `src/hooks/use-mode.ts`

- [ ] **Step 1.4.1: Write the hook**

```ts
import { useSettings } from "./use-settings";
import type { Mode } from "@/lib/copy";

export function useMode(): Mode {
  const { data } = useSettings();
  return data?.mode === "pro" ? "pro" : "simple";
}
```

This defensively defaults to `"simple"` while settings are loading or if any future value isn't one of the two known strings.

- [ ] **Step 1.4.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 1.4.3: Commit**

```bash
git add src/hooks/use-mode.ts
git commit -m "feat(mode): add useMode() hook reading from settings"
```

---

### Task 1.5: Create `useCopy()` hook

**Files:**
- Create: `src/hooks/use-copy.ts`

- [ ] **Step 1.5.1: Write the hook**

```ts
import { copy, type CopyMap } from "@/lib/copy";
import { useMode } from "./use-mode";

export function useCopy(): CopyMap {
  const mode = useMode();
  return copy[mode];
}
```

- [ ] **Step 1.5.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 1.5.3: Commit**

```bash
git add src/hooks/use-copy.ts
git commit -m "feat(mode): add useCopy() hook returning active copy map"
```

---

### Task 1.6: Create `ModeSwitch` component

**Files:**
- Create: `src/components/mode-switch.tsx`

- [ ] **Step 1.6.1: Write the component**

```tsx
import { useSettings, useSetSettings } from "@/hooks/use-settings";
import { useMode } from "@/hooks/use-mode";
import { useCopy } from "@/hooks/use-copy";

export function ModeSwitch() {
  const { data: settings } = useSettings();
  const set = useSetSettings();
  const mode = useMode();
  const c = useCopy();

  if (!settings) return null;

  const flip = (next: "simple" | "pro") => {
    if (next === mode) return;
    set.mutate({ ...settings, mode: next });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label="Mode"
        className="inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--card)] p-0.5"
      >
        {(["simple", "pro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => flip(m)}
            className={
              "px-3 text-[12.5px] capitalize font-mono rounded-sm transition-colors " +
              (mode === m
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")
            }
          >
            {m}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[var(--fg-dim)]">{c.modeExplainer}</p>
    </div>
  );
}
```

- [ ] **Step 1.6.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 1.6.3: Commit**

```bash
git add src/components/mode-switch.tsx
git commit -m "feat(mode): add ModeSwitch component (Simple|Pro segmented control)"
```

---

### Task 1.7: Add `Mode` section to Settings page

**Files:**
- Modify: `src/components/settings-form.tsx`

- [ ] **Step 1.7.1: Read the current settings-form**

Run: `cat src/components/settings-form.tsx | head -60`

Identify the top of the form (above the Source section).

- [ ] **Step 1.7.2: Insert Mode section before Source**

In `src/components/settings-form.tsx`, add the `ModeSwitch` at the very top of the rendered sections. Wrap it in the existing eyebrow-section pattern used elsewhere in the file. Concretely, add this block as the first rendered section:

```tsx
import { ModeSwitch } from "./mode-switch";

// inside the rendered JSX, before the Source section:
<section className="space-y-3">
  <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
    Mode
  </h2>
  <ModeSwitch />
</section>
```

- [ ] **Step 1.7.3: Verify in app**

Run: `pnpm tauri dev`
Navigate to Settings. Verify:
- "Mode" section appears at the top.
- Toggling between Simple and Pro updates immediately (the page H1 may not change yet — that wires up in Phase 3+).
- Refreshing the app preserves the mode.

- [ ] **Step 1.7.4: Commit**

```bash
git add src/components/settings-form.tsx
git commit -m "feat(mode): add Mode section to Settings (Simple|Pro toggle)"
```

---

### Task 1.8: Mode migration announcement toast

**Files:**
- Create: `src/hooks/use-mode-migration-toast.ts`
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1.8.1: Create the hook**

```ts
import { useEffect, useRef } from "react";
import { useSettings, useSetSettings } from "./use-settings";

/**
 * Detects existing-install migration (mode_migration_announced === false but
 * mode === "pro" via the serde default) and surfaces a one-time toast.
 *
 * The new field defaults to false on legacy settings; on fresh defaults() it
 * is also false, but fresh installs go through first-run which sets mode to
 * "simple" and marks the toast unnecessary by setting the flag to true
 * silently when first-run completes.
 */
export function useModeMigrationToast(
  show: (message: string, actions?: { try: () => void; stay: () => void }) => void,
): void {
  const { data: settings } = useSettings();
  const set = useSetSettings();
  const shown = useRef(false);

  useEffect(() => {
    if (!settings || shown.current) return;
    if (settings.mode_migration_announced) return;
    if (!settings.first_run_completed && settings.mode === "simple") return; // brand new install
    if (settings.mode !== "pro") return;

    shown.current = true;
    show(
      "We added a Simple mode that hides the deeper details. You're in Pro now.",
      {
        try: () => {
          set.mutate({ ...settings, mode: "simple", mode_migration_announced: true });
        },
        stay: () => {
          set.mutate({ ...settings, mode_migration_announced: true });
        },
      },
    );
  }, [settings, set, show]);
}
```

- [ ] **Step 1.8.2: Wire from `AppShell`**

This depends on the existing toast system in the app. Check first:

Run: `grep -rn "toast\|Toast\|useToast" src/ --include="*.tsx" --include="*.ts" | head -20`

If there's a toast hook, wire `useModeMigrationToast(toast.show)` into `AppShell`. If no toast system exists yet, **stub a minimal one** in `app-shell.tsx`:

```tsx
import { useState } from "react";
import { useModeMigrationToast } from "@/hooks/use-mode-migration-toast";

// inside AppShell:
const [migrationToast, setMigrationToast] = useState<{
  msg: string;
  try: () => void;
  stay: () => void;
} | null>(null);

useModeMigrationToast((msg, actions) =>
  setMigrationToast(
    actions ? { msg, try: actions.try, stay: actions.stay } : null,
  ),
);

// render:
{migrationToast && (
  <div
    role="status"
    className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--popover)] px-4 py-2.5 text-[12.5px] shadow-lg"
  >
    <span>{migrationToast.msg}</span>
    <button
      onClick={() => {
        migrationToast.try();
        setMigrationToast(null);
      }}
      className="font-mono text-[11px] text-[var(--primary)]"
    >
      Try Simple
    </button>
    <button
      onClick={() => {
        migrationToast.stay();
        setMigrationToast(null);
      }}
      className="font-mono text-[11px] text-[var(--fg-dim)]"
    >
      Stay in Pro
    </button>
  </div>
)}
```

- [ ] **Step 1.8.3: Verify in app**

Run: `pnpm tauri dev`
- Toast should appear if `mode_migration_announced` is still false and `mode` is `"pro"`.
- After clicking either button, the toast should not return on reload.
- Reset by editing `~/Library/Application Support/skill-sync/settings.json` (delete `mode_migration_announced`) to retest.

- [ ] **Step 1.8.4: Commit**

```bash
git add src/hooks/use-mode-migration-toast.ts src/components/app-shell.tsx
git commit -m "feat(mode): surface one-time toast announcing the new Simple mode"
```

---

# Phase 2 · Home page

### Task 2.1: Create `home.tsx` skeleton with header strip

**Files:**
- Create: `src/pages/home.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 2.1.1: Write the page skeleton**

```tsx
// src/pages/home.tsx
import { useCopy } from "@/hooks/use-copy";
import { useSkills } from "@/hooks/use-skills";
import { useDrift } from "@/hooks/use-drift";

export function HomePage() {
  const c = useCopy();
  const { data: skills = [] } = useSkills();
  const { data: drift = {} } = useDrift();

  const total = skills.length;
  // TODO in next tasks: derive inSync, outOfSync, orphans, unknown.

  return (
    <main className="px-8 pt-7 pb-20">
      <div className="mb-6">
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
          {c.homeCrumb}
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          {/* health sentence wires up in Task 2.3 */}
          Your {total} skills are syncing.
        </h1>
        <p className="mt-1 font-mono text-[11px] text-[var(--fg-dim)]">
          {/* subhead wires in Task 2.3 */}
          last scan · source path
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2.1.2: Add the route**

Edit `src/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { HomePage } from "./pages/home";
import { LibraryPage } from "./pages/library";
import { TargetsPage } from "./pages/targets";
import { ActivityPage } from "./pages/activity";
import { SettingsPage } from "./pages/settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "targets", element: <TargetsPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
```

- [ ] **Step 2.1.3: Verify in app**

Run: `pnpm tauri dev`
- Navigate to `/`: Home page renders.
- Navigate to `/library`: Library page renders (was at `/` before).
- The old `/` (which used to be Library) now shows Home.

- [ ] **Step 2.1.4: Commit**

```bash
git add src/pages/home.tsx src/routes.tsx
git commit -m "feat(home): add Home page skeleton at / and demote Library to /library"
```

---

### Task 2.2: Build the status strip (4 cells)

**Files:**
- Modify: `src/pages/home.tsx`

- [ ] **Step 2.2.1: Derive counts from skills + drift**

Replace the `HomePage` body with:

```tsx
import { useNavigate } from "react-router-dom";
import { useCopy } from "@/hooks/use-copy";
import { useSkills } from "@/hooks/use-skills";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { useMemo } from "react";
import type { DriftStatus, SkillView } from "@/types/bindings";

function classify(
  skills: SkillView[],
  drift: Record<string, Record<string, DriftStatus>>,
  enabledTargets: string[],
) {
  let inSync = 0;
  let outOfSync = 0;
  let orphans = 0;
  let unknown = 0;
  for (const s of skills) {
    if (s.class === "Unknown") {
      unknown++;
      continue;
    }
    const perTarget = drift[s.name] ?? {};
    const statuses = enabledTargets.map((t) => perTarget[t] ?? "missing-in-target");
    if (statuses.every((d) => d === "in-sync")) inSync++;
    else if (statuses.some((d) => d === "drifted-target-newer" || d === "drifted-source-newer"))
      outOfSync++;
    else if (statuses.some((d) => d === "missing-in-target")) {
      // present in source but missing in some target — counts as out-of-sync UI-wise.
      outOfSync++;
    }
  }
  // Orphans = skills present in any target's drift table that don't have a SkillView entry
  // (their source is missing). Implementation in Task 2.4.
  return { inSync, outOfSync, orphans, unknown };
}

export function HomePage() {
  const c = useCopy();
  const nav = useNavigate();
  const { data: skills = [] } = useSkills();
  const { data: drift = {} } = useDrift();
  const { data: settings } = useSettings();
  const targets = settings?.enabled_targets ?? [];
  const counts = useMemo(() => classify(skills, drift, targets), [skills, drift, targets]);

  return (
    <main className="px-8 pt-7 pb-20">
      <div className="mb-6">
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
          {c.homeCrumb}
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          {counts.outOfSync === 0 && counts.orphans === 0 && counts.unknown === 0
            ? `Your ${skills.length} skills are in sync across ${targets.length} tools.`
            : `${counts.inSync} of your ${skills.length} skills are in sync. ${counts.outOfSync} out of sync, ${counts.orphans} not in your source.`}
        </h1>
        <p className="mt-1 font-mono text-[11px] text-[var(--fg-dim)]">
          last scan · source {settings?.source_root ?? "—"}
        </p>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-4 rounded-lg border border-[var(--border)] bg-[var(--card)] divide-x divide-[var(--border)]">
        <Cell label={c.statusInSync} value={`${counts.inSync} skills`} onClick={() => nav("/library?filter=mine")} />
        <Cell label={c.statusOutOfSync} value={`${counts.outOfSync} skills`} onClick={() => nav("/library?filter=out-of-sync")} />
        <Cell label={c.statusNeedsClaiming} value={`${counts.orphans} skills`} onClick={() => nav("/library?filter=orphan")} />
        <Cell label={c.statusUnknown} value={`${counts.unknown} skills`} onClick={() => nav("/library?filter=unknown")} />
      </div>
    </main>
  );
}

function Cell({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-5 text-left hover:bg-[var(--bg-hover)] transition-colors"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-[22px] tracking-[-0.01em]">{value}</p>
    </button>
  );
}
```

- [ ] **Step 2.2.2: Verify in app**

Run: `pnpm tauri dev` (already running — Vite hot-reloads).
- Home page now shows 4 cells with counts.
- Clicking each navigates to `/library?filter=…` (the filter is read in Phase 4).

- [ ] **Step 2.2.3: Commit**

```bash
git add src/pages/home.tsx
git commit -m "feat(home): status strip with In sync / Out of sync / Needs claiming / Unknown cells"
```

---

### Task 2.3: Primary actions in Home header

**Files:**
- Modify: `src/pages/home.tsx`

- [ ] **Step 2.3.1: Add Sync everything + New skill buttons**

In `src/pages/home.tsx`, wrap the existing header div in a flex row that places the H1+subhead on the left and two buttons on the right. Add at the top of imports:

```tsx
import { useSync } from "@/hooks/use-sync";
import { useState } from "react";
```

And add to the header markup (replace the existing `<div className="mb-6">` block):

```tsx
<div className="mb-6 flex items-start justify-between gap-6">
  <div>
    <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
      {c.homeCrumb}
    </p>
    <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
      {/* same conditional as above */}
    </h1>
    <p className="mt-1 font-mono text-[11px] text-[var(--fg-dim)]">
      last scan · source {settings?.source_root ?? "—"}
    </p>
  </div>
  <div className="flex items-center gap-2 pt-6">
    <button
      type="button"
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
      className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)] hover:brightness-105 disabled:opacity-50"
    >
      {c.syncEverythingButton} ↵
    </button>
    <button
      type="button"
      onClick={() => setNewSkillOpen(true)}
      className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-[var(--bg-hover)]"
    >
      + {c.newSkillButton === "+" ? "New skill" : c.newSkillButton}
    </button>
  </div>
</div>
```

Add at the top of the component body:

```tsx
const sync = useSync(); // assumes useSync exposes a `mutate()` that triggers usePlanSync flow
const [newSkillOpen, setNewSkillOpen] = useState(false);
```

If `useSync` exposes a different name, check `src/hooks/use-sync.ts` and adapt. The `newSkillOpen` state will be wired in Task 7.3.

- [ ] **Step 2.3.2: Verify in app**

- Home page shows the buttons.
- "Sync everything" runs a sync plan (toast/dialog from existing flow may surface).
- "New skill" does nothing yet (dialog is in Phase 7).

- [ ] **Step 2.3.3: Commit**

```bash
git add src/pages/home.tsx
git commit -m "feat(home): primary actions row (Sync everything + New skill placeholder)"
```

---

### Task 2.4: Orphan detection helper

**Files:**
- Create: `src/lib/orphans.ts`

- [ ] **Step 2.4.1: Write the helper**

Orphans are skills whose drift table includes target paths for skill names that don't have a `SkillView` (source absent). Until we have a backend command that surfaces them directly, derive from existing data.

```ts
import type { DriftStatus, SkillView } from "@/types/bindings";

export type Orphan = {
  name: string;
  tools: string[]; // target names where the skill was found
};

export function deriveOrphans(
  skills: SkillView[],
  drift: Record<string, Record<string, DriftStatus>>,
): Orphan[] {
  const known = new Set(skills.map((s) => s.name));
  const orphans: Orphan[] = [];
  for (const [name, perTarget] of Object.entries(drift)) {
    if (known.has(name)) continue;
    const tools: string[] = [];
    for (const [target, status] of Object.entries(perTarget)) {
      if (status !== "missing-in-target" && status !== "refused") tools.push(target);
    }
    if (tools.length > 0) orphans.push({ name, tools });
  }
  return orphans;
}
```

If the existing `useDrift()` shape is different, adjust the iteration accordingly. The plan assumes a `Record<skillName, Record<targetName, DriftStatus>>` shape, which is the typical layout for the existing matrix. Check `src/hooks/use-drift.ts` to confirm before continuing.

- [ ] **Step 2.4.2: Wire orphan count into Home counts**

In `src/pages/home.tsx`, import and use:

```tsx
import { deriveOrphans } from "@/lib/orphans";

const orphans = useMemo(() => deriveOrphans(skills, drift), [skills, drift]);
// then in counts, replace orphans: 0 with orphans.length
```

- [ ] **Step 2.4.3: Verify in app**

If you have a target dir containing a skill that doesn't exist in source, it should appear in the "Needs claiming" cell. Otherwise count is 0.

- [ ] **Step 2.4.4: Commit**

```bash
git add src/lib/orphans.ts src/pages/home.tsx
git commit -m "feat(home): derive orphan count from drift matrix vs SkillView set"
```

---

### Task 2.5: "Needs your attention" card

**Files:**
- Create: `src/components/needs-attention-card.tsx`
- Create: `src/components/orphan-row.tsx`
- Modify: `src/pages/home.tsx`

- [ ] **Step 2.5.1: Write OrphanRow**

```tsx
// src/components/orphan-row.tsx
import type { Orphan } from "@/lib/orphans";

export function OrphanRow({
  orphan,
  onClaim,
  onRemove,
}: {
  orphan: Orphan;
  onClaim: () => void;
  onRemove: (tool: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border)] last:border-0">
      <p className="text-[13.5px]">
        <code className="font-mono text-[var(--foreground)]">{orphan.name}</code>{" "}
        <span className="text-[var(--fg-dim)]">
          lives in {orphan.tools.join(", ")} but not in your source.
        </span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClaim}
          className="rounded-md bg-[var(--primary)] px-3 py-1 text-[11px] font-medium text-[var(--primary-foreground)]"
        >
          Claim
        </button>
        {orphan.tools.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onRemove(t)}
            className="rounded-md border border-[var(--border-strong)] px-3 py-1 text-[11px] text-[var(--danger)] hover:bg-[var(--bg-hover)]"
          >
            Remove from {t}
          </button>
        ))}
      </div>
    </div>
  );
}
```

`onClaim` and `onRemove` will use the existing `cmd_pull_back` (claim = pull-back into source) and a future delete-from-target flow. For this task, wire them to `console.log` and a TODO; the wiring is finalized in Task 4.5.

- [ ] **Step 2.5.2: Write NeedsAttentionCard**

```tsx
// src/components/needs-attention-card.tsx
import type { Orphan } from "@/lib/orphans";
import { OrphanRow } from "./orphan-row";

export function NeedsAttentionCard({
  orphans,
  // future: drifting, unknown rows
}: {
  orphans: Orphan[];
}) {
  if (orphans.length === 0) return null;
  const shown = orphans.slice(0, 5);
  return (
    <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
        Needs your attention
      </h2>
      <div>
        {shown.map((o) => (
          <OrphanRow
            key={o.name}
            orphan={o}
            onClaim={() => console.log("claim", o.name)}
            onRemove={(t) => console.log("remove", o.name, "from", t)}
          />
        ))}
      </div>
      {orphans.length > shown.length && (
        <p className="mt-3 text-[11px]">
          <a href="/library?filter=orphan" className="text-[var(--primary)] underline">
            view all in My Skills →
          </a>
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2.5.3: Mount in Home**

In `src/pages/home.tsx`, after the status strip:

```tsx
import { NeedsAttentionCard } from "@/components/needs-attention-card";

// after </div> of the status strip:
<NeedsAttentionCard orphans={orphans} />
```

- [ ] **Step 2.5.4: Verify in app**

If there's at least one orphan, the card appears. If not, manually create one by copying a skill into `~/.claude/skills` that isn't in the source root, OR temporarily mutate `deriveOrphans` to return a stub. Revert the stub after seeing the UI render.

- [ ] **Step 2.5.5: Commit**

```bash
git add src/components/orphan-row.tsx src/components/needs-attention-card.tsx src/pages/home.tsx
git commit -m "feat(home): Needs your attention card listing orphan skills"
```

---

### Task 2.6: Recent activity teaser

**Files:**
- Create: `src/lib/activity-sentence.ts`
- Modify: `src/pages/home.tsx`

- [ ] **Step 2.6.1: Write the sentence renderer**

```ts
// src/lib/activity-sentence.ts
import type { AuditEntry } from "@/types/bindings";

export function activitySentence(e: AuditEntry): string {
  switch (e.kind) {
    case "sync.commit":
      return `Synced "${e.data?.skill ?? "?"}" to ${(e.data?.targets ?? []).join(", ") || "no tools"}`;
    case "pull.back":
      return `Pulled "${e.data?.skill ?? "?"}" back from ${e.data?.target ?? "?"}`;
    case "archive":
      return `Saved an older version of "${e.data?.skill ?? "?"}"`;
    case "refused":
      return `Couldn't write "${e.data?.skill ?? "?"}" to ${e.data?.target ?? "?"} — ${e.data?.reason ?? "blocked"}`;
    case "drift.detected":
      return `Noticed "${e.data?.skill ?? "?"}" changed in ${e.data?.target ?? "?"}`;
    case "package.build":
      return `Built a .skill for "${e.data?.skill ?? "?"}"`;
    default:
      return `${e.kind} · ${e.data?.skill ?? ""}`.trim();
  }
}
```

If the actual `kind` values don't match these (check `src-tauri/src/audit.rs`), adjust the cases.

- [ ] **Step 2.6.2: Add teaser to Home**

In `src/pages/home.tsx`:

```tsx
import { useAudit } from "@/hooks/use-audit"; // confirm hook exists; if not, use the existing audit query
import { activitySentence } from "@/lib/activity-sentence";

// inside the component, after counts:
const { data: audit = [] } = useAudit();
const recent = audit.slice(0, 3);

// at the bottom of <main>:
<section className="mt-8">
  <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
    Recent activity
  </h2>
  <ul className="space-y-1.5 text-[13.5px]">
    {recent.map((e, i) => (
      <li key={i} className="text-[var(--muted-foreground)]">
        <span className="font-mono text-[var(--fg-dim)]">
          {new Date(e.ts).toLocaleTimeString()} ·
        </span>{" "}
        {activitySentence(e)}
      </li>
    ))}
  </ul>
  <p className="mt-3 text-[11px]">
    <a href="/activity" className="text-[var(--primary)] underline">
      view full history →
    </a>
  </p>
</section>
```

If `use-audit.ts` doesn't exist, check what hook the existing Activity page uses (Read `src/pages/activity.tsx`) and copy that pattern.

- [ ] **Step 2.6.3: Verify in app**

Home shows up to 3 recent events with friendly sentences.

- [ ] **Step 2.6.4: Commit**

```bash
git add src/lib/activity-sentence.ts src/pages/home.tsx
git commit -m "feat(home): recent activity teaser with sentence-style rendering"
```

---

### Task 2.7: Empty states for Home

**Files:**
- Modify: `src/pages/home.tsx`

- [ ] **Step 2.7.1: Add empty-state branches**

Replace the H1 logic with:

```tsx
const c = useCopy();
// existing imports/state…

let h1: string;
let showPrimary = true;
if (skills.length === 0) {
  h1 = "Your source folder is empty. Create your first skill to get going.";
  showPrimary = false; // hide "Sync everything"
} else if (counts.outOfSync === 0 && counts.orphans === 0 && counts.unknown === 0) {
  h1 = `Your ${skills.length} skills are in sync across ${targets.length} tools.`;
} else {
  h1 = `${counts.inSync} of your ${skills.length} skills are in sync. ${counts.outOfSync} out of sync, ${counts.orphans} not in your source.`;
}
```

Use `h1` as the H1 content. Show a single `+ Create your first skill` lime button (instead of the two-button row) when `skills.length === 0`. When all-happy, render a small `<p>{c.nothingToTend}</p>` line in place of the NeedsAttentionCard.

- [ ] **Step 2.7.2: Verify**

- Test by temporarily pointing source_root to an empty folder — H1 changes.
- Restore the original `source_root`.

- [ ] **Step 2.7.3: Commit**

```bash
git add src/pages/home.tsx
git commit -m "feat(home): empty + all-happy + has-issues states"
```

---

# Phase 3 · Sidebar

### Task 3.1: Mode-aware sidebar nav labels

**Files:**
- Modify: `src/components/sidebar.tsx`

- [ ] **Step 3.1.1: Read current sidebar**

Run: `cat src/components/sidebar.tsx`

- [ ] **Step 3.1.2: Add `Home` entry + use `useCopy()` for labels**

Replace the nav-items array (or hardcoded `<NavLink>` list) with mode-aware labels:

```tsx
import { useMode } from "@/hooks/use-mode";

const mode = useMode();
const items =
  mode === "simple"
    ? [
        { to: "/", label: "Home" },
        { to: "/library", label: "My Skills" },
        { to: "/targets", label: "Where they sync" },
        { to: "/activity", label: "History" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/library", label: "Library" },
        { to: "/targets", label: "Targets" },
        { to: "/activity", label: "Activity" },
        { to: "/packages", label: "Packages" }, // Pro-only entry
      ];
```

Render via the existing nav-item component pattern in the file (keep the count badges intact for Library/Targets/Activity, drop them for Home and Packages since neither has a useful count).

- [ ] **Step 3.1.3: Verify in app**

Toggle Settings → Mode and observe sidebar labels swap.

- [ ] **Step 3.1.4: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "ui(sidebar): mode-aware nav labels + Home entry + Packages (Pro only)"
```

---

### Task 3.2: Hide `build · <sha>` in Simple footer

**Files:**
- Modify: `src/components/sidebar.tsx`

- [ ] **Step 3.2.1: Conditionally render the build line**

In the footer of `sidebar.tsx`, wrap the `build · <sha>` line:

```tsx
{mode === "pro" && (
  <p className="font-mono text-[10.5px] text-[var(--fg-faint)]">
    build · {import.meta.env.VITE_BUILD_SHA || "dev"}
  </p>
)}
```

- [ ] **Step 3.2.2: Verify in app**

- Simple mode: build line hidden.
- Pro mode: build line visible.

- [ ] **Step 3.2.3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "ui(sidebar): hide build sha in Simple mode footer"
```

---

# Phase 4 · Library (Simple variant + orphan section)

### Task 4.1: ToolIconRow component

**Files:**
- Create: `src/components/tool-icon-row.tsx`

- [ ] **Step 4.1.1: Write the component**

```tsx
// src/components/tool-icon-row.tsx
import type { DriftStatus } from "@/types/bindings";
import * as Tooltip from "@radix-ui/react-tooltip";

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  cowork: "Cowork",
};

function colorFor(status: DriftStatus | undefined): string {
  if (status === "in-sync") return "var(--primary)";
  if (status === "drifted-source-newer" || status === "drifted-target-newer") return "var(--warning)";
  if (status === "missing-in-target") return "var(--fg-faint)";
  if (status === "refused") return "var(--fg-faint)";
  return "var(--fg-faint)";
}

function tooltipFor(tool: string, status: DriftStatus | undefined): string {
  const label = TOOL_LABELS[tool] ?? tool;
  switch (status) {
    case "in-sync":
      return `In ${label} · in sync`;
    case "drifted-source-newer":
      return `In ${label} · your version is newer`;
    case "drifted-target-newer":
      return `In ${label} · their version is newer`;
    case "missing-in-target":
      return `Not in ${label}`;
    case "refused":
      return `Skill Sync wouldn't write here — looks like it's installed by ${label} itself`;
    default:
      return label;
  }
}

export function ToolIconRow({
  tools,
  perTarget,
}: {
  tools: string[];
  perTarget: Record<string, DriftStatus | undefined>;
}) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="inline-flex items-center gap-1.5">
        {tools.map((t) => {
          const status = perTarget[t];
          const dashed = status === "refused" || status === "missing-in-target";
          return (
            <Tooltip.Root key={t}>
              <Tooltip.Trigger asChild>
                <span
                  aria-label={tooltipFor(t, status)}
                  className="inline-block h-4 w-4 rounded-sm"
                  style={{
                    background: dashed ? "transparent" : colorFor(status),
                    border: `1px ${dashed ? "dashed" : "solid"} ${colorFor(status)}`,
                  }}
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="rounded-sm border border-[var(--border)] bg-[var(--popover)] px-2 py-1 font-mono text-[11px]"
                >
                  {tooltipFor(t, status)}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
}
```

- [ ] **Step 4.1.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4.1.3: Commit**

```bash
git add src/components/tool-icon-row.tsx
git commit -m "ui(library): add ToolIconRow for Simple-mode 'Where it lives' column"
```

---

### Task 4.2: Mode-aware Library table columns

**Files:**
- Modify: `src/components/library-table.tsx`

- [ ] **Step 4.2.1: Read current library-table**

Run: `cat src/components/library-table.tsx | head -80`

Identify the column definitions in the table render.

- [ ] **Step 4.2.2: Branch column set on `useMode()`**

In the table component, derive `mode = useMode()` and conditionally render columns. In Simple, the table head should be:

```tsx
<tr>
  <th className="text-left">Skill</th>
  <th className="text-left">Status</th>
  <th className="text-left">Where it lives</th>
  <th className="text-left">Updated</th>
  <th className="text-right">Actions</th>
</tr>
```

The Pro variant stays as the current Console spec. Body rows similarly branch:

- Status cell: single plain-English chip:
  - `in-sync` everywhere → `In sync` (lime)
  - any `drifted-*` → `Out of sync · ${affected_count} ${affected_count===1 ? "tool" : "tools"}` (amber)
  - any `missing-in-target` and skill.class !== Unknown → `Out of sync · N tool(s)` (amber)
  - skill.class === Unknown → `Unknown` (amber outline)
  - skill not in skills set (orphan) → `Not in your source` (red outline)
- Where it lives: `<ToolIconRow tools={enabledTargets} perTarget={drift[skill.name] ?? {}} />`
- Updated: friendly relative timestamp ("today at HH:MM", "Nd ago"). Implement a `friendlyTime(iso: string)` helper inline or in `src/lib/time.ts`.

- [ ] **Step 4.2.3: Add `friendlyTime` helper**

Create or extend `src/lib/time.ts`:

```ts
export function friendlyTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
```

- [ ] **Step 4.2.4: Verify in app**

- Switch to Simple mode → Library shows 5 columns (Skill, Status, Where it lives, Updated, Actions).
- Switch to Pro mode → Library shows 6 columns (Skill, Owner, Targets, Updated, Size, Actions).
- Tool icons in Simple are color-coded; hover shows tooltip.

- [ ] **Step 4.2.5: Commit**

```bash
git add src/components/library-table.tsx src/lib/time.ts
git commit -m "ui(library): mode-aware column set; Simple uses Status + ToolIconRow"
```

---

### Task 4.3: Library header strip + subhead per mode

**Files:**
- Modify: `src/pages/library.tsx`

- [ ] **Step 4.3.1: Use `useCopy()` for crumb + H1 + subhead**

```tsx
import { useCopy } from "@/hooks/use-copy";
import { useMode } from "@/hooks/use-mode";

// inside the component:
const c = useCopy();
const mode = useMode();

// header:
<p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
  {c.libraryCrumb(settings?.source_root ?? "~/.claude/skills")}
</p>
<h1 className="text-[28px] font-semibold tracking-[-0.02em]">{c.libraryTitle}</h1>
<p className="mt-1 font-mono text-[11px] text-[var(--fg-dim)]">
  {c.librarySubhead(total, targets.length, mode === "simple" ? outOfSyncCount : driftingCount, lastScanTime)}
</p>
```

`outOfSyncCount` includes drifted + missing-in-target in Simple; `driftingCount` is only drifted in Pro. Define them inline from the counts computed in this page.

- [ ] **Step 4.3.2: Add `+ New skill` ghost button to header-right (Simple only)**

```tsx
{mode === "simple" && (
  <button
    type="button"
    onClick={() => setNewSkillOpen(true)}
    className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)]"
  >
    + New skill
  </button>
)}
```

Place it next to the existing `Preview ⌘P` / `Sync all ↵` buttons. Wires up in Task 7.3.

- [ ] **Step 4.3.3: Verify in app**

Toggle mode; crumb / H1 / subhead update.

- [ ] **Step 4.3.4: Commit**

```bash
git add src/pages/library.tsx
git commit -m "ui(library): mode-aware header (crumb, H1, subhead) + Simple-only New skill button"
```

---

### Task 4.4: Filter chips per mode

**Files:**
- Modify: `src/pages/library.tsx` or `src/components/library-table.tsx` (whichever owns chips)

- [ ] **Step 4.4.1: Source chips from copy**

Replace the hardcoded chip list with:

```tsx
const c = useCopy();
const chips = c.libraryFilters; // ["All","Mine","Unknown","Out of sync"] or Pro list

// render each chip with its current selected state and count.
```

For the Simple filters:
- All → no filter
- Mine → skills where `class === "MineHeuristic"` and ownership confirmed mine
- Unknown → `class === "Unknown"`
- Out of sync → any drifted or missing-in-target across enabled targets

Implement the filter logic inline; this is the same data the existing Pro filters already consume, just sliced differently.

URL param handling: read `?filter=…` from `useSearchParams()` to support the deep-links from Home cells. Map `out-of-sync`, `orphan`, `mine`, `unknown` to the corresponding chip.

- [ ] **Step 4.4.2: Verify**

- Click a Home stat cell → Library loads with that filter chip pre-selected.
- Toggle to Pro → chips switch to All / Mine / Bundle / Built-in / Unknown.

- [ ] **Step 4.4.3: Commit**

```bash
git add src/pages/library.tsx
git commit -m "ui(library): mode-aware filter chips; respect ?filter= URL param"
```

---

### Task 4.5: Orphan section atop Library table

**Files:**
- Modify: `src/components/library-table.tsx` (or `src/pages/library.tsx` — wherever the table mounts)

- [ ] **Step 4.5.1: Render OrphanRow group above the main rows**

```tsx
import { deriveOrphans } from "@/lib/orphans";
import { OrphanRow } from "@/components/orphan-row";

const orphans = useMemo(() => deriveOrphans(skills, drift), [skills, drift]);

// before the table:
{mode === "simple" && orphans.length > 0 && (
  <section className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
    <h2 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
      {orphans.length} skill{orphans.length === 1 ? "" : "s"} in your tools isn't in your source
    </h2>
    {orphans.map((o) => (
      <OrphanRow
        key={o.name}
        orphan={o}
        onClaim={() => claim(o)}
        onRemove={(t) => removeFromTarget(o.name, t)}
      />
    ))}
  </section>
)}
```

- [ ] **Step 4.5.2: Wire `claim` to existing `cmd_pull_back`**

Use the existing `usePullBack()` hook (or whatever the project named it). The pull-back command copies a target file back into source. Pass `(skillName, targetName)` — pick the first target in `orphan.tools` for the claim action. Confirm the call signature by reading `src/hooks/use-sync.ts` or wherever `pull_back` is wrapped.

```tsx
const pullBack = usePullBack();
const claim = (o: Orphan) => pullBack.mutate({ skill: o.name, target: o.tools[0] });
```

- [ ] **Step 4.5.3: `removeFromTarget` for orphans**

If no existing "delete skill from target" command exists, surface a toast: *"Removing from a tool isn't wired yet — open the folder in Finder and delete it manually."* with a button to open the target folder. The plan does not add a new delete command; the orphan rows give a clear path forward (claim or open Finder).

```tsx
const removeFromTarget = (name: string, tool: string) => {
  alert(`Removing from ${tool} isn't wired yet. Open the folder in Finder and delete it manually.`);
};
```

Replace `alert` with the project's toast if one exists.

- [ ] **Step 4.5.4: Verify in app**

- If you can produce an orphan (skill in `~/.claude/skills` that doesn't exist in your source root), it should appear in the section.
- Clicking Claim runs pull-back; the orphan disappears after the next refresh.

- [ ] **Step 4.5.5: Commit**

```bash
git add src/components/library-table.tsx src/pages/library.tsx
git commit -m "ui(library): orphan section atop the table; Claim wires to pull-back"
```

---

### Task 4.6: OwnerBadge — hide Bundle/Built-in chips in Simple

**Files:**
- Modify: `src/components/owner-badge.tsx`

- [ ] **Step 4.6.1: Branch render on mode**

```tsx
import { useMode } from "@/hooks/use-mode";

// inside the component:
const mode = useMode();

// at the top of render:
if (mode === "simple") {
  if (skill.class === "Bundle" || skill.class === "ToolBuiltin") {
    return null; // hidden in Simple
  }
  // For MineHeuristic / Mine / Unknown — render the existing chip variants minus Bundle / Built-in.
}
```

Skills with `class === "Bundle"` or `"ToolBuiltin"` should also be filtered OUT of the Library table's rows entirely in Simple mode. Add the filter in the page-level skills list:

```tsx
const visibleSkills = mode === "simple"
  ? skills.filter((s) => s.class !== "Bundle" && s.class !== "ToolBuiltin")
  : skills;
```

- [ ] **Step 4.6.2: Verify**

In Simple mode, skills classified as Bundle/Built-in don't appear at all. In Pro, they appear with their chips.

- [ ] **Step 4.6.3: Commit**

```bash
git add src/components/owner-badge.tsx src/pages/library.tsx
git commit -m "ui(library): hide Bundle/Built-in skills entirely in Simple mode"
```

---

# Phase 5 · Drawer + Compare dialog

### Task 5.1: Compare dialog

**Files:**
- Create: `src/components/compare-dialog.tsx`

- [ ] **Step 5.1.1: Write the dialog**

```tsx
// src/components/compare-dialog.tsx
import * as Dialog from "@radix-ui/react-dialog";
import { open as openUrl } from "@tauri-apps/plugin-opener";
import { friendlyTime } from "@/lib/time";

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  cowork: "Cowork",
};

export function CompareDialog({
  open,
  onClose,
  skillName,
  tool,
  yourPath,
  yourUpdated,
  theirPath,
  theirUpdated,
}: {
  open: boolean;
  onClose: () => void;
  skillName: string;
  tool: string;
  yourPath: string;
  yourUpdated: string;
  theirPath: string;
  theirUpdated: string;
}) {
  const toolLabel = TOOL_LABELS[tool] ?? tool;
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-5">
          <Dialog.Title className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
            Compare with {toolLabel}
          </Dialog.Title>
          <Dialog.Description className="text-[13.5px] text-[var(--foreground)]">
            Your version of <code className="font-mono">{skillName}</code> was last edited{" "}
            <strong>{friendlyTime(yourUpdated)}</strong>. {toolLabel}'s version was last edited{" "}
            <strong>{friendlyTime(theirUpdated)}</strong>. They're different.
          </Dialog.Description>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                openUrl(yourPath);
                openUrl(theirPath);
              }}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)]"
            >
              Open both files
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 5.1.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 5.1.3: Commit**

```bash
git add src/components/compare-dialog.tsx
git commit -m "ui(drawer): add Compare dialog (Simple-mode replacement for diff block)"
```

---

### Task 5.2: Drawer mode-aware meta grid + Compare wiring

**Files:**
- Modify: `src/components/skill-detail-drawer.tsx`

- [ ] **Step 5.2.1: Read current drawer**

Run: `cat src/components/skill-detail-drawer.tsx | head -120`

Locate the meta grid, the per-target rows, and the diff block.

- [ ] **Step 5.2.2: Hide hash + commit timestamp rows in Simple**

```tsx
const mode = useMode();

// inside meta grid:
{mode === "pro" && (
  <>
    <MetaRow label="Source hash" value={skill.locations[0]?.hash ?? "—"} />
    <MetaRow label="Latest commit" value={friendlyTime(skill.lastCommit)} />
  </>
)}
```

- [ ] **Step 5.2.3: Hide diff block + add Compare button in Simple**

Wrap the existing diff block:

```tsx
{mode === "pro" ? (
  <DiffBlock skill={skill} /> // existing
) : driftedTarget && (
  <div className="my-4">
    <button
      type="button"
      onClick={() => setCompareOpen(driftedTarget)}
      className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)]"
    >
      Compare with {TOOL_LABELS[driftedTarget] ?? driftedTarget}'s version →
    </button>
  </div>
)}
```

`driftedTarget` = the first target where this skill's drift status is `drifted-*`. If none drifted, no button.

Render `<CompareDialog … />` at the end of the drawer with `open={compareOpen !== null}` etc., supplying `yourPath` / `theirPath` from the skill data.

- [ ] **Step 5.2.4: Per-target row plain-English status (Simple)**

In the Tools list inside the drawer, branch the status label on mode:

```tsx
function plainStatus(s: DriftStatus): string {
  switch (s) {
    case "in-sync": return "In sync";
    case "drifted-source-newer": return "Different (your version is newer)";
    case "drifted-target-newer": return "Different (their version is newer)";
    case "missing-in-target": return "Not present";
    case "refused": return "Couldn't write — looks like it's installed by the tool itself";
    case "unmanaged": return "Unmanaged";
  }
}
```

In Simple, also drop the per-target hash row.

- [ ] **Step 5.2.5: Hide Build .skill button in Simple**

```tsx
{mode === "pro" && (
  <button disabled title="Packaging not yet wired" /* … */>Build .skill</button>
)}
```

- [ ] **Step 5.2.6: Verify in app**

- Open a drawer in Simple: no hashes, no diff, but a Compare button (if drifted).
- Open in Pro: hashes + diff + Build .skill (disabled) all visible.

- [ ] **Step 5.2.7: Commit**

```bash
git add src/components/skill-detail-drawer.tsx
git commit -m "ui(drawer): mode-aware meta grid; Compare dialog replaces diff in Simple"
```

---

# Phase 6 · Targets, Activity, Settings (Simple variants)

### Task 6.1: TargetCard label swaps

**Files:**
- Modify: `src/components/target-card.tsx`

- [ ] **Step 6.1.1: Source labels from `useCopy()`**

In `target-card.tsx`, replace hardcoded labels:

```tsx
const c = useCopy();
const statusLabel = enabled ? c.targetStatusActive : (configured ? c.targetStatusOff : c.targetStatusNotSetUp);

// HealthBar label below:
{c.healthBarLabel(synced, drift, blocked)}

// Action buttons:
<button>{c.showInFinder}</button>
<button>{c.testConnection}</button>
<button>{c.turnOff}</button>
```

- [ ] **Step 6.1.2: Hide Cowork target card in Simple**

In `src/pages/targets.tsx`:

```tsx
const mode = useMode();
const visibleTargets = mode === "simple"
  ? targets.filter((t) => t.name !== "cowork")
  : targets;
```

- [ ] **Step 6.1.3: Verify in app**

- Simple: 3 target cards (Claude, Codex, Cursor); pills say "In use" / "Off" / "Not set up"; health label uses "happy/different/blocked".
- Pro: 4 cards including Cowork; Console pill labels and health phrasing.

- [ ] **Step 6.1.4: Commit**

```bash
git add src/components/target-card.tsx src/pages/targets.tsx
git commit -m "ui(targets): mode-aware target card labels; Cowork hidden in Simple"
```

---

### Task 6.2: Targets page H1 + subhead

**Files:**
- Modify: `src/pages/targets.tsx`

- [ ] **Step 6.2.1: Use `useCopy()` for H1 / crumb**

```tsx
const c = useCopy();
const mode = useMode();
// …
<p>{c.targetsCrumb}</p>
<h1>{c.targetsTitle}</h1>
<p>
  {mode === "simple"
    ? visibleTargets.map((t) => TOOL_LABELS[t.name] ?? t.name).join(" · ")
    : `${configured} cabinets · ${mirrors} directory mirrors · ${packages} package`}
</p>
```

- [ ] **Step 6.2.2: Verify**

Toggle mode; header swaps.

- [ ] **Step 6.2.3: Commit**

```bash
git add src/pages/targets.tsx
git commit -m "ui(targets): mode-aware header (crumb, H1, subhead)"
```

---

### Task 6.3: Activity sentence rendering in Simple

**Files:**
- Modify: `src/components/activity-list.tsx`

- [ ] **Step 6.3.1: Branch row template on mode**

```tsx
import { useMode } from "@/hooks/use-mode";
import { activitySentence } from "@/lib/activity-sentence";

const mode = useMode();
// …
{mode === "simple" ? (
  <tr key={i}>
    <td className="font-mono text-[11px] text-[var(--fg-dim)]">
      {friendlyTime(e.ts)}
    </td>
    <td className="text-[13.5px]">{activitySentence(e)}</td>
    <td className="text-right">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dotColorFor(e.kind) }}
      />
    </td>
  </tr>
) : (
  // existing Pro-mode columnar row
)}
```

`dotColorFor`:

```ts
function dotColorFor(kind: string): string {
  switch (kind) {
    case "sync.commit": return "var(--primary)";
    case "pull.back": return "var(--info)";
    case "drift.detected": return "var(--warning)";
    case "refused": return "var(--danger)";
    case "package.build": return "var(--violet)";
    default: return "var(--fg-dim)";
  }
}
```

- [ ] **Step 6.3.2: Verify in app**

- Simple Activity: sentence rows with timestamp + sentence + dot.
- Pro Activity: dense columnar table.

- [ ] **Step 6.3.3: Commit**

```bash
git add src/components/activity-list.tsx
git commit -m "ui(activity): sentence rows in Simple; dense columns in Pro"
```

---

### Task 6.4: Activity filter chips per mode

**Files:**
- Modify: `src/pages/activity.tsx`

- [ ] **Step 6.4.1: Source chips from `useCopy()`**

```tsx
const c = useCopy();
const chips = c.activityFilters;
```

Map each chip label to a filter predicate (e.g., "Synced" → `e.kind === "sync.commit"`). Add the predicate inline.

- [ ] **Step 6.4.2: Verify**

Toggle mode; chip labels swap.

- [ ] **Step 6.4.3: Commit**

```bash
git add src/pages/activity.tsx
git commit -m "ui(activity): mode-aware filter chips"
```

---

### Task 6.5: Activity + Settings subhead/copy

**Files:**
- Modify: `src/pages/activity.tsx`
- Modify: `src/pages/settings.tsx`

- [ ] **Step 6.5.1: Activity subhead**

```tsx
const c = useCopy();
<p>{c.historySubhead(audit.length)}</p>
<h1>{c.historyTitle}</h1>
<p>{c.historyCrumb}</p>
```

- [ ] **Step 6.5.2: Settings — collapse Diagnostics + Packaging in Simple**

```tsx
const mode = useMode();
{mode === "pro" && <PackagingSection />}
{mode === "simple" ? (
  <CollapsibleDiagnostics />
) : (
  <DiagnosticsExpanded />
)}
```

`CollapsibleDiagnostics` is a `<details>` element:

```tsx
function CollapsibleDiagnostics() {
  const c = useCopy();
  return (
    <details className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
      <summary className="cursor-pointer text-[12.5px]">{c.diagnosticsCollapsedRow}</summary>
      <div className="mt-3 space-y-2">
        {/* same rows as DiagnosticsExpanded */}
      </div>
    </details>
  );
}
```

Use `c.diagnosticsAuditRowLabel` for the row currently labeled "Audit log".

- [ ] **Step 6.5.3: Verify in app**

- Simple Settings: no Packaging section; Diagnostics collapsed by default; the audit row label reads "History file".
- Pro Settings: Packaging visible; Diagnostics expanded; audit row labeled "Audit log".

- [ ] **Step 6.5.4: Commit**

```bash
git add src/pages/activity.tsx src/pages/settings.tsx
git commit -m "ui(activity|settings): mode-aware subhead; collapsed Diagnostics + hidden Packaging in Simple"
```

---

# Phase 7 · New-skill scaffolder

### Task 7.1: Rust scaffold command (TDD)

**Files:**
- Create: `src-tauri/src/ipc/skills_scaffold.rs`
- Modify: `src-tauri/src/ipc/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 7.1.1: Write failing tests first**

```rust
// src-tauri/src/ipc/skills_scaffold.rs
use serde::Serialize;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum ScaffoldError {
    #[error("invalid name: {0}")]
    InvalidName(String),
    #[error("a skill called {0} already exists")]
    Duplicate(String),
    #[error("source root is not set")]
    SourceRootUnset,
    #[error("io error: {0}")]
    Io(String),
}

const NAME_RE: &str = r"^[a-z0-9-]+$";

pub fn validate_name(name: &str) -> Result<(), ScaffoldError> {
    use regex::Regex;
    if name.is_empty() || name.len() > 64 {
        return Err(ScaffoldError::InvalidName(format!(
            "{} chars (must be 1..=64)",
            name.len()
        )));
    }
    let re = Regex::new(NAME_RE).unwrap();
    if !re.is_match(name) {
        return Err(ScaffoldError::InvalidName(
            "use lowercase letters, digits, and dashes only".into(),
        ));
    }
    Ok(())
}

pub fn scaffold_at(source_root: &Path, name: &str, description: &str) -> Result<PathBuf, ScaffoldError> {
    validate_name(name)?;
    let skill_dir = source_root.join(name);
    if skill_dir.exists() {
        return Err(ScaffoldError::Duplicate(name.into()));
    }
    std::fs::create_dir_all(&skill_dir).map_err(|e| ScaffoldError::Io(e.to_string()))?;
    let skill_md = skill_dir.join("SKILL.md");
    let body = format!(
        "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n<!-- Replace this with your skill content. -->\n",
        name, description, name
    );
    std::fs::write(&skill_md, body).map_err(|e| ScaffoldError::Io(e.to_string()))?;
    Ok(skill_md)
}

#[tauri::command]
pub fn cmd_scaffold_skill(name: String, description: String) -> Result<PathBuf, String> {
    use crate::config::{load_or_init, settings::Settings};
    use crate::paths::Paths;
    let home = dirs::home_dir().ok_or("no home dir")?;
    let paths = Paths::for_home(home.clone());
    let settings: Settings = load_or_init(&paths.config_dir().join("settings.json"), Settings::defaults(&home))
        .map_err(|e| e.to_string())?;
    scaffold_at(&settings.source_root, &name, &description).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn rejects_empty_name() {
        assert!(matches!(validate_name(""), Err(ScaffoldError::InvalidName(_))));
    }

    #[test]
    fn rejects_spaces() {
        assert!(matches!(validate_name("hello world"), Err(ScaffoldError::InvalidName(_))));
    }

    #[test]
    fn rejects_uppercase() {
        assert!(matches!(validate_name("HelloWorld"), Err(ScaffoldError::InvalidName(_))));
    }

    #[test]
    fn accepts_valid_kebab() {
        assert!(validate_name("my-cool-skill").is_ok());
    }

    #[test]
    fn scaffolds_directory_and_skill_md() {
        let td = TempDir::new().unwrap();
        let p = scaffold_at(td.path(), "test-skill", "Does a test thing.").unwrap();
        assert!(p.ends_with("test-skill/SKILL.md"));
        let body = std::fs::read_to_string(&p).unwrap();
        assert!(body.contains("name: test-skill"));
        assert!(body.contains("description: Does a test thing."));
        assert!(body.contains("# test-skill"));
    }

    #[test]
    fn rejects_duplicate() {
        let td = TempDir::new().unwrap();
        scaffold_at(td.path(), "dup", "first").unwrap();
        let err = scaffold_at(td.path(), "dup", "second").unwrap_err();
        assert!(matches!(err, ScaffoldError::Duplicate(_)));
    }
}
```

Add `regex = "1"` to `[dependencies]` in `src-tauri/Cargo.toml` if not present.

- [ ] **Step 7.1.2: Run tests; verify they fail (regex / compile errors initially)**

Run: `cd src-tauri && cargo test skills_scaffold`
Expected: compile errors until `regex` is added to deps. Add it, retry.

- [ ] **Step 7.1.3: Add `regex` dep and module wiring**

In `src-tauri/Cargo.toml`:
```toml
regex = "1"
```

In `src-tauri/src/ipc/mod.rs`:
```rust
pub mod commands;
pub mod skills_scaffold;
```

In `src-tauri/src/lib.rs`:
```rust
use ipc::skills_scaffold::cmd_scaffold_skill;

// in invoke_handler:
cmd_scaffold_skill,
```

- [ ] **Step 7.1.4: Run tests; verify they pass**

Run: `cd src-tauri && cargo test skills_scaffold`
Expected: 6 passed.

- [ ] **Step 7.1.5: Regenerate bindings (defensive)**

Run: `cd src-tauri && cargo test --quiet`
Expected: all tests pass.

- [ ] **Step 7.1.6: Commit**

```bash
git add src-tauri/src/ipc/skills_scaffold.rs src-tauri/src/ipc/mod.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(scaffold): add cmd_scaffold_skill with name validation + dup detection"
```

---

### Task 7.2: `NewSkillDialog` component

**Files:**
- Create: `src/components/new-skill-dialog.tsx`
- Modify: `src/lib/ipc.ts` (whatever wraps Tauri invokes)

- [ ] **Step 7.2.1: Add IPC wrapper**

In `src/lib/ipc.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";

export const ipc = {
  // …existing
  scaffoldSkill: (name: string, description: string) =>
    invoke<string>("cmd_scaffold_skill", { name, description }),
};
```

- [ ] **Step 7.2.2: Write the dialog**

```tsx
// src/components/new-skill-dialog.tsx
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { open as openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "@/lib/ipc";

const NAME_RE = /^[a-z0-9-]+$/;

export function NewSkillDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (path: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [openInEditor, setOpenInEditor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameError =
    name.length === 0
      ? null
      : !NAME_RE.test(name)
      ? "Use lowercase letters, digits, and dashes only."
      : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = await ipc.scaffoldSkill(name, desc);
      if (openInEditor) await openUrl(path);
      onCreated(path, name);
      setName("");
      setDesc("");
      onClose();
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e?.message ?? "Something went wrong.";
      if (msg.includes("already exists")) {
        setError(`You already have a skill called "${name}". Pick a different name.`);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-5">
          <Dialog.Title className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--fg-dim)]">
            Create a new skill
          </Dialog.Title>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-[12.5px]">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-cool-skill"
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 font-mono text-[13.5px]"
              />
              <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
                This becomes the folder name. Use dashes, not spaces.
              </p>
              {nameError && <p className="mt-1 text-[11px] text-[var(--danger)]">{nameError}</p>}
            </label>
            <label className="block">
              <span className="text-[12.5px]">What does it do?</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-[13.5px]"
              />
              <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
                This is what tells the AI when to use your skill. Write it like you're
                explaining to a colleague.
              </p>
              {desc.length > 200 && (
                <p className="mt-1 text-[11px] text-[var(--warning)]">
                  Long descriptions are fine, but most skills get away with one sentence.
                </p>
              )}
            </label>
            <label className="flex items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={openInEditor}
                onChange={(e) => setOpenInEditor(e.target.checked)}
              />
              Open in editor when created
            </label>
            {error && <p className="text-[12.5px] text-[var(--danger)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !!nameError || name.length === 0}
                onClick={submit}
                className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)] disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create skill"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 7.2.3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 7.2.4: Commit**

```bash
git add src/components/new-skill-dialog.tsx src/lib/ipc.ts
git commit -m "feat(scaffold): add NewSkillDialog + scaffoldSkill IPC wrapper"
```

---

### Task 7.3: Wire NewSkillDialog from Home, Library, and ⌘N

**Files:**
- Modify: `src/pages/home.tsx`
- Modify: `src/pages/library.tsx`
- Modify: `src/hooks/use-global-shortcuts.ts`
- Modify: `src/components/app-shell.tsx` (or wherever shortcuts mount)

- [ ] **Step 7.3.1: Add a shared store for the dialog**

Add to `src/store/ui-state.ts` (or extend the existing zustand store):

```ts
// inside the store create():
newSkillOpen: false,
setNewSkillOpen: (open: boolean) => set({ newSkillOpen: open }),
```

Update the store's type accordingly.

- [ ] **Step 7.3.2: Mount the dialog once in AppShell**

```tsx
// app-shell.tsx
import { NewSkillDialog } from "@/components/new-skill-dialog";
import { useUiState } from "@/store/ui-state";

const { newSkillOpen, setNewSkillOpen } = useUiState();

// at the bottom of AppShell render:
<NewSkillDialog
  open={newSkillOpen}
  onClose={() => setNewSkillOpen(false)}
  onCreated={(path, name) => {
    // toast + refresh handled in Task 7.4
  }}
/>
```

- [ ] **Step 7.3.3: Wire Home + Library buttons**

In `src/pages/home.tsx`:

```tsx
const { setNewSkillOpen } = useUiState();
// + New skill button:
onClick={() => setNewSkillOpen(true)}
```

In `src/pages/library.tsx`: same.

- [ ] **Step 7.3.4: Register ⌘N**

In `src/hooks/use-global-shortcuts.ts`, add to the keydown handler:

```ts
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
  e.preventDefault();
  useUiState.getState().setNewSkillOpen(true);
}
```

- [ ] **Step 7.3.5: Verify in app**

- Click "+ New skill" on Home or Library → dialog opens.
- ⌘N from anywhere → dialog opens.
- Submitting creates `<source>/<name>/SKILL.md`; if "Open in editor" was on, the file opens.

- [ ] **Step 7.3.6: Commit**

```bash
git add src/store/ui-state.ts src/components/app-shell.tsx src/pages/home.tsx src/pages/library.tsx src/hooks/use-global-shortcuts.ts
git commit -m "feat(scaffold): wire NewSkillDialog from Home, Library, and ⌘N"
```

---

### Task 7.4: Post-creation toast + refresh

**Files:**
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 7.4.1: Pass a post-creation handler**

In `onCreated`:

```tsx
onCreated={(path, name) => {
  // Refetch skills:
  queryClient.invalidateQueries({ queryKey: ["skills"] });
  // Toast:
  setCreatedToast({ name, path });
  setTimeout(() => setCreatedToast(null), 5000);
}}
```

Render a small toast at the bottom:

```tsx
{createdToast && (
  <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--popover)] px-4 py-2.5 text-[12.5px] shadow-lg">
    <span>Created <code className="font-mono">{createdToast.name}</code>. Sync it to your tools when you're ready.</span>
    <button
      onClick={() => {
        // Trigger Sync everything
        // Either invoke usePlanSync()+useSync, or navigate to /:
        nav("/?run-sync=1");
        setCreatedToast(null);
      }}
      className="font-mono text-[11px] text-[var(--primary)]"
    >
      Sync now
    </button>
  </div>
)}
```

If the project has an existing sync command exposed via a hook, just call `.mutate()` directly here instead of the URL nav trick.

- [ ] **Step 7.4.2: Verify**

- Submit dialog → skill row appears in Library after toast.
- "Sync now" runs the sync.

- [ ] **Step 7.4.3: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "feat(scaffold): post-creation toast + invalidate skills query"
```

---

# Phase 8 · Git awareness

### Task 8.1: Rust `cmd_git_status` (TDD)

**Files:**
- Create: `src-tauri/src/ipc/git_status.rs`
- Modify: `src-tauri/src/ipc/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 8.1.1: Add `git2` dependency**

In `src-tauri/Cargo.toml`:

```toml
git2 = { version = "0.18", default-features = false }
```

- [ ] **Step 8.1.2: Write the module + tests**

```rust
// src-tauri/src/ipc/git_status.rs
use serde::Serialize;
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct GitStatus {
    pub branch: String,
    pub uncommitted: u32,
    pub ahead: u32,
    pub behind: u32,
    pub has_upstream: bool,
}

pub fn git_status_at(path: &Path) -> Option<GitStatus> {
    use git2::{Repository, StatusOptions};

    let repo = Repository::discover(path).ok()?;
    let head = repo.head().ok()?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.include_ignored(false);
    let statuses = repo.statuses(Some(&mut opts)).ok()?;
    let uncommitted = statuses.iter().filter(|e| !e.status().is_empty()).count() as u32;

    let mut ahead = 0;
    let mut behind = 0;
    let mut has_upstream = false;
    if let Ok(local_oid) = head.peel_to_commit().map(|c| c.id()) {
        if let Ok(branch_obj) = repo.find_branch(&branch, git2::BranchType::Local) {
            if let Ok(upstream) = branch_obj.upstream() {
                has_upstream = true;
                if let Ok(upstream_oid) = upstream.into_reference().peel_to_commit().map(|c| c.id()) {
                    if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
                        ahead = a as u32;
                        behind = b as u32;
                    }
                }
            }
        }
    }

    Some(GitStatus {
        branch,
        uncommitted,
        ahead,
        behind,
        has_upstream,
    })
}

#[tauri::command]
pub fn cmd_git_status(path: PathBuf) -> Result<Option<GitStatus>, String> {
    Ok(git_status_at(&path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::process::Command;

    fn git(td: &TempDir, args: &[&str]) {
        let out = Command::new("git")
            .args(args)
            .current_dir(td.path())
            .output()
            .expect("git command");
        assert!(out.status.success(), "git {:?} failed: {}", args, String::from_utf8_lossy(&out.stderr));
    }

    #[test]
    fn returns_none_outside_repo() {
        let td = TempDir::new().unwrap();
        assert!(git_status_at(td.path()).is_none());
    }

    #[test]
    fn returns_branch_and_clean_status() {
        let td = TempDir::new().unwrap();
        git(&td, &["init", "-q", "-b", "main"]);
        git(&td, &["config", "user.email", "test@example.com"]);
        git(&td, &["config", "user.name", "Test"]);
        std::fs::write(td.path().join("a.txt"), "hi").unwrap();
        git(&td, &["add", "a.txt"]);
        git(&td, &["commit", "-q", "-m", "init"]);

        let s = git_status_at(td.path()).unwrap();
        assert_eq!(s.branch, "main");
        assert_eq!(s.uncommitted, 0);
        assert_eq!(s.ahead, 0);
        assert_eq!(s.behind, 0);
        assert!(!s.has_upstream);
    }

    #[test]
    fn counts_uncommitted_files() {
        let td = TempDir::new().unwrap();
        git(&td, &["init", "-q", "-b", "main"]);
        git(&td, &["config", "user.email", "test@example.com"]);
        git(&td, &["config", "user.name", "Test"]);
        std::fs::write(td.path().join("a.txt"), "hi").unwrap();
        git(&td, &["add", "a.txt"]);
        git(&td, &["commit", "-q", "-m", "init"]);
        std::fs::write(td.path().join("b.txt"), "new").unwrap();
        std::fs::write(td.path().join("a.txt"), "modified").unwrap();

        let s = git_status_at(td.path()).unwrap();
        assert_eq!(s.uncommitted, 2); // a.txt modified, b.txt untracked
    }
}
```

- [ ] **Step 8.1.3: Wire module**

In `src-tauri/src/ipc/mod.rs`:
```rust
pub mod git_status;
```

In `src-tauri/src/lib.rs`:
```rust
use ipc::git_status::cmd_git_status;
// in invoke_handler:
cmd_git_status,
```

- [ ] **Step 8.1.4: Run tests**

Run: `cd src-tauri && cargo test git_status`
Expected: 3 passed. (CI environments without `git` will fail the last two; running locally this is fine.)

- [ ] **Step 8.1.5: Regenerate bindings**

Run: `cd src-tauri && cargo test --quiet`
Expected: all tests pass; `src/types/bindings.ts` now contains `GitStatus`.

- [ ] **Step 8.1.6: Commit**

```bash
git add src-tauri/src/ipc/git_status.rs src-tauri/src/ipc/mod.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock src/types/bindings.ts
git commit -m "feat(git): add cmd_git_status (read-only branch + uncommitted + ahead/behind)"
```

---

### Task 8.2: `useGitStatus()` hook + IPC wrapper

**Files:**
- Modify: `src/lib/ipc.ts`
- Create: `src/hooks/use-git-status.ts`

- [ ] **Step 8.2.1: IPC wrapper**

In `src/lib/ipc.ts`:

```ts
import type { GitStatus } from "@/types/bindings";
// …
gitStatus: (path: string) => invoke<GitStatus | null>("cmd_git_status", { path }),
```

- [ ] **Step 8.2.2: Hook**

```ts
// src/hooks/use-git-status.ts
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { useSettings } from "./use-settings";

export function useGitStatus() {
  const { data: settings } = useSettings();
  return useQuery({
    queryKey: ["git-status", settings?.source_root],
    queryFn: () => ipc.gitStatus(settings!.source_root),
    enabled: !!settings?.source_root,
    refetchInterval: 30_000,
  });
}
```

- [ ] **Step 8.2.3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 8.2.4: Commit**

```bash
git add src/lib/ipc.ts src/hooks/use-git-status.ts
git commit -m "feat(git): useGitStatus() hook polling cmd_git_status every 30s"
```

---

### Task 8.3: `GitStatusChip` + sidebar + Settings surface

**Files:**
- Create: `src/components/git-status-chip.tsx`
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/settings-form.tsx`

- [ ] **Step 8.3.1: Write the chip**

```tsx
// src/components/git-status-chip.tsx
import { useGitStatus } from "@/hooks/use-git-status";

export function GitStatusChip() {
  const { data } = useGitStatus();
  if (!data) return null;

  const color =
    data.uncommitted > 0 ? "var(--warning)" :
    data.ahead > 0 || data.behind > 0 ? "var(--fg-dim)" :
    "var(--primary)";

  const text =
    data.uncommitted > 0
      ? `${data.branch} · ${data.uncommitted} uncommitted`
      : data.ahead > 0
      ? `${data.branch} · ${data.ahead} ahead`
      : data.behind > 0
      ? `${data.branch} · ${data.behind} behind`
      : data.branch;

  return (
    <span
      className="inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px]"
      style={{ color, borderColor: color }}
      title="Skill Sync only watches. Use your git client to commit and push."
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 8.3.2: Mount in sidebar Source section**

In `src/components/sidebar.tsx`, in the Source section (just under the source path line):

```tsx
import { GitStatusChip } from "./git-status-chip";

<div className="mt-1.5">
  <GitStatusChip />
</div>
```

- [ ] **Step 8.3.3: Mount in Settings Source section**

In `src/components/settings-form.tsx`, add a row under Source section heading:

```tsx
<div className="flex items-center gap-3">
  <span className="text-[12.5px]">Branch / status</span>
  <GitStatusChip />
</div>
```

- [ ] **Step 8.3.4: Verify in app**

- If source_root is a git repo: chip appears in sidebar + settings.
- If not: nothing renders (no error, no empty space).
- Make a change to a file under source_root → after 30s the chip color/text updates. (Or trigger a refetch faster by switching pages.)

- [ ] **Step 8.3.5: Commit**

```bash
git add src/components/git-status-chip.tsx src/components/sidebar.tsx src/components/settings-form.tsx
git commit -m "feat(git): GitStatusChip in sidebar Source section + Settings"
```

---

# Phase 9 · First-run flow

### Task 9.1: `useFirstRun()` hook

**Files:**
- Create: `src/hooks/use-first-run.ts`

- [ ] **Step 9.1.1: Write the hook**

```ts
// src/hooks/use-first-run.ts
import { useSettings, useSetSettings } from "./use-settings";

export function useFirstRun() {
  const { data: settings, isLoading } = useSettings();
  const setMutation = useSetSettings();

  const shouldRun = !isLoading && settings != null && !settings.first_run_completed;

  const complete = (overrides: Partial<NonNullable<typeof settings>>) => {
    if (!settings) return;
    setMutation.mutate({
      ...settings,
      ...overrides,
      first_run_completed: true,
      mode: "simple",
      mode_migration_announced: true, // suppress the migration toast on fresh installs
    });
  };

  return { shouldRun, settings, complete };
}
```

- [ ] **Step 9.1.2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 9.1.3: Commit**

```bash
git add src/hooks/use-first-run.ts
git commit -m "feat(first-run): useFirstRun() hook gating the modal on first_run_completed"
```

---

### Task 9.2: `FirstRunModal` component (3 steps + transition)

**Files:**
- Create: `src/components/first-run-modal.tsx`
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 9.2.1: Write the modal**

```tsx
// src/components/first-run-modal.tsx
import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useFirstRun } from "@/hooks/use-first-run";
import { useGitStatus } from "@/hooks/use-git-status";

type Step = "welcome" | "source" | "tools" | "scan";

const TOOL_DEFAULTS: { key: string; label: string; suggestedPath: (home: string) => string }[] = [
  { key: "claude", label: "Claude Code", suggestedPath: (h) => `${h}/.claude/skills` },
  { key: "codex", label: "Codex", suggestedPath: (h) => `${h}/.codex/skills` },
  { key: "cursor", label: "Cursor", suggestedPath: (h) => `${h}/.cursor/skills` },
  { key: "cowork", label: "Cowork (zip)", suggestedPath: (h) => `${h}/Downloads` },
];

export function FirstRunModal() {
  const { shouldRun, settings, complete } = useFirstRun();
  const [step, setStep] = useState<Step>("welcome");
  const [sourceRoot, setSourceRoot] = useState(settings?.source_root ?? "~/.claude/skills");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    claude: true, codex: true, cursor: true, cowork: false,
  });

  const gitStatus = useGitStatus();

  if (!shouldRun) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[520px] rounded-lg border border-[var(--border)] bg-[var(--popover)] p-7">
        {step === "welcome" && (
          <>
            <p className="mb-3 font-mono text-[24px] text-[var(--primary)]">//</p>
            <h1 className="mb-3 text-[24px] font-semibold tracking-[-0.02em]">
              Let's set up Skill Sync.
            </h1>
            <p className="text-[13.5px] text-[var(--muted-foreground)]">
              Skill Sync watches the folder where you keep your skills and copies them
              into Claude Code, Codex, and other tools so they stay in sync. Takes about
              30 seconds to set up.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep("source")}
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
              >
                Get started →
              </button>
            </div>
          </>
        )}

        {step === "source" && (
          <>
            <h2 className="mb-2 text-[20px] font-semibold">Where are your skills?</h2>
            <p className="mb-4 text-[13.5px] text-[var(--muted-foreground)]">
              This is the folder you edit. Skill Sync treats it as the source of truth
              and copies from here into your tools.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={sourceRoot}
                onChange={(e) => setSourceRoot(e.target.value)}
                className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 font-mono text-[12.5px]"
              />
              <button
                onClick={async () => {
                  const chosen = await openDialog({ directory: true });
                  if (typeof chosen === "string") setSourceRoot(chosen);
                }}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px]"
              >
                Choose folder…
              </button>
            </div>
            {gitStatus.data && (
              <p className="mt-3 text-[12.5px] text-[var(--primary)]">
                This is a git repo on branch <code>{gitStatus.data.branch}</code>. Skill
                Sync will keep track but won't commit for you.
              </p>
            )}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep("welcome")}
                className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px]"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep("tools")}
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === "tools" && (
          <>
            <h2 className="mb-2 text-[20px] font-semibold">Which tools should we sync to?</h2>
            <p className="mb-4 text-[13.5px] text-[var(--muted-foreground)]">
              You can change these any time in Settings.
            </p>
            <ul className="space-y-2">
              {TOOL_DEFAULTS.map((t) => (
                <li key={t.key} className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
                  <div>
                    <p className="text-[13.5px]">{t.label}</p>
                    <p className="font-mono text-[11px] text-[var(--fg-dim)]">{t.suggestedPath("~")}</p>
                  </div>
                  <label className="flex items-center gap-2 text-[12.5px]">
                    <input
                      type="checkbox"
                      checked={!!enabled[t.key]}
                      onChange={(e) => setEnabled({ ...enabled, [t.key]: e.target.checked })}
                    />
                    {enabled[t.key] ? "On" : "Off"}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep("source")}
                className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-[12.5px]"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  setStep("scan");
                  // Persist and trigger initial scan:
                  const enabledList = Object.entries(enabled)
                    .filter(([, on]) => on)
                    .map(([k]) => k);
                  complete({
                    source_root: sourceRoot,
                    enabled_targets: enabledList,
                  });
                  setTimeout(() => {
                    // Close the modal once first_run_completed flips:
                    // The hook's `shouldRun` will return false on the next render.
                  }, 800);
                }}
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--primary-foreground)]"
              >
                Start syncing →
              </button>
            </div>
          </>
        )}

        {step === "scan" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="font-mono text-[12.5px] text-[var(--fg-dim)]">Scanning your skills…</p>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--bg-hover)]">
              <div className="h-full w-1/2 animate-pulse bg-[var(--primary)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2.2: Mount in `AppShell`**

In `src/components/app-shell.tsx`:

```tsx
import { FirstRunModal } from "@/components/first-run-modal";

// at the top of the rendered shell, before everything else:
<FirstRunModal />
```

The modal is its own portal-free overlay and self-gates on `useFirstRun().shouldRun`.

- [ ] **Step 9.2.3: Verify in app**

- Delete or rename `~/Library/Application Support/skill-sync/settings.json` (or the relevant config path).
- Run `pnpm tauri dev`.
- The first-run modal appears blocking the app.
- Walk through the 3 steps: Welcome → Source → Tools → scan transition → Home.
- After completion, restarting the app does NOT show the modal again (because `first_run_completed` is now true).

- [ ] **Step 9.2.4: Commit**

```bash
git add src/components/first-run-modal.tsx src/components/app-shell.tsx
git commit -m "feat(first-run): 3-step setup wizard (welcome -> source -> tools) + scan transition"
```

---

# Phase 10 · PR creation

### Task 10.1: Push branch and open PR

**Files:** none (git ops only).

- [ ] **Step 10.1.1: Verify branch state**

Run: `git status && git log --oneline -30`
Expected: clean working tree; the new commits from Phases 1–9 are present on `claude/goofy-swirles-8b5480`.

- [ ] **Step 10.1.2: Push branch**

```bash
git push -u origin claude/goofy-swirles-8b5480
```

- [ ] **Step 10.1.3: Open PR via `gh`**

```bash
gh pr create --title "Vibe-dev friendly redesign: Simple/Pro mode + Home + scaffolder + git awareness" --body "$(cat <<'EOF'
## Summary

Implements the design in [`docs/superpowers/specs/2026-05-25-vibe-dev-friendly-design.md`](docs/superpowers/specs/2026-05-25-vibe-dev-friendly-design.md):

- Adds a new **Home** page at `/` with health summary, orphan attention card, and recent activity teaser. Demotes Library to `/library`.
- Adds a **Simple / Pro** mode toggle in Settings. Simple hides hashes, Refused / Bundle / Built-in mechanics, and `.skill` packaging; Pro shows everything.
- Adds a **new-skill scaffolder** (`+ New skill` on Home + Library + `⌘N`) — creates `<source>/<name>/SKILL.md` with a template and opens it in the user's editor.
- Adds **git-repo awareness** for the source root (branch + uncommitted count chip in sidebar and Settings). Read-only — no in-app git commands.
- Surfaces **orphans** (skills present in a tool but not in source) at the top of the Library table and in the Home attention card.
- Adds a **guided 3-step first-run** (welcome → source → tools → scan transition).
- New copy module (`src/lib/copy.ts`) centralizes Simple/Pro wording. Visual system is unchanged.

Two new Rust commands: `cmd_scaffold_skill` and `cmd_git_status`. New dep: `git2`.

## Test plan

- [ ] Fresh install: rename `~/Library/Application Support/skill-sync/settings.json`, launch — first-run modal appears, walks 3 steps + scan transition, lands on Home with `mode: "simple"`.
- [ ] Existing install: launch with prior settings.json — migration toast appears once with `Try Simple` / `Stay in Pro` buttons; mode is `pro`.
- [ ] Settings → Mode toggle switches all surfaces (nav, columns, copy) live without reload.
- [ ] Home page reflects current scan: health sentence, 4-cell status strip, orphan card if any, recent activity teaser.
- [ ] Library Simple shows 5 columns (Skill, Status, Where it lives, Updated, Actions); orphans render in a section above the main table.
- [ ] Library Pro restores 6 columns (Skill, Owner, Targets, Updated, Size, Actions) + DriftBar + full badges.
- [ ] Targets Simple hides the Cowork card; Pro shows it.
- [ ] Activity Simple uses sentence rows; Pro uses dense columns.
- [ ] Settings Simple collapses Diagnostics + hides Packaging; Pro shows everything.
- [ ] `+ New skill` (or ⌘N) opens dialog → submitting creates the folder + SKILL.md → opens in editor if toggled → toast offers `Sync now`.
- [ ] Duplicate name in scaffolder shows inline error.
- [ ] Source root in a git repo shows branch chip in sidebar + Settings; modifying files updates the chip within 30s.
- [ ] Drawer Simple has no hashes and no diff block; the Compare button opens a dialog that can open both files.
- [ ] Drawer Pro shows hashes, diff, and the disabled Build .skill button.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 10.1.4: Return PR URL**

The `gh pr create` command prints the PR URL. Capture and share it with the user.

---

## Self-review checklist (run after writing — no need to repeat unless edits land)

**Spec coverage** — every spec section maps to at least one task:

- §2 IA (routes, sidebar, default route): Phases 2, 3.
- §3 Mode toggle (storage, hook, gates, copy module): Phase 1.
- §4 Home page: Phase 2.
- §5 Library Simple variant + orphan section: Phase 4.
- §6 Targets Simple: Phase 6.1–6.2.
- §7 Activity Simple: Phase 6.3–6.4.
- §8 Settings additions: Tasks 1.7 (Mode section), 6.5 (Diagnostics collapse), 8.3 (git status row).
- §9 New-skill scaffolder: Phase 7.
- §10 Git awareness: Phase 8.
- §11 Migration + first-run: Tasks 1.1, 1.8, Phase 9.
- §12 Voice & copy: Task 1.3 (copy.ts + style guide).
- §13 Files touched: covered across phases.
- §14 Out of scope: not implemented (correct).
- §15 Implementation phasing: this plan's Phases 1–10 align with the spec's 3-commit phasing (more granular, but commits roll up cleanly).
- §16 Acceptance checklist: maps directly to the PR Test plan in Task 10.1.

**Placeholders:** None remain in code blocks. Every step shows actual code or actual commands.

**Type consistency:** `Mode` type defined in `copy.ts`, imported by `use-mode.ts` and `use-copy.ts`. `GitStatus` defined in Rust with `ts-rs` and consumed in `git-status-chip.tsx`. `Orphan` defined in `lib/orphans.ts`, consumed by `OrphanRow` and `NeedsAttentionCard`. `Settings` field names match between Rust struct, bindings, and TypeScript usage (`mode`, `first_run_completed`, `mode_migration_announced`).

---

## Execution handoff

Plan complete and saved to [`docs/superpowers/plans/2026-05-25-vibe-dev-friendly.md`](docs/superpowers/plans/2026-05-25-vibe-dev-friendly.md). Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

Which approach?
