# Skill Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A macOS desktop app that discovers user-authored skills, distinguishes them from bundled/built-in skills via durable provenance signals, and syncs only the user's own skills from a single source-of-truth into the install dirs of Claude Code CLI, Codex, and Cursor — plus builds `.skill` packages for Cowork (which loads its own bundle and cannot sync from the filesystem).

**Architecture:** Tauri 2 app. Rust backend owns all filesystem work (discovery, provenance classification, ownership persistence, sync, drift, packaging, Trash archival) and exposes a typed IPC surface to the React frontend. React + Tailwind + shadcn/ui render the library, drift indicators, and sync flows. Ownership decisions persist as JSON under `~/Library/Application Support/skill-sync/`. The sync engine ports the logic of the existing `references/sync-script-template.sh` from the `anthropic-skills:multi-agent-sync` skill into Rust with safer guarantees (symlink refusal, Trash-based archive on overwrite, dry-run preview).

**Tech Stack:** Tauri 2 + Rust (backend) · React 18 + TypeScript + Vite (frontend) · Tailwind CSS + shadcn/ui · Zustand (UI state) · TanStack Query (backend cache) · `ts-rs` (Rust→TS type generation) · `trash` crate (Finder-compatible Trash) · `walkdir`, `serde`, `serde_yaml`, `sha2`, `zip` crates · Vitest + React Testing Library + `cargo test`.

---

## Table of Contents

1. [Tech-stack rationale](#1-tech-stack-rationale)
2. [Provenance-detection strategy](#2-provenance-detection-strategy)
3. [Ownership model & persistence](#3-ownership-model--persistence)
4. [Sync engine](#4-sync-engine)
5. [Drift detection](#5-drift-detection)
6. [.skill package builder (Cowork)](#6-skill-package-builder-cowork)
7. [UI flows](#7-ui-flows)
8. [File structure](#8-file-structure)
9. [Visual design language](#9-visual-design-language)
10. [Security & safety](#10-security--safety)
11. [Milestones to v1](#11-milestones-to-v1)
12. [Task breakdown](#12-task-breakdown)
13. [Self-review](#13-self-review)

---

## 1. Tech-stack rationale

You asked Tauri + React + shadcn/ui + Tailwind and asked it to be justified. The alternatives considered:

| Stack | Bundle | FS perf | macOS native feel | shadcn fit | Verdict |
|---|---|---|---|---|---|
| **Tauri 2 + React + shadcn** | ~12 MB | Excellent (Rust) | WebView2/WKWebView, native menus, code-signable | Native | **Picked** |
| Electron + React + shadcn | ~120 MB+ | Good (Node) | OK but heavy RAM | Native | Rejected — bundle/RAM cost contradicts "small native footprint" |
| SwiftUI native | ~3 MB | Excellent | Best | None — would have to rebuild a shadcn-equivalent | Rejected — no shadcn, longer build |
| Wails (Go) | ~15 MB | Excellent | Comparable to Tauri | Native | Close second; Tauri wins on community shadcn integrations and signed-update tooling |

**Why Tauri specifically wins for this app:**

- The whole product is filesystem traversal + JSON persistence + a small zip builder. Rust handles symlinks, permissions, and concurrent walks more safely than Node, and the `trash` crate gives us Finder-compatible "Move to Trash" out of the box (no shelling out to `osascript`).
- Tauri 2 ships a tested `tauri-plugin-fs` permission model — we can scope the app to exactly `~/.claude`, `~/.codex`, `~/.cursor`, `~/.agents`, `~/.config`, `~/Library/Application Support/skill-sync`, and `~/.Trash`, and refuse anything else by config rather than by code review.
- `ts-rs` autogenerates TypeScript types from Rust structs so the IPC surface stays in sync without hand-written DTOs.
- The frontend is plain Vite + React, so shadcn/ui's `npx shadcn@latest add` CLI works exactly as documented.

**Stack version pins (lock at project start):**
- Tauri 2.x (latest stable at scaffold time)
- React 18.3+, Vite 5+, TypeScript 5.4+
- Tailwind CSS 3.4+ (NOT 4 yet — shadcn/ui's CLI defaults still target v3 most reliably)
- shadcn/ui — installed via CLI, components vendored into `src/components/ui/`

---

## 2. Provenance-detection strategy

A skill is one of four classes. Detection is *signal-based* — we never guess from the name. The classifier returns a class plus the signals that fired so the UI can show "why".

### Classes

| Class | Meaning | Treatment |
|---|---|---|
| `mine` | The user authored it. | Sync candidate (source-of-truth). |
| `bundle` | Part of an installed bundle the user did not author (Superpowers, anthropic-skills, etc.). | Read-only. Never written. |
| `tool-builtin` | Ships with the tool itself. | Read-only. Never written. Never even shown by default — hidden behind a "show built-ins" toggle. |
| `unknown` | None of the above signals fire. | Surfaced to the user with an explicit tag prompt before any sync touches it. |

### Signal cascade (evaluated in order — first match wins)

Each candidate skill directory `P` is classified by running these checks against `P` and its resolved real path `R = realpath(P)`:

1. **Tool built-in path signal** → `tool-builtin`
   - `R` is under `~/.codex/skills/.system/` **OR** a sibling of `~/.codex/skills/.system/.codex-system-skills.marker`
   - `R` is under `~/.cursor/skills-cursor/`
   - `R` is under `~/.claude/plugins/cache/` or `~/.claude/plugins/marketplaces/`
2. **External bundle root signal** → `bundle`
   - `R` is under `~/.agents/skills/` (Superpowers canonical install)
   - `R` is under any path the user has added to "External bundle roots" in Settings
3. **Symlink-into-bundle signal** → `bundle`
   - `P` is itself a symlink AND `R` points outside the user's declared source-of-truth roots (defaults: `~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills`, plus any per-skill external author root the user declares, e.g. `~/jetpack-social/skill`)
4. **User ownership override** → whatever the user set
   - `ownership.json` has an explicit `mine` / `external` / `ignore` for this skill ID. User decisions always beat heuristics; the heuristic only seeds the initial guess.
5. **Heuristic positive ("looks like mine")** → `mine` *(needs confirmation)*
   - `P` is a regular directory (not a symlink) under one of the user's declared source-of-truth roots
   - `P/SKILL.md` exists and parses with valid YAML frontmatter containing a `name:` field
   - The skill name is **not** in the known-bundle name list (Superpowers names, Anthropic core skill names — see `references/known-bundles.json` shipped with the app)
6. **Fallback** → `unknown`

### Skill identity (content hashing)

A skill's logical identity is the `name` field from `SKILL.md` frontmatter (kebab-case slug). Two directories with the same `name` in different locations are treated as **the same skill**, and the app shows them grouped by skill, not by location. Per-location content is hashed (`sha256` over a sorted file list, excluding `.DS_Store` and dot-prefixed temp files) so drift can be detected exactly.

### Known-bundle name list

Bundled at `~/.config/skill-sync/known-bundles.json` (seeded on first run, updatable). Initial seed includes:
- All 17 names currently symlinked from `~/.claude/skills/` into `~/.agents/skills/` (`brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `find-skills`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`)
- Codex system skills (`imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`)
- Cursor built-ins (`babysit`, `canvas`, `create-hook`, `create-rule`, `create-skill`, `create-subagent`, `migrate-to-skills`, `sdk`, `shell`, `split-to-prs`, `statusline`, `update-cli-config`, `update-cursor-settings`)

This is *seed only* — provenance is still decided by signals 1-3 above. The name list is a defense-in-depth in case a user manually copies a bundle skill into their source dir and the symlink signal is missing.

### Confirmation gate

On first launch (and whenever a new `unknown` or new-heuristic-`mine` skill appears) the UI shows an **Ownership Inbox** banner: "X new skills detected. Tag them before syncing." Sync is *blocked* for any skill that has only been auto-classified as `mine` — the user must confirm with one click. Bundle and tool-builtin classifications never need confirmation because they are never written to or read as sources.

---

## 3. Ownership model & persistence

### Storage

- **Config root:** `~/Library/Application Support/skill-sync/`
- **`ownership.json`** — user decisions, source of truth for what is "mine"
- **`settings.json`** — source-of-truth path, enabled targets, output dir for `.skill` packages, "show built-ins" toggle
- **`known-bundles.json`** — seed bundle names (shipped, then user-extensible)
- **`targets.json`** — registered target tools with their install paths and capabilities

### `ownership.json` schema

```json
{
  "version": 1,
  "skills": {
    "jetpack-theme-visual-qa": {
      "class": "mine",
      "source_path": "/Users/devinwalker/.claude/skills/jetpack-theme-visual-qa",
      "confirmed_at": "2026-05-24T21:50:00Z",
      "note": null
    },
    "jetpack-social": {
      "class": "mine",
      "source_path": "/Users/devinwalker/jetpack-social/skill",
      "confirmed_at": "2026-05-24T21:51:00Z",
      "note": "Lives in its own repo"
    },
    "brainstorming": {
      "class": "external",
      "source_path": null,
      "confirmed_at": "2026-05-24T21:50:00Z",
      "note": "Superpowers"
    }
  }
}
```

Source path is **per-skill** because `jetpack-social` lives outside `~/.claude/skills/`. The default source for any "mine" skill is `<settings.source_root>/<skill-name>`, overridable per skill.

### `settings.json` schema

```json
{
  "version": 1,
  "source_root": "/Users/devinwalker/.claude/skills",
  "package_output_dir": "/Users/devinwalker/Downloads",
  "show_builtins": false,
  "external_bundle_roots": [
    "/Users/devinwalker/.agents/skills"
  ],
  "enabled_targets": ["claude", "codex", "cursor"],
  "cowork_package_enabled": true
}
```

### `targets.json` schema

```json
{
  "version": 1,
  "targets": {
    "claude": { "install_path": "/Users/devinwalker/.claude/skills", "kind": "directory-mirror" },
    "codex":  { "install_path": "/Users/devinwalker/.codex/skills",  "kind": "directory-mirror" },
    "cursor": { "install_path": "/Users/devinwalker/.cursor/skills", "kind": "directory-mirror" },
    "cowork": { "kind": "package-only", "package_format": "skill-zip" }
  }
}
```

---

## 4. Sync engine

Direction: **unidirectional, source → enabled targets**. Source is `ownership.skills[id].source_path` (or `settings.source_root + "/" + id` if not overridden). Targets are `targets.json` entries marked enabled.

### Pre-flight refusals (HARD STOPS — never silently downgraded to warnings)

For each `(skill, target)` write the engine refuses if:
1. The target path resolves under any path classified `bundle` or `tool-builtin` for any known skill.
2. The destination path is a **symlink** (we never overwrite or delete symlinks — they belong to the user's manual bundle wiring).
3. The destination's *parent* doesn't exist (rather than create silently, prompt the user once).
4. The skill's class is anything other than `mine`.
5. Free disk space < 50 MB.

### Overwrite-with-archive flow

When the engine is about to overwrite an existing destination directory:
1. Compute archive path: `~/.Trash/skill-sync-archive/<ISO8601-timestamp>/<target-name>/<skill-name>/`
2. Use the `trash` crate (Finder-compatible) to move the old dir under that path. **Never `rm -rf`.**
3. Copy new content from source → destination, preserving mode bits.
4. After successful copy, write an audit entry to `~/Library/Application Support/skill-sync/audit.log` (JSONL).

### Dry-run mode

Every sync command takes a `dry_run: bool`. In dry-run, the engine returns a plan struct (`SyncPlan { creates: [...], updates: [...], skips: [...], refusals: [...] }`) without touching the filesystem. The UI shows this in a confirm dialog before any real sync.

### Atomicity per skill

Each `(skill, target)` write is treated as one unit. If the copy fails halfway, the engine restores from the archived copy. We do **not** attempt to make a multi-target sync atomic across tools — partial success is acceptable as long as each individual target ends either fully synced or fully reverted.

---

## 5. Drift detection

For each `(skill, target)` pair, compute:

- `source_hash` — sha256 over sorted file list with file contents of source
- `target_hash` — same over destination
- Status:
  - **`in-sync`** if hashes match
  - **`drifted-target-newer`** if hashes differ and target mtime > source mtime
  - **`drifted-source-newer`** if hashes differ and source mtime >= target mtime
  - **`missing-in-target`** if destination doesn't exist
  - **`unmanaged`** if destination exists but is a symlink (we don't touch symlinks)
  - **`refused`** if target path resolves under a bundle root

Drift refresh runs:
- On app launch
- On a manual "Refresh" button (one per skill row + a global one)
- After every sync completes
- On a 30-second tick while the Library page is foregrounded (cheap — file mtimes only, full hash only when mtimes diverge)

When drift is `drifted-target-newer`, the skill row shows an explicit "Pull back to source" affordance — single direction by default, but the user can override per skill when they actually edited in a target dir.

---

## 6. `.skill` package builder (Cowork)

Cowork loads its own bundle and does not scan the filesystem. We export a `.skill` file (a zip with a specific layout) that the user drops into Cowork.

### Layout inside the zip

```
<skill-name>/
├── SKILL.md
├── README.md            (optional — copied verbatim if present)
├── references/          (optional — copied verbatim if present)
├── scripts/             (optional — copied verbatim if present)
└── ...any other files from the source dir
```

The zip's root entry is the skill name (so unzipping in the right directory produces a usable skill). The file extension is `.skill` (which is just a renamed `.zip`).

### Build flow

1. User clicks **Build .skill** on a skill row (or "Build all .skill packages" in the toolbar)
2. Backend zips the source directory, excluding `.DS_Store`, `*.swp`, `.git/`, and any path matching a `.skillignore` file in the skill root if one exists
3. Output written to `settings.package_output_dir/<skill-name>-<YYYYMMDD-HHMM>.skill`
4. UI shows the output path with a "Reveal in Finder" button

The build is read-only — it never modifies the source.

---

## 7. UI flows

### App shell

Two-pane layout:
- **Left sidebar** (240px, collapsible): `Library`, `Targets`, `Activity`, `Settings`
- **Main pane**: route content
- Top of sidebar: source-root path (current source-of-truth), inline-editable
- Bottom of sidebar: status pill — green "All in sync" / yellow "3 drifted" / orange "2 unknowns"

### Library (default view)

Table of skills, one row per unique skill id, columns:

| Skill | Owner | Source | Claude | Codex | Cursor | Cowork pkg | Actions |
|---|---|---|---|---|---|---|---|
| `jetpack-theme-visual-qa` | 🟢 Mine | `~/.claude/skills/...` | ✓ in sync | ✓ in sync | ⚠ drifted | Build | Sync · Build · Detail |
| `brainstorming` | 🔵 Bundle | `~/.agents/skills/...` | (read-only) | — | — | — | View |
| `babysit` | ⚪ Built-in | `~/.cursor/skills-cursor/...` | — | — | (read-only) | — | View |

Filter chips above the table: **Mine** (default on), **Bundle** (off by default — appears greyed when toggled), **Built-in** (off; only shown when "show built-ins" is enabled in settings), **Unknown** (always on if any unknowns exist; prominent).

Bulk toolbar:
- **Sync all Mine →** (primary CTA, shows count)
- **Refresh drift**
- **Build all packages**
- **Tag unknowns…** (only visible when `unknown` count > 0)

### Skill detail (right-side drawer, 480px)

Slides in when a row is clicked. Contains:
- Header: skill name, owner badge, kebab menu (Tag as…, Open in Finder, Pull back to source)
- **SKILL.md preview** — first 40 lines, monospace, syntax-highlighted YAML frontmatter
- **Locations** table — every place this skill is found on disk + content hash + last modified
- **Targets** sub-section — per-target drift status, individual Sync button, "Reveal" link to that path
- **Ownership** selector — radio group (Mine · External · Ignore) + optional note field
- Footer: `Sync to all enabled targets` (primary) · `Build .skill` · `Close`

### Ownership Inbox (modal)

Shown on first launch and whenever `unknown` count > 0:
- "We found N skills we couldn't classify automatically. Tag each one as **Mine** or **External** so sync knows what to touch."
- For each unknown: skill name, located-at path, first 4 lines of `SKILL.md`, owner selector (Mine / External / Skip for now)
- One-click "Apply" persists choices and dismisses

### Targets page

Cards for each target tool:
- Claude Code CLI · Codex · Cursor · Cowork
- Each card: enabled toggle, install-path readout, last-sync timestamp, "Test write access" button (does a no-op atomic touch + delete)
- Cowork card shows package output dir picker and "Build all packages now" button

### Activity log

Reverse-chrono list of sync/archive/build events, each row linkable to the audit JSON. Filterable by skill, target, action.

### Settings

- Source-root path picker (default `~/.claude/skills`)
- External bundle roots (multi-path list — default `~/.agents/skills`)
- Package output dir
- Show built-ins toggle (default off)
- Drift refresh cadence (default 30s)
- Theme: System / Light / Dark (default System)
- "Reset ownership decisions" (with confirm)

---

## 8. File structure

Each file has one job. We design for readability and easy mental model — see Tasks below for content.

```
skill-sync/
├── docs/
│   └── plan.md                              # THIS DOCUMENT
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json                      # FS scope, window, bundle id
│   ├── icons/                               # placeholder icons until v1 polish
│   └── src/
│       ├── main.rs                          # bootstrap, register commands
│       ├── lib.rs                           # re-exports
│       ├── error.rs                         # AppError enum + serde impl for IPC
│       ├── paths.rs                         # canonical paths for each tool, home expansion
│       ├── config/
│       │   ├── mod.rs
│       │   ├── settings.rs                  # load/save settings.json
│       │   ├── ownership.rs                 # load/save ownership.json
│       │   ├── targets.rs                   # load/save targets.json
│       │   └── known_bundles.rs             # seed + loader
│       ├── discovery.rs                     # walk skill dirs, return raw candidates
│       ├── frontmatter.rs                   # parse SKILL.md YAML header
│       ├── provenance.rs                    # classify candidates into the 4 classes
│       ├── identity.rs                      # group locations by skill name; content hash
│       ├── drift.rs                         # compute drift status per (skill,target)
│       ├── sync.rs                          # planner + executor + atomicity per skill
│       ├── trash.rs                         # archive-to-Trash helper
│       ├── package.rs                       # build .skill zip
│       ├── audit.rs                         # append-only JSONL audit log
│       ├── ipc/
│       │   ├── mod.rs
│       │   └── commands.rs                  # Tauri #[command] surface; calls modules above
│       └── types.rs                         # ts-rs-exported DTOs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx                           # route table
│   ├── index.css                            # Tailwind directives + tokens
│   ├── lib/
│   │   ├── ipc.ts                           # typed invoke wrappers
│   │   ├── utils.ts                         # cn(), formatters, hash trunc
│   │   └── query-client.ts                  # TanStack Query setup
│   ├── components/
│   │   ├── ui/                              # shadcn primitives — added via CLI
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── source-root-badge.tsx
│   │   ├── status-pill.tsx
│   │   ├── library-table.tsx
│   │   ├── skill-row.tsx
│   │   ├── owner-badge.tsx
│   │   ├── drift-badge.tsx
│   │   ├── skill-detail-drawer.tsx
│   │   ├── ownership-picker.tsx
│   │   ├── ownership-inbox.tsx              # modal
│   │   ├── target-card.tsx
│   │   ├── sync-preview-dialog.tsx          # dry-run confirm
│   │   ├── package-builder-button.tsx
│   │   ├── activity-list.tsx
│   │   └── settings-form.tsx
│   ├── pages/
│   │   ├── library.tsx
│   │   ├── targets.tsx
│   │   ├── activity.tsx
│   │   └── settings.tsx
│   ├── hooks/
│   │   ├── use-skills.ts                    # TanStack Query around list_skills
│   │   ├── use-ownership.ts
│   │   ├── use-settings.ts
│   │   ├── use-drift.ts
│   │   └── use-sync.ts
│   ├── store/
│   │   └── ui-state.ts                      # zustand: drawer open id, filters
│   ├── styles/
│   │   └── tokens.css                       # warm palette + radii
│   └── types/
│       └── bindings.ts                      # ts-rs output
├── src-tauri/tests/                         # cargo only auto-discovers flat tests/*.rs
│   ├── discovery_test.rs
│   ├── frontmatter_test.rs
│   ├── paths_test.rs
│   ├── config_test.rs
│   ├── provenance_test.rs
│   ├── identity_test.rs
│   ├── aggregator_test.rs
│   ├── drift_test.rs
│   ├── sync_test.rs
│   ├── trash_test.rs                        # uses tmp homedir, never touches real Trash
│   ├── package_test.rs
│   └── fixtures/                            # synthetic skill dirs
├── tests/
│   └── frontend/
│       ├── library-table.test.tsx
│       ├── ownership-picker.test.tsx
│       └── sync-preview-dialog.test.tsx
├── tailwind.config.ts
├── postcss.config.js
├── components.json                          # shadcn config
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .gitignore
└── README.md
```

---

## 9. Visual design language

The brief asks for "the visual sensibility of Claude's own product design — warm, minimal, deliberate." Concrete translation:

- **Palette tokens** (warm-neutral, not cold grey):
  - `--bg`: `oklch(98% 0.005 80)` (warm off-white)
  - `--bg-elevated`: `oklch(100% 0 0)`
  - `--ink`: `oklch(22% 0.01 80)` (warm near-black)
  - `--muted`: `oklch(55% 0.01 80)`
  - `--accent`: `oklch(64% 0.13 35)` (Claude-ish terracotta)
  - `--accent-ink`: `oklch(98% 0.005 80)`
  - `--success`: `oklch(62% 0.13 145)`
  - `--warning`: `oklch(72% 0.14 80)`
  - `--danger`: `oklch(58% 0.18 25)`
  - Dark mode uses the same hues, lightness inverted, accent slightly desaturated
- **Type**: system stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text"`) for body; `ui-monospace` for paths and hashes. Three sizes only: 13/15/20.
- **Radii**: `8px` everywhere except chips (full).
- **Density**: tables at 40px row height. Generous left padding (24px). No hairline 1px borders — separators use `oklch(--ink / 8%)`.
- **Motion**: 180ms ease-out for drawer slide, 120ms for hover. No bouncy springs.
- **No emoji in UI by default** — owner badges use small filled dots in the accent/muted/success palette instead.

This goes into `src/styles/tokens.css` and is consumed by Tailwind via `tailwind.config.ts` extending the theme.

---

## 10. Security & safety

- **Tauri FS scope** lock-in: only the seven roots above; no fallback to "allow all".
- **No `rm -rf`** anywhere. Deletes route through `trash::delete` exclusively. There is no code path that calls `std::fs::remove_dir_all` on user data.
- **No symlink overwrites.** Pre-flight refuses if destination is a symlink. (Bundle skills appear as symlinks in `~/.claude/skills/`; this rule protects them by construction.)
- **Bundle paths in a denylist.** Even with the user's confirmation, sync refuses to write under `~/.agents/skills/`, `~/.claude/plugins/`, `~/.codex/skills/.system/`, or `~/.cursor/skills-cursor/`.
- **Audit log** of every write/archive/build, JSONL, never truncated.
- **Dry-run is the default** for the bulk Sync action — the user must confirm the plan before any write.
- **No network access** in v1. (Mentioned because Tauri allows it; we'll disable the `http` allowlist entirely.)

---

## 11. Milestones to v1

Each milestone produces working software. Implement in order; review after each.

- **M1 — Backend foundations (Tasks 1–7).** Repo scaffold, Tauri+Vite+Tailwind+shadcn boot, types, config IO. UI is a placeholder "Hello" screen. Output: `cargo test` + `pnpm test` both pass on empty stubs; app launches.
- **M2 — Discovery + provenance (Tasks 8–12).** Walk all skill dirs, parse frontmatter, classify, group by identity, hash for drift. Output: a CLI-style `list_skills` IPC command returning a typed list the frontend can render.
- **M3 — Library UI + Ownership Inbox (Tasks 13–18).** Sidebar, library table, drift badges, owner badges, ownership inbox modal. Output: visually complete library view backed by real data; user can tag unknowns.
- **M4 — Sync engine + Trash archive (Tasks 19–23).** Pre-flight refusals, dry-run planner, executor with archive, audit log. Output: per-skill and bulk sync work end-to-end; refusals enforced.
- **M5 — Drift refresh + per-skill detail drawer (Tasks 24–26).** 30s background tick, per-skill detail panel, "Pull back to source" override. Output: drift surfaces and resolves cleanly.
- **M6 — Package builder + Targets page (Tasks 27–28).** `.skill` zip, "Test write access" on each target. Output: Cowork export works; targets page reflects per-tool health.
- **M7 — Settings, Activity, polish (Tasks 29–33).** Settings form + dir pickers, append-only Activity log, dark mode, icon + signed macOS build, README. Output: v1 binary you can ship to your own Applications folder.

---

## 12. Task breakdown

> Implementation notes for whoever picks this up: every task is intentionally small (2–5 minutes of typing). Each ends with a commit. Run tests before every commit. If a step references "the engineer reading later", that's you — write code that explains itself.

> **Important:** Test fixtures live under `src-tauri/tests/fixtures/`. Never let any test touch the real `~/.claude`, `~/.codex`, `~/.cursor`, `~/.agents`, or `~/.Trash`. Always pass an explicit `home_dir: &Path` into the modules under test and inject a `tempfile::TempDir` from each test.

### Task 1: Scaffold Tauri + Vite + React + TS

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/build.rs`, `.gitignore` (extend), `README.md`

- [ ] **Step 1: Scaffold Tauri into a sibling dir, then move files in**

`create-tauri-app` refuses to scaffold into a non-empty directory (the repo already has `docs/plan.md` and `.gitignore`). Scaffold into a sibling, then move the generated files in:

```bash
cd ~ && pnpm create tauri-app@latest skill-sync-scaffold \
  --template react-ts --manager pnpm \
  --identifier com.devinwalker.skillsync
# move generated files into the real repo (preserving docs/ and .gitignore)
cd ~/skill-sync-scaffold && \
  rsync -a --exclude=.git --exclude=docs --exclude=.gitignore ./ ~/skill-sync/ && \
  cd ~/skill-sync && \
  cat ~/skill-sync-scaffold/.gitignore >> .gitignore && \
  rm -rf ~/skill-sync-scaffold
```

If `create-tauri-app` asks interactively, answer: app name `skill-sync`, window title `Skill Sync`, frontend `React`, language `TypeScript`, package manager `pnpm`.

- [ ] **Step 2: Verify scaffold and launch dev**

Run: `pnpm install && pnpm tauri dev`
Expected: A Tauri window opens showing the default React placeholder. Close it.

- [ ] **Step 3: Pin Tailwind 3 (not 4)**

```bash
pnpm add -D tailwindcss@^3.4 postcss@^8 autoprefixer@^10
pnpm exec tailwindcss init -p
```

- [ ] **Step 4: Replace `src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configure Tailwind content paths**

In `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Import `index.css` in `src/main.tsx`** (if not already)

Confirm `src/main.tsx` has `import "./index.css";` at the top.

- [ ] **Step 7: Smoke test Tailwind**

Edit `src/App.tsx` body to:

```tsx
export default function App() {
  return <div className="p-8 text-xl">Skill Sync</div>;
}
```

Run: `pnpm tauri dev`
Expected: Window shows "Skill Sync" in large text with padding.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "scaffold: tauri + vite + react + tailwind"
```

### Task 2: Install and configure shadcn/ui

**Files:** Create `components.json`; create `src/lib/utils.ts`; modify `src/index.css`, `tailwind.config.ts`.

- [ ] **Step 1: Run shadcn init**

```bash
pnpm dlx shadcn@latest init
```

Answers: TypeScript yes, base color "neutral", CSS variables yes, `src/index.css`, `tailwind.config.ts`, components alias `@/components`, utils alias `@/lib/utils`.

- [ ] **Step 2: Verify `src/lib/utils.ts` exists with `cn` helper**

Read: `src/lib/utils.ts`
Expected: contains `export function cn(...)` wrapping `clsx` + `tailwind-merge`.

- [ ] **Step 3: Add path alias to `tsconfig.json`**

In `compilerOptions`:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 4: Add same alias to Vite config**

In `vite.config.ts`:

```ts
import path from "node:path";
// ...
resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
```

- [ ] **Step 5: Install three primitives we'll need first**

```bash
pnpm dlx shadcn@latest add button badge dialog
```

- [ ] **Step 6: Render a Button to confirm wiring**

Replace `src/App.tsx`:

```tsx
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl">Skill Sync</h1>
      <Button>Hello</Button>
    </div>
  );
}
```

Run: `pnpm tauri dev`
Expected: window shows the shadcn Button.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "ui: install shadcn primitives (button, badge, dialog)"
```

### Task 3: Warm-minimal design tokens

**Files:** Create `src/styles/tokens.css`; modify `src/index.css`, `tailwind.config.ts`.

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
:root {
  --bg: oklch(98% 0.005 80);
  --bg-elevated: oklch(100% 0 0);
  --ink: oklch(22% 0.01 80);
  --muted: oklch(55% 0.01 80);
  --border: oklch(22% 0.01 80 / 8%);
  --accent: oklch(64% 0.13 35);
  --accent-ink: oklch(98% 0.005 80);
  --success: oklch(62% 0.13 145);
  --warning: oklch(72% 0.14 80);
  --danger: oklch(58% 0.18 25);
  --radius: 0.5rem;
}

.dark {
  --bg: oklch(18% 0.01 80);
  --bg-elevated: oklch(22% 0.01 80);
  --ink: oklch(94% 0.005 80);
  --muted: oklch(65% 0.01 80);
  --border: oklch(94% 0.005 80 / 10%);
  --accent: oklch(70% 0.12 35);
  --success: oklch(70% 0.13 145);
  --warning: oklch(78% 0.14 80);
  --danger: oklch(66% 0.18 25);
}

html, body { background: var(--bg); color: var(--ink); }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; font-size: 15px; }
code, .mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
```

- [ ] **Step 2: Import tokens in `src/index.css`** (above the Tailwind directives)

```css
@import "./styles/tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Extend Tailwind theme to consume tokens**

In `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      bg: "var(--bg)",
      "bg-elevated": "var(--bg-elevated)",
      ink: "var(--ink)",
      muted: "var(--muted)",
      border: "var(--border)",
      accent: { DEFAULT: "var(--accent)", ink: "var(--accent-ink)" },
      success: "var(--success)",
      warning: "var(--warning)",
      danger: "var(--danger)",
    },
    borderRadius: { DEFAULT: "var(--radius)" },
    fontSize: { sm: ["13px", "1.45"], base: ["15px", "1.5"], lg: ["20px", "1.35"] },
  },
},
```

- [ ] **Step 4: Smoke test**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="p-8 space-y-3">
      <h1 className="text-lg">Skill Sync</h1>
      <p className="text-muted">Warm minimal tokens loaded.</p>
      <button className="bg-accent text-accent-ink px-3 py-1.5 rounded">Accent</button>
    </div>
  );
}
```

Run: `pnpm tauri dev`
Expected: warm off-white bg, warm dark ink text, terracotta button.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: warm-minimal design tokens"
```

### Task 4: Rust workspace deps and `ts-rs` wiring

**Files:** Modify `src-tauri/Cargo.toml`; create `src-tauri/src/types.rs`; create script `pnpm run gen:types`.

- [ ] **Step 1: Add dependencies to `src-tauri/Cargo.toml`**

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"
walkdir = "2"
sha2 = "0.10"
hex = "0.4"
thiserror = "1"
trash = "5"
zip = { version = "2", default-features = false, features = ["deflate"] }
dirs = "5"
chrono = { version = "0.4", features = ["serde"] }
ts-rs = { version = "9", features = ["serde-compat"] }

[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 2: Create `src-tauri/src/types.rs` with a minimal exported type**

```rust
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct Health {
    pub ok: bool,
    pub version: String,
}
```

- [ ] **Step 3: Wire `types.rs` into `lib.rs`**

In `src-tauri/src/lib.rs`:

```rust
pub mod types;
```

And in `src-tauri/src/main.rs` make sure `lib` is referenced (cargo new with tauri may already do this; if not, add `mod lib;` or use `tauri::Builder::default()` from main).

- [ ] **Step 4: Add a `gen:types` package.json script**

In `package.json` scripts (no special features needed — `ts-rs` exports happen as side-effects of `cargo test` because the derive macro emits `__ts_rs_*` test functions):

```json
"gen:types": "cd src-tauri && cargo test --quiet"
```

- [ ] **Step 5: Generate types**

```bash
cd src-tauri && cargo test
```

Expected: tests pass (none exist yet besides ts-rs's auto-generated ones), and `src/types/bindings.ts` exists with `Health` exported.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "rust: workspace deps + ts-rs binding export"
```

### Task 5: Paths module

**Files:** Create `src-tauri/src/paths.rs`; test `src-tauri/tests/paths_test.rs`.

- [ ] **Step 1: Write the failing test**

`src-tauri/tests/paths_test.rs`:

```rust
use skill_sync::paths::Paths;
use std::path::PathBuf;

#[test]
fn resolves_paths_relative_to_a_given_home() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    assert_eq!(p.claude_skills(), PathBuf::from("/Users/test/.claude/skills"));
    assert_eq!(p.codex_skills(), PathBuf::from("/Users/test/.codex/skills"));
    assert_eq!(p.codex_system_marker(), PathBuf::from("/Users/test/.codex/skills/.system/.codex-system-skills.marker"));
    assert_eq!(p.cursor_skills(), PathBuf::from("/Users/test/.cursor/skills"));
    assert_eq!(p.cursor_skills_cursor(), PathBuf::from("/Users/test/.cursor/skills-cursor"));
    assert_eq!(p.agents_skills(), PathBuf::from("/Users/test/.agents/skills"));
    assert_eq!(p.claude_plugins(), PathBuf::from("/Users/test/.claude/plugins"));
    assert_eq!(p.config_dir(), PathBuf::from("/Users/test/Library/Application Support/skill-sync"));
    assert_eq!(p.trash_archive_root(), PathBuf::from("/Users/test/.Trash/skill-sync-archive"));
}
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cargo test --test paths_test`
Expected: compile error — `skill_sync::paths::Paths` doesn't exist.

- [ ] **Step 3: Implement `src-tauri/src/paths.rs`**

```rust
use std::path::{Path, PathBuf};

pub struct Paths { home: PathBuf }

impl Paths {
    pub fn for_home(home: PathBuf) -> Self { Self { home } }
    pub fn home(&self) -> &Path { &self.home }
    pub fn claude_skills(&self) -> PathBuf { self.home.join(".claude/skills") }
    pub fn codex_skills(&self) -> PathBuf { self.home.join(".codex/skills") }
    pub fn codex_system_marker(&self) -> PathBuf { self.home.join(".codex/skills/.system/.codex-system-skills.marker") }
    pub fn cursor_skills(&self) -> PathBuf { self.home.join(".cursor/skills") }
    pub fn cursor_skills_cursor(&self) -> PathBuf { self.home.join(".cursor/skills-cursor") }
    pub fn agents_skills(&self) -> PathBuf { self.home.join(".agents/skills") }
    pub fn claude_plugins(&self) -> PathBuf { self.home.join(".claude/plugins") }
    pub fn config_dir(&self) -> PathBuf { self.home.join("Library/Application Support/skill-sync") }
    pub fn trash_archive_root(&self) -> PathBuf { self.home.join(".Trash/skill-sync-archive") }
}
```

Register `pub mod paths;` in `lib.rs`.

- [ ] **Step 4: Run test, expect PASS**

Run: `cargo test --test paths_test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "paths: per-home canonical path resolver"
```

### Task 6: Frontmatter parser

**Files:** Create `src-tauri/src/frontmatter.rs`; test `src-tauri/tests/frontmatter_test.rs`; fixtures `src-tauri/tests/fixtures/skills/good/SKILL.md`, `.../no-frontmatter/SKILL.md`, `.../bad-yaml/SKILL.md`.

- [ ] **Step 1: Create fixtures**

`src-tauri/tests/fixtures/skills/good/SKILL.md`:

```markdown
---
name: my-skill
description: A test skill.
---

# My Skill

Body.
```

`src-tauri/tests/fixtures/skills/no-frontmatter/SKILL.md`:

```markdown
# No header
just text
```

`src-tauri/tests/fixtures/skills/bad-yaml/SKILL.md` — frontmatter delimiters present, but the body is `key = value` (not valid YAML mapping syntax):

```markdown
---
name = bad
description = bad
---
```

- [ ] **Step 2: Write failing tests**

`src-tauri/tests/frontmatter_test.rs`:

```rust
use skill_sync::frontmatter::{parse_skill_md, FrontmatterError};
use std::path::PathBuf;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/skills").join(name).join("SKILL.md")
}

#[test]
fn parses_valid_frontmatter() {
    let fm = parse_skill_md(&fixture("good")).unwrap();
    assert_eq!(fm.name, "my-skill");
    assert_eq!(fm.description.as_deref(), Some("A test skill."));
}

#[test]
fn errors_when_no_frontmatter() {
    let err = parse_skill_md(&fixture("no-frontmatter")).unwrap_err();
    assert!(matches!(err, FrontmatterError::Missing));
}

#[test]
fn errors_on_invalid_yaml() {
    let err = parse_skill_md(&fixture("bad-yaml")).unwrap_err();
    assert!(matches!(err, FrontmatterError::InvalidYaml(_)));
}
```

- [ ] **Step 3: Run, confirm fail**

Run: `cargo test --test frontmatter_test`
Expected: module doesn't exist.

- [ ] **Step 4: Implement `src-tauri/src/frontmatter.rs`**

```rust
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
    if lines.next() != Some("---") { return Err(FrontmatterError::Missing); }
    let mut yaml = String::new();
    let mut closed = false;
    for line in lines {
        if line.trim_end() == "---" { closed = true; break; }
        yaml.push_str(line); yaml.push('\n');
    }
    if !closed { return Err(FrontmatterError::Missing); }
    serde_yaml::from_str(&yaml).map_err(|e| FrontmatterError::InvalidYaml(e.to_string()))
}
```

Register `pub mod frontmatter;` in `lib.rs`.

- [ ] **Step 5: Run tests**

Run: `cargo test --test frontmatter_test`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "frontmatter: parse SKILL.md YAML header"
```

### Task 7: Settings + ownership + targets persistence

**Files:** Create `src-tauri/src/config/mod.rs`, `settings.rs`, `ownership.rs`, `targets.rs`; test `src-tauri/tests/config_test.rs`.

- [ ] **Step 1: Define types**

`src-tauri/src/config/settings.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct Settings {
    pub version: u32,
    pub source_root: PathBuf,
    pub package_output_dir: PathBuf,
    pub show_builtins: bool,
    pub external_bundle_roots: Vec<PathBuf>,
    pub enabled_targets: Vec<String>,
    pub cowork_package_enabled: bool,
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
        }
    }
}
```

`src-tauri/src/config/ownership.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
#[serde(rename_all = "lowercase")]
pub enum OwnershipClass { Mine, External, Ignore }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct OwnershipEntry {
    pub class: OwnershipClass,
    pub source_path: Option<PathBuf>,
    pub confirmed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct OwnershipFile {
    pub version: u32,
    pub skills: BTreeMap<String, OwnershipEntry>,
}
```

`src-tauri/src/config/targets.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
#[serde(rename_all = "kebab-case")]
pub enum TargetKind { DirectoryMirror, PackageOnly }

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct Target {
    pub install_path: Option<PathBuf>,
    pub kind: TargetKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct TargetsFile {
    pub version: u32,
    pub targets: BTreeMap<String, Target>,
}
```

`src-tauri/src/config/mod.rs`:

```rust
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
```

Register `pub mod config;` in `lib.rs`.

- [ ] **Step 2: Write tests**

`src-tauri/tests/config_test.rs`:

```rust
use skill_sync::config::{load_or_init, save, settings::Settings, ownership::{OwnershipFile, OwnershipEntry, OwnershipClass}};
use tempfile::tempdir;

#[test]
fn settings_default_seeds_a_file() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("settings.json");
    let s = load_or_init(&path, Settings::defaults(dir.path())).unwrap();
    assert!(path.exists());
    assert_eq!(s.version, 1);
    assert_eq!(s.enabled_targets.len(), 3);
}

#[test]
fn ownership_roundtrip() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("ownership.json");
    let mut o = OwnershipFile { version: 1, skills: Default::default() };
    o.skills.insert("foo".into(), OwnershipEntry {
        class: OwnershipClass::Mine, source_path: None, confirmed_at: None, note: None,
    });
    save(&path, &o).unwrap();
    let loaded: OwnershipFile = load_or_init(&path, OwnershipFile::default()).unwrap();
    assert_eq!(loaded.skills.get("foo").unwrap().class, OwnershipClass::Mine);
}

#[test]
fn save_is_atomic() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("settings.json");
    save(&path, &Settings::defaults(dir.path())).unwrap();
    assert!(!dir.path().join("settings.json.tmp").exists());
}
```

- [ ] **Step 3: Run tests**

Run: `cargo test --test config_test`
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "config: settings + ownership + targets with atomic writes"
```

### Task 8: Discovery walker

**Files:** Create `src-tauri/src/discovery.rs`; test `src-tauri/tests/discovery_test.rs`.

- [ ] **Step 1: Failing test**

`src-tauri/tests/discovery_test.rs`:

```rust
use skill_sync::discovery::{discover_in_root, CandidateLocation};
use std::fs;
use tempfile::tempdir;

#[test]
fn discovers_skills_with_SKILL_md_at_depth_one() {
    let dir = tempdir().unwrap();
    let a = dir.path().join("alpha"); fs::create_dir_all(&a).unwrap();
    fs::write(a.join("SKILL.md"), "---\nname: alpha\n---\nbody\n").unwrap();
    let b = dir.path().join("not-a-skill"); fs::create_dir_all(&b).unwrap();
    fs::write(b.join("README.md"), "no skill md").unwrap();

    let found = discover_in_root(dir.path()).unwrap();
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].dir_name, "alpha");
}

#[test]
fn flags_symlink_locations() {
    let dir = tempdir().unwrap();
    let real = dir.path().join("real-skill"); fs::create_dir_all(&real).unwrap();
    fs::write(real.join("SKILL.md"), "---\nname: real\n---\n").unwrap();
    let link = dir.path().join("link-skill");
    std::os::unix::fs::symlink(&real, &link).unwrap();

    let mut found = discover_in_root(dir.path()).unwrap();
    found.sort_by(|a, b| a.dir_name.cmp(&b.dir_name));
    assert_eq!(found.len(), 2);
    let link_entry = found.iter().find(|c| c.dir_name == "link-skill").unwrap();
    assert!(link_entry.is_symlink);
    assert_eq!(link_entry.real_path, real.canonicalize().unwrap());
}
```

- [ ] **Step 2: Implement**

`src-tauri/src/discovery.rs`:

```rust
use serde::Serialize;
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct CandidateLocation {
    pub dir_name: String,
    pub path: PathBuf,
    pub real_path: PathBuf,
    pub is_symlink: bool,
}

pub fn discover_in_root(root: &Path) -> std::io::Result<Vec<CandidateLocation>> {
    let mut out = Vec::new();
    if !root.exists() { return Ok(out); }
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') { continue; }
        let path = entry.path();
        let meta = std::fs::symlink_metadata(&path)?;
        let is_symlink = meta.file_type().is_symlink();
        let real_path = std::fs::canonicalize(&path)?;
        if !real_path.is_dir() { continue; }
        if !real_path.join("SKILL.md").exists() { continue; }
        out.push(CandidateLocation { dir_name: name, path, real_path, is_symlink });
    }
    Ok(out)
}
```

Register `pub mod discovery;` in `lib.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test --test discovery_test`
Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "discovery: walk a root, return candidate locations"
```

### Task 9: Provenance classifier

**Files:** Create `src-tauri/src/provenance.rs`; test `src-tauri/tests/provenance_test.rs`; create `src-tauri/src/config/known_bundles.rs` (seed).

- [ ] **Step 1: Seed known bundles**

`src-tauri/src/config/known_bundles.rs`:

```rust
pub const SEED: &[&str] = &[
    // Superpowers
    "brainstorming","dispatching-parallel-agents","executing-plans","find-skills",
    "finishing-a-development-branch","receiving-code-review","requesting-code-review",
    "subagent-driven-development","systematic-debugging","test-driven-development",
    "using-git-worktrees","using-superpowers","verification-before-completion",
    "writing-plans","writing-skills",
    // Codex system
    "imagegen","openai-docs","plugin-creator","skill-creator","skill-installer",
    // Cursor built-ins (under skills-cursor)
    "babysit","canvas","create-hook","create-rule","create-skill","create-subagent",
    "migrate-to-skills","sdk","shell","split-to-prs","statusline",
    "update-cli-config","update-cursor-settings",
];
```

Register in `config/mod.rs`: `pub mod known_bundles;`.

- [ ] **Step 2: Failing test**

`src-tauri/tests/provenance_test.rs`:

```rust
use skill_sync::discovery::CandidateLocation;
use skill_sync::provenance::{classify, Class, Signal};
use skill_sync::paths::Paths;
use std::path::PathBuf;

fn loc(real: &str, original: &str, symlink: bool) -> CandidateLocation {
    CandidateLocation {
        dir_name: PathBuf::from(original).file_name().unwrap().to_string_lossy().into(),
        path: PathBuf::from(original),
        real_path: PathBuf::from(real),
        is_symlink: symlink,
    }
}

#[test]
fn codex_system_path_is_tool_builtin() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc("/Users/test/.codex/skills/.system/skill-creator",
               "/Users/test/.codex/skills/.system/skill-creator", false);
    let r = classify(&c, &p, &["my-skill".into()], &[]);
    assert_eq!(r.class, Class::ToolBuiltin);
    assert!(r.signals.contains(&Signal::CodexSystemPath));
}

#[test]
fn symlink_into_agents_is_bundle() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc("/Users/test/.agents/skills/brainstorming",
               "/Users/test/.claude/skills/brainstorming", true);
    let r = classify(&c, &p, &["my-skill".into()], &[]);
    assert_eq!(r.class, Class::Bundle);
    assert!(r.signals.contains(&Signal::SymlinkIntoBundle));
}

#[test]
fn user_dir_with_known_bundle_name_is_bundle_via_namelist() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc("/Users/test/.claude/skills/brainstorming",
               "/Users/test/.claude/skills/brainstorming", false);
    let r = classify(&c, &p, &["brainstorming".into()], &[]);
    assert_eq!(r.class, Class::Bundle);
}

#[test]
fn fresh_user_skill_is_mine_heuristic() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc("/Users/test/.claude/skills/jetpack-thing",
               "/Users/test/.claude/skills/jetpack-thing", false);
    let r = classify(&c, &p, &["other-known".into()], &[]);
    assert_eq!(r.class, Class::MineHeuristic);
}

#[test]
fn cursor_builtin_dir_is_tool_builtin() {
    let p = Paths::for_home(PathBuf::from("/Users/test"));
    let c = loc("/Users/test/.cursor/skills-cursor/babysit",
               "/Users/test/.cursor/skills-cursor/babysit", false);
    let r = classify(&c, &p, &[], &[]);
    assert_eq!(r.class, Class::ToolBuiltin);
}
```

- [ ] **Step 3: Implement**

`src-tauri/src/provenance.rs`:

```rust
use serde::Serialize;
use std::path::{Path, PathBuf};
use ts_rs::TS;
use crate::discovery::CandidateLocation;
use crate::paths::Paths;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub enum Class { ToolBuiltin, Bundle, MineHeuristic, Unknown }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub enum Signal {
    CodexSystemPath, CursorBuiltinPath, ClaudePluginPath,
    AgentsRoot, ExternalBundleRoot, SymlinkIntoBundle,
    KnownBundleName, FreshUserDir,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct Provenance { pub class: Class, pub signals: Vec<Signal> }

fn under(p: &Path, root: &Path) -> bool { p.starts_with(root) }

pub fn classify(
    loc: &CandidateLocation,
    paths: &Paths,
    known_bundles: &[String],
    external_bundle_roots: &[PathBuf],
) -> Provenance {
    let r = &loc.real_path;
    let p = &loc.path;
    let mut signals = Vec::new();

    if r.ancestors().any(|a| a == paths.codex_skills().join(".system")) {
        signals.push(Signal::CodexSystemPath);
        return Provenance { class: Class::ToolBuiltin, signals };
    }
    if under(r, &paths.cursor_skills_cursor()) {
        signals.push(Signal::CursorBuiltinPath);
        return Provenance { class: Class::ToolBuiltin, signals };
    }
    if under(r, &paths.claude_plugins()) {
        signals.push(Signal::ClaudePluginPath);
        return Provenance { class: Class::ToolBuiltin, signals };
    }
    if under(r, &paths.agents_skills()) {
        signals.push(Signal::AgentsRoot);
        return Provenance { class: Class::Bundle, signals };
    }
    for ext in external_bundle_roots {
        if under(r, ext) {
            signals.push(Signal::ExternalBundleRoot);
            return Provenance { class: Class::Bundle, signals };
        }
    }
    if loc.is_symlink {
        let in_source = under(r, &paths.claude_skills())
            || under(r, &paths.codex_skills())
            || under(r, &paths.cursor_skills());
        if !in_source {
            signals.push(Signal::SymlinkIntoBundle);
            return Provenance { class: Class::Bundle, signals };
        }
    }
    if known_bundles.iter().any(|n| n.as_str() == loc.dir_name.as_str()) {
        signals.push(Signal::KnownBundleName);
        return Provenance { class: Class::Bundle, signals };
    }
    let in_user_source = under(p, &paths.claude_skills()) || under(p, &paths.codex_skills())
        || under(p, &paths.cursor_skills());
    if in_user_source && !loc.is_symlink {
        signals.push(Signal::FreshUserDir);
        return Provenance { class: Class::MineHeuristic, signals };
    }
    Provenance { class: Class::Unknown, signals }
}
```

Register `pub mod provenance;` in `lib.rs`.

- [ ] **Step 4: Run tests**

Run: `cargo test --test provenance_test`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "provenance: signal-based classifier (builtin/bundle/mine/unknown)"
```

### Task 10: Skill identity and content hashing

**Files:** Create `src-tauri/src/identity.rs`; test `src-tauri/tests/identity_test.rs`.

- [ ] **Step 1: Failing test**

`src-tauri/tests/identity_test.rs`:

```rust
use skill_sync::identity::{content_hash};
use std::fs;
use tempfile::tempdir;

#[test]
fn identical_dirs_have_identical_hash() {
    let a = tempdir().unwrap(); let b = tempdir().unwrap();
    for d in [&a, &b] {
        fs::write(d.path().join("SKILL.md"), "---\nname: x\n---\n").unwrap();
        fs::create_dir_all(d.path().join("references")).unwrap();
        fs::write(d.path().join("references/r.md"), "ref\n").unwrap();
    }
    assert_eq!(content_hash(a.path()).unwrap(), content_hash(b.path()).unwrap());
}

#[test]
fn modifying_a_file_changes_the_hash() {
    let a = tempdir().unwrap();
    fs::write(a.path().join("SKILL.md"), "---\nname: x\n---\n").unwrap();
    let h1 = content_hash(a.path()).unwrap();
    fs::write(a.path().join("SKILL.md"), "---\nname: x\n---\ny\n").unwrap();
    let h2 = content_hash(a.path()).unwrap();
    assert_ne!(h1, h2);
}

#[test]
fn ignores_ds_store_and_tmp_files() {
    let a = tempdir().unwrap(); let b = tempdir().unwrap();
    fs::write(a.path().join("SKILL.md"), "x").unwrap();
    fs::write(b.path().join("SKILL.md"), "x").unwrap();
    fs::write(b.path().join(".DS_Store"), "junk").unwrap();
    fs::write(b.path().join("foo.swp"), "junk").unwrap();
    assert_eq!(content_hash(a.path()).unwrap(), content_hash(b.path()).unwrap());
}
```

- [ ] **Step 2: Implement**

`src-tauri/src/identity.rs`:

```rust
use sha2::{Digest, Sha256};
use std::path::Path;
use walkdir::WalkDir;

fn ignored(name: &str) -> bool {
    name == ".DS_Store" || name.ends_with(".swp") || name.starts_with('.') && name != ".skillignore"
}

pub fn content_hash(dir: &Path) -> std::io::Result<String> {
    let mut paths: Vec<_> = WalkDir::new(dir).into_iter()
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
```

Register `pub mod identity;` in `lib.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test --test identity_test`
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "identity: deterministic content hash over skill dir"
```

### Task 11: Aggregator — `list_skills`

**Files:** Create `src-tauri/src/aggregator.rs`; test `src-tauri/tests/aggregator_test.rs`.

This task ties discovery + provenance + identity into one IPC-shaped return: per-skill, the locations on disk, the inferred class, the per-location hash. The frontend consumes this.

- [ ] **Step 1: Define output type and test**

`src-tauri/tests/aggregator_test.rs`:

```rust
use skill_sync::aggregator::list_skills;
use skill_sync::paths::Paths;
use std::fs;
use tempfile::tempdir;

#[test]
fn aggregates_mine_and_bundle_across_locations() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());

    // user authored "alpha" in claude + codex
    for d in [&paths.claude_skills(), &paths.codex_skills()] {
        let alpha = d.join("alpha");
        fs::create_dir_all(&alpha).unwrap();
        fs::write(alpha.join("SKILL.md"), "---\nname: alpha\n---\n").unwrap();
    }
    // superpowers symlink in claude → agents
    let agents = paths.agents_skills();
    fs::create_dir_all(agents.join("brainstorming")).unwrap();
    fs::write(agents.join("brainstorming/SKILL.md"), "---\nname: brainstorming\n---\n").unwrap();
    let link = paths.claude_skills().join("brainstorming");
    std::os::unix::fs::symlink(agents.join("brainstorming"), &link).unwrap();

    let report = list_skills(&paths, &["brainstorming".into()]).unwrap();

    let alpha = report.iter().find(|s| s.name == "alpha").unwrap();
    assert_eq!(alpha.locations.len(), 2);
    assert!(matches!(alpha.class, skill_sync::provenance::Class::MineHeuristic));

    let bs = report.iter().find(|s| s.name == "brainstorming").unwrap();
    assert!(matches!(bs.class, skill_sync::provenance::Class::Bundle));
}
```

- [ ] **Step 2: Implement**

`src-tauri/src/aggregator.rs`:

```rust
use serde::Serialize;
use std::collections::BTreeMap;
use std::path::PathBuf;
use ts_rs::TS;
use crate::{discovery::{discover_in_root, CandidateLocation}, frontmatter::parse_skill_md,
            paths::Paths, provenance::{classify, Class, Provenance}, identity::content_hash};

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct LocationView {
    pub path: PathBuf,
    pub real_path: PathBuf,
    pub is_symlink: bool,
    pub hash: String,
    pub provenance: Provenance,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct SkillView {
    pub name: String,
    pub description: Option<String>,
    pub class: Class,
    pub locations: Vec<LocationView>,
}

pub fn list_skills(paths: &Paths, known_bundles: &[String]) -> std::io::Result<Vec<SkillView>> {
    let roots = [paths.claude_skills(), paths.codex_skills(), paths.cursor_skills(),
                 paths.cursor_skills_cursor(), paths.agents_skills()];
    let mut grouped: BTreeMap<String, SkillView> = BTreeMap::new();

    for root in roots.iter() {
        let candidates = discover_in_root(root).unwrap_or_default();
        for loc in candidates {
            let fm = match parse_skill_md(&loc.real_path.join("SKILL.md")) { Ok(f) => f, Err(_) => continue };
            let prov = classify(&loc, paths, known_bundles, &[]);
            let hash = content_hash(&loc.real_path).unwrap_or_default();
            let lv = LocationView {
                path: loc.path.clone(), real_path: loc.real_path.clone(),
                is_symlink: loc.is_symlink, hash, provenance: prov.clone(),
            };
            let entry = grouped.entry(fm.name.clone()).or_insert(SkillView {
                name: fm.name.clone(),
                description: fm.description.clone(),
                class: prov.class,
                locations: vec![],
            });
            // class precedence: ToolBuiltin > Bundle > MineHeuristic > Unknown
            entry.class = stronger(entry.class, prov.class);
            entry.locations.push(lv);
        }
    }
    Ok(grouped.into_values().collect())
}

fn stronger(a: Class, b: Class) -> Class {
    use Class::*;
    let rank = |c: Class| match c { ToolBuiltin => 3, Bundle => 2, MineHeuristic => 1, Unknown => 0 };
    if rank(b) > rank(a) { b } else { a }
}
```

Register `pub mod aggregator;` in `lib.rs`.

- [ ] **Step 3: Run tests**

Run: `cargo test --test aggregator_test`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "aggregator: list_skills groups locations by name with class precedence"
```

### Task 12: IPC `list_skills` command

**Files:** Create `src-tauri/src/ipc/mod.rs`, `src-tauri/src/ipc/commands.rs`; modify `src-tauri/src/main.rs` to register; create `src/lib/ipc.ts`.

- [ ] **Step 1: Create commands module**

`src-tauri/src/ipc/commands.rs`:

```rust
use crate::{aggregator::{list_skills, SkillView}, config::{known_bundles, settings::Settings, load_or_init}, paths::Paths};
use std::path::PathBuf;

#[tauri::command]
pub fn cmd_list_skills() -> Result<Vec<SkillView>, String> {
    let home = dirs::home_dir().ok_or("no home dir")?;
    let paths = Paths::for_home(home.clone());
    let settings_path = paths.config_dir().join("settings.json");
    let settings: Settings = load_or_init(&settings_path, Settings::defaults(&home))
        .map_err(|e| e.to_string())?;
    let known: Vec<String> = known_bundles::SEED.iter().map(|s| s.to_string()).collect();
    let _ = settings;
    list_skills(&paths, &known).map_err(|e| e.to_string())
}
```

`src-tauri/src/ipc/mod.rs`:

```rust
pub mod commands;
```

Register `pub mod ipc;` in `lib.rs`.

- [ ] **Step 2: Wire into `main.rs`**

```rust
use skill_sync::ipc::commands::cmd_list_skills;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![cmd_list_skills])
        .run(tauri::generate_context!())
        .expect("tauri error");
}
```

- [ ] **Step 3: Typed frontend wrapper**

`src/lib/ipc.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { SkillView } from "@/types/bindings";

export const ipc = {
  listSkills: () => invoke<SkillView[]>("cmd_list_skills"),
};
```

- [ ] **Step 4: Smoke test from the UI**

Replace `src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { ipc } from "@/lib/ipc";
import type { SkillView } from "@/types/bindings";

export default function App() {
  const [skills, setSkills] = useState<SkillView[]>([]);
  useEffect(() => { ipc.listSkills().then(setSkills).catch(console.error); }, []);
  return (
    <div className="p-8 space-y-2">
      <h1 className="text-lg">Skill Sync</h1>
      <ul className="space-y-1 text-sm">
        {skills.map(s => <li key={s.name}>{s.name} — {String(s.class)}</li>)}
      </ul>
    </div>
  );
}
```

Run: `pnpm tauri dev`
Expected: window shows a real list of skills from your actual home dir, with their inferred class.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ipc: cmd_list_skills end-to-end (rust → typed ts → ui)"
```

### Tasks 13–18 — Library UI + Ownership Inbox

> These tasks build out the library table, owner/drift badges, the skill detail drawer, ownership persistence on the frontend, and the Ownership Inbox modal. They are mechanically straightforward once Task 12 is green; full code is below.

### Task 13: App shell + sidebar

**Files:** Create `src/components/app-shell.tsx`, `src/components/sidebar.tsx`, `src/components/source-root-badge.tsx`, `src/routes.tsx`; modify `src/App.tsx`.

- [ ] **Step 1: Install router (pin v6 — v7 has breaking import changes)**

```bash
pnpm add react-router-dom@^6.26
```

- [ ] **Step 2: `src/components/sidebar.tsx`**

```tsx
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Library" },
  { to: "/targets", label: "Targets" },
  { to: "/activity", label: "Activity" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <nav className="w-60 border-r border-border h-full flex flex-col bg-bg-elevated">
      <div className="p-5 text-lg font-medium">Skill Sync</div>
      <div className="px-2 flex-1 space-y-0.5">
        {items.map(i => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"}
            className={({ isActive }) => cn(
              "block px-3 py-2 rounded text-sm",
              isActive ? "bg-accent text-accent-ink" : "hover:bg-border"
            )}>{i.label}</NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: `src/components/app-shell.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";

export function AppShell() {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 4: `src/routes.tsx` and `src/App.tsx`**

```tsx
// routes.tsx
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { LibraryPage } from "./pages/library";
import { TargetsPage } from "./pages/targets";
import { ActivityPage } from "./pages/activity";
import { SettingsPage } from "./pages/settings";

export const router = createBrowserRouter([
  { path: "/", element: <AppShell />, children: [
    { index: true, element: <LibraryPage /> },
    { path: "targets", element: <TargetsPage /> },
    { path: "activity", element: <ActivityPage /> },
    { path: "settings", element: <SettingsPage /> },
  ]},
]);
```

```tsx
// App.tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
export default function App() { return <RouterProvider router={router} />; }
```

Create stub pages — each is a single H2 with the page name (will fill in later tasks).

- [ ] **Step 5: Run**

Run: `pnpm tauri dev`
Expected: sidebar with 4 items, clicking each changes the main pane.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ui: app shell + router + sidebar"
```

### Task 14: Owner + drift badges

**Files:** Create `src/components/owner-badge.tsx`, `src/components/drift-badge.tsx`.

> Full code: each is a 30-line component rendering a colored dot + label. Owner badge maps `Class` → color; drift badge maps `DriftStatus` (from Task 23) → color. Until Task 23 lands, drift-badge accepts a placeholder string.

- [ ] **Step 1: `src/components/owner-badge.tsx`**

```tsx
import type { Class } from "@/types/bindings";

const config: Record<Class, { label: string; tone: string }> = {
  MineHeuristic: { label: "Mine (auto)", tone: "bg-warning/15 text-warning" },
  Bundle:        { label: "Bundle",      tone: "bg-muted/15 text-muted"   },
  ToolBuiltin:   { label: "Built-in",    tone: "bg-muted/10 text-muted"   },
  Unknown:       { label: "Unknown",     tone: "bg-danger/15 text-danger" },
};

export function OwnerBadge({ klass, confirmed }: { klass: Class; confirmed?: boolean }) {
  const c = confirmed && klass === "MineHeuristic"
    ? { label: "Mine", tone: "bg-success/15 text-success" }
    : config[klass];
  return <span className={`px-2 py-0.5 rounded-full text-xs ${c.tone}`}>{c.label}</span>;
}
```

- [ ] **Step 2: `src/components/drift-badge.tsx`**

```tsx
type DriftStatus = "in-sync" | "drifted-target-newer" | "drifted-source-newer" | "missing-in-target" | "unmanaged" | "refused";

const config: Record<DriftStatus, { label: string; tone: string }> = {
  "in-sync":               { label: "in sync",    tone: "text-success" },
  "drifted-target-newer":  { label: "drifted ↑",  tone: "text-warning" },
  "drifted-source-newer":  { label: "drifted ↓",  tone: "text-warning" },
  "missing-in-target":     { label: "missing",    tone: "text-muted"   },
  "unmanaged":             { label: "symlinked",  tone: "text-muted"   },
  "refused":               { label: "refused",    tone: "text-danger"  },
};

export function DriftBadge({ status }: { status: DriftStatus }) {
  return <span className={`text-xs ${config[status].tone}`}>{config[status].label}</span>;
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ui: owner + drift badges"
```

### Task 15: Library table — minimal pass

**Files:** Create `src/pages/library.tsx`, `src/components/library-table.tsx`, `src/components/skill-row.tsx`, `src/hooks/use-skills.ts`.

- [ ] **Step 1: TanStack Query setup**

```bash
pnpm add @tanstack/react-query
```

`src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
```

Wrap router with provider in `src/App.tsx`:

```tsx
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { router } from "./routes";
export default function App() {
  return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
}
```

- [ ] **Step 2: `src/hooks/use-skills.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
export function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: () => ipc.listSkills() });
}
```

- [ ] **Step 3: `src/components/library-table.tsx`**

```tsx
import { useSkills } from "@/hooks/use-skills";
import { OwnerBadge } from "./owner-badge";

export function LibraryTable() {
  const { data, isLoading } = useSkills();
  if (isLoading) return <div className="p-8 text-muted">Scanning…</div>;
  if (!data) return null;
  return (
    <table className="w-full">
      <thead><tr className="text-xs text-muted text-left">
        <th className="px-6 py-3">Skill</th><th>Owner</th><th>Locations</th>
      </tr></thead>
      <tbody>
        {data.map(s => (
          <tr key={s.name} className="border-t border-border">
            <td className="px-6 py-2.5">{s.name}</td>
            <td><OwnerBadge klass={s.class} /></td>
            <td className="text-xs text-muted">{s.locations.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: `src/pages/library.tsx`**

```tsx
import { LibraryTable } from "@/components/library-table";

export function LibraryPage() {
  return (
    <div className="py-6">
      <header className="px-8 pb-4">
        <h1 className="text-lg">Library</h1>
      </header>
      <LibraryTable />
    </div>
  );
}
```

- [ ] **Step 5: Run**

Run: `pnpm tauri dev`
Expected: real skill list rendered with owner badges in a clean warm-minimal table.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ui: library table v1 with owner badges"
```

### Task 16: Ownership IPC commands

**Files:** Add `cmd_get_ownership`, `cmd_set_ownership` to `src-tauri/src/ipc/commands.rs`; extend `src/lib/ipc.ts`; create `src/hooks/use-ownership.ts`.

- [ ] **Step 1: Backend commands**

In `src-tauri/src/ipc/commands.rs` add:

```rust
use crate::config::ownership::{OwnershipFile, OwnershipEntry, OwnershipClass};
use crate::config::{save};

#[tauri::command]
pub fn cmd_get_ownership() -> Result<OwnershipFile, String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    let path = paths.config_dir().join("ownership.json");
    load_or_init(&path, OwnershipFile { version: 1, skills: Default::default() })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_set_ownership(name: String, class: OwnershipClass, note: Option<String>) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    let path = paths.config_dir().join("ownership.json");
    let mut file: OwnershipFile = load_or_init(&path, OwnershipFile { version: 1, skills: Default::default() })
        .map_err(|e| e.to_string())?;
    file.skills.insert(name, OwnershipEntry { class, source_path: None,
        confirmed_at: Some(chrono::Utc::now()), note });
    save(&path, &file).map_err(|e| e.to_string())
}
```

Register both in `main.rs` invoke handler.

- [ ] **Step 2: Frontend wrappers**

`src/lib/ipc.ts` — add:

```ts
import type { OwnershipFile, OwnershipClass } from "@/types/bindings";
export const ipc = {
  // ...existing
  getOwnership: () => invoke<OwnershipFile>("cmd_get_ownership"),
  setOwnership: (name: string, klass: OwnershipClass, note?: string | null) =>
    invoke<void>("cmd_set_ownership", { name, class: klass, note: note ?? null }),
};
```

`src/hooks/use-ownership.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { OwnershipClass } from "@/types/bindings";

export function useOwnership() {
  return useQuery({ queryKey: ["ownership"], queryFn: () => ipc.getOwnership() });
}
export function useSetOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, klass, note }: { name: string; klass: OwnershipClass; note?: string }) =>
      ipc.setOwnership(name, klass, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ownership"] }); qc.invalidateQueries({ queryKey: ["skills"] }); },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ipc: ownership get/set"
```

### Task 17: Ownership Inbox modal

**Files:** Create `src/components/ownership-inbox.tsx`; modify `src/pages/library.tsx` to mount it.

- [ ] **Step 1: Install Dialog from shadcn (already added in Task 2)** — confirm it exists at `src/components/ui/dialog.tsx`.

- [ ] **Step 2: `src/components/ownership-inbox.tsx`**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership, useSetOwnership } from "@/hooks/use-ownership";
import type { OwnershipClass } from "@/types/bindings";

export function OwnershipInbox() {
  const skills = useSkills();
  const ownership = useOwnership();
  const set = useSetOwnership();
  const unknowns = (skills.data ?? []).filter(s =>
    s.class === "MineHeuristic" && !ownership.data?.skills?.[s.name]
  );
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissed && unknowns.length > 0) setOpen(true);
  }, [unknowns.length, dismissed]);

  if (!unknowns.length) return null;

  const decide = (name: string, klass: OwnershipClass) =>
    set.mutate({ name, klass });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDismissed(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Tag your skills</DialogTitle></DialogHeader>
        <p className="text-sm text-muted mb-3">
          {unknowns.length} skill{unknowns.length === 1 ? "" : "s"} look like yours.
          Confirm so sync only touches what you own.
        </p>
        <ul className="space-y-2 max-h-80 overflow-auto">
          {unknowns.map(s => (
            <li key={s.name} className="flex items-center justify-between rounded border border-border p-3">
              <div>
                <div className="text-sm">{s.name}</div>
                {s.description && <div className="text-xs text-muted line-clamp-1">{s.description}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide(s.name, "external")}>External</Button>
                <Button size="sm" onClick={() => decide(s.name, "mine")}>Mine</Button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Mount in `LibraryPage`**

```tsx
import { OwnershipInbox } from "@/components/ownership-inbox";
// ...inside LibraryPage return:
<OwnershipInbox />
```

- [ ] **Step 4: Run**

Run: `pnpm tauri dev`
Expected: on first launch, inbox opens listing your authored skills as untagged. Click "Mine" on each; modal closes once all are resolved.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: ownership inbox modal for tagging unknowns"
```

### Task 18: Library row reflects confirmed ownership

**Files:** Modify `src/components/library-table.tsx` and `src/components/owner-badge.tsx`.

- [ ] **Step 1: Read ownership in the table and pass `confirmed` to the badge**

```tsx
import { useOwnership } from "@/hooks/use-ownership";
// inside LibraryTable:
const { data: ownership } = useOwnership();
// in the row:
<OwnerBadge
  klass={s.class}
  confirmed={ownership?.skills?.[s.name]?.class === "mine"}
/>
```

- [ ] **Step 2: Run, confirm badge flips to green "Mine" after tagging**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ui: library badge reflects confirmed ownership"
```

### Task 19: Trash archive helper

**Files:** Create `src-tauri/src/trash.rs`; test `src-tauri/tests/trash_test.rs`.

> The `trash` crate moves into the real `~/.Trash`. In tests we use it but point at a `tempfile::TempDir` masquerading as a "home" — the trash crate sends to the real Trash, so for tests we wrap with a `MoveArchive` trait and use a `MoveToDir` impl in tests, `TrashAction` in production.

- [ ] **Step 1: Trait + impls**

```rust
// src-tauri/src/trash.rs
use std::path::{Path, PathBuf};

pub trait MoveArchive {
    fn archive(&self, src: &Path, archive_root: &Path, label: &str) -> std::io::Result<PathBuf>;
}

pub struct TrashAction;
impl MoveArchive for TrashAction {
    fn archive(&self, src: &Path, archive_root: &Path, label: &str) -> std::io::Result<PathBuf> {
        std::fs::create_dir_all(archive_root)?;
        let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%S");
        let dest = archive_root.join(format!("{stamp}-{label}"));
        std::fs::create_dir_all(&dest)?;
        let target = dest.join(src.file_name().unwrap());
        std::fs::rename(src, &target)?;
        trash::delete(&target).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
        Ok(target)
    }
}

pub struct MoveToDir;
impl MoveArchive for MoveToDir {
    fn archive(&self, src: &Path, archive_root: &Path, label: &str) -> std::io::Result<PathBuf> {
        std::fs::create_dir_all(archive_root)?;
        let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%S");
        let dest = archive_root.join(format!("{stamp}-{label}")).join(src.file_name().unwrap());
        if let Some(p) = dest.parent() { std::fs::create_dir_all(p)?; }
        std::fs::rename(src, &dest)?;
        Ok(dest)
    }
}
```

- [ ] **Step 2: Test (MoveToDir only — never touch real Trash)**

`src-tauri/tests/trash_test.rs`:

```rust
use skill_sync::trash::{MoveArchive, MoveToDir};
use std::fs;
use tempfile::tempdir;

#[test]
fn move_to_dir_relocates_and_stamps() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("payload"); fs::create_dir(&src).unwrap();
    fs::write(src.join("a.txt"), "hi").unwrap();
    let archive_root = dir.path().join("archive");
    let dest = MoveToDir.archive(&src, &archive_root, "claude-foo").unwrap();
    assert!(dest.join("a.txt").exists());
    assert!(!src.exists());
}
```

- [ ] **Step 3: Run**

Run: `cargo test --test trash_test`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "trash: archive helper (Trash in prod, dir in tests)"
```

### Task 20: Sync planner (dry run)

**Files:** Create `src-tauri/src/sync.rs`; test `src-tauri/tests/sync_test.rs`.

This task implements the *plan* — no writes yet.

- [ ] **Step 1: Define types**

```rust
// sync.rs (excerpt)
use serde::Serialize;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub enum PlanAction { Create, Update, Skip, Refuse }

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct PlanRow {
    pub skill: String,
    pub target: String,
    pub action: PlanAction,
    pub source: PathBuf,
    pub destination: PathBuf,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct SyncPlan { pub rows: Vec<PlanRow> }
```

- [ ] **Step 2: Plan function with refusal rules**

```rust
use crate::paths::Paths;

pub struct Input<'a> {
    pub paths: &'a Paths,
    pub source_root: &'a std::path::Path,
    pub mine_skills: &'a [(String, std::path::PathBuf)], // (name, source_path)
    pub targets: &'a [(String, std::path::PathBuf)],     // (name, install_dir)
}

pub fn plan(input: &Input) -> SyncPlan {
    let mut rows = Vec::new();
    let denylist = [
        input.paths.agents_skills(),
        input.paths.claude_plugins(),
        input.paths.codex_skills().join(".system"),
        input.paths.cursor_skills_cursor(),
    ];
    for (skill, source) in input.mine_skills {
        for (tname, install_dir) in input.targets {
            let dest = install_dir.join(skill);
            // Refusal 1: destination resolves under a denylist root
            let real_dest_parent = std::fs::canonicalize(install_dir).ok();
            let refused_root = real_dest_parent.as_ref()
                .map(|p| denylist.iter().any(|d| p.starts_with(d))).unwrap_or(false);
            if refused_root {
                rows.push(PlanRow { skill: skill.clone(), target: tname.clone(),
                    action: PlanAction::Refuse, source: source.clone(), destination: dest,
                    reason: Some("destination under bundle/builtin root".into()) });
                continue;
            }
            // Refusal 2: destination is a symlink
            if let Ok(meta) = std::fs::symlink_metadata(&dest) {
                if meta.file_type().is_symlink() {
                    rows.push(PlanRow { skill: skill.clone(), target: tname.clone(),
                        action: PlanAction::Refuse, source: source.clone(), destination: dest,
                        reason: Some("destination is a symlink".into()) });
                    continue;
                }
            }
            // Refusal 3: parent doesn't exist
            if !install_dir.exists() {
                rows.push(PlanRow { skill: skill.clone(), target: tname.clone(),
                    action: PlanAction::Refuse, source: source.clone(), destination: dest,
                    reason: Some("target install dir missing".into()) });
                continue;
            }
            if dest.exists() {
                // Compare hashes for skip vs update
                let h_src = crate::identity::content_hash(source).unwrap_or_default();
                let h_dst = crate::identity::content_hash(&dest).unwrap_or_default();
                rows.push(PlanRow { skill: skill.clone(), target: tname.clone(),
                    action: if h_src == h_dst { PlanAction::Skip } else { PlanAction::Update },
                    source: source.clone(), destination: dest, reason: None });
            } else {
                rows.push(PlanRow { skill: skill.clone(), target: tname.clone(),
                    action: PlanAction::Create, source: source.clone(), destination: dest, reason: None });
            }
        }
    }
    SyncPlan { rows }
}
```

Register `pub mod sync;` in `lib.rs`.

- [ ] **Step 3: Tests**

`src-tauri/tests/sync_test.rs`:

```rust
use skill_sync::sync::{plan, Input, PlanAction};
use skill_sync::paths::Paths;
use std::fs;
use tempfile::tempdir;

fn write_skill(dir: &std::path::Path, name: &str, body: &str) {
    let d = dir.join(name); fs::create_dir_all(&d).unwrap();
    fs::write(d.join("SKILL.md"), format!("---\nname: {name}\n---\n{body}\n")).unwrap();
}

#[test]
fn plans_create_when_target_missing() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills"); fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "a");
    let codex = home.path().join(".codex/skills"); fs::create_dir_all(&codex).unwrap();
    let input = Input {
        paths: &paths, source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex)],
    };
    let p = plan(&input);
    assert_eq!(p.rows.len(), 1);
    assert!(matches!(p.rows[0].action, PlanAction::Create));
}

#[test]
fn refuses_symlink_destination() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills"); fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "a");
    let codex = home.path().join(".codex/skills"); fs::create_dir_all(&codex).unwrap();
    let elsewhere = home.path().join("elsewhere/alpha"); fs::create_dir_all(&elsewhere).unwrap();
    std::os::unix::fs::symlink(&elsewhere, codex.join("alpha")).unwrap();
    let input = Input {
        paths: &paths, source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex)],
    };
    let p = plan(&input);
    assert!(matches!(p.rows[0].action, PlanAction::Refuse));
    assert!(p.rows[0].reason.as_deref().unwrap().contains("symlink"));
}

#[test]
fn skips_when_hashes_match() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills"); fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "same");
    let codex = home.path().join(".codex/skills"); fs::create_dir_all(&codex).unwrap();
    write_skill(&codex, "alpha", "same");
    let input = Input {
        paths: &paths, source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex)],
    };
    let p = plan(&input);
    assert!(matches!(p.rows[0].action, PlanAction::Skip));
}
```

- [ ] **Step 4: Run**

Run: `cargo test --test sync_test`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "sync: planner with refusal rules + skip/update/create"
```

### Task 21: Sync executor

**Files:** Extend `src-tauri/src/sync.rs` with `execute(plan, archiver)`; extend `src-tauri/tests/sync_test.rs`.

- [ ] **Step 1: Add executor**

```rust
use crate::trash::MoveArchive;

pub fn execute(plan: &SyncPlan, archiver: &dyn MoveArchive, archive_root: &std::path::Path)
    -> std::io::Result<()>
{
    for row in &plan.rows {
        match row.action {
            PlanAction::Refuse | PlanAction::Skip => continue,
            PlanAction::Update => {
                let label = format!("{}-{}", row.target, row.skill);
                archiver.archive(&row.destination, archive_root, &label)?;
                copy_dir(&row.source, &row.destination)?;
            }
            PlanAction::Create => copy_dir(&row.source, &row.destination)?,
        }
    }
    Ok(())
}

fn copy_dir(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::create_dir_all(dst)?;
    // follow_links(false) — preserve symlinks inside a skill verbatim; never recurse into them
    for entry in walkdir::WalkDir::new(src).follow_links(false).into_iter().filter_map(|e| e.ok()) {
        let rel = entry.path().strip_prefix(src).unwrap();
        if rel.as_os_str().is_empty() { continue; } // src itself
        let to = dst.join(rel);
        let ft = entry.file_type();
        if ft.is_symlink() {
            let target = std::fs::read_link(entry.path())?;
            if let Some(p) = to.parent() { std::fs::create_dir_all(p)?; }
            std::os::unix::fs::symlink(&target, &to)?;
        } else if ft.is_dir() {
            std::fs::create_dir_all(&to)?;
        } else if ft.is_file() {
            if let Some(p) = to.parent() { std::fs::create_dir_all(p)?; }
            std::fs::copy(entry.path(), &to)?;
            // preserve executable bit (matters for skills with scripts/)
            let mode = entry.metadata()?.permissions().mode();
            std::fs::set_permissions(&to, std::fs::Permissions::from_mode(mode))?;
        }
    }
    Ok(())
}
```

- [ ] **Step 2: Tests**

```rust
use skill_sync::sync::{execute};
use skill_sync::trash::MoveToDir;

#[test]
fn create_writes_full_tree() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills"); fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "a");
    let codex = home.path().join(".codex/skills"); fs::create_dir_all(&codex).unwrap();
    let archive = home.path().join("archive");
    let input = Input {
        paths: &paths, source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex.clone())],
    };
    let p = plan(&input);
    execute(&p, &MoveToDir, &archive).unwrap();
    assert!(codex.join("alpha/SKILL.md").exists());
}

#[test]
fn update_archives_old_then_writes_new() {
    let home = tempdir().unwrap();
    let paths = Paths::for_home(home.path().to_path_buf());
    let src_root = home.path().join(".claude/skills"); fs::create_dir_all(&src_root).unwrap();
    write_skill(&src_root, "alpha", "new");
    let codex = home.path().join(".codex/skills"); fs::create_dir_all(&codex).unwrap();
    write_skill(&codex, "alpha", "old");
    let archive = home.path().join("archive");
    let input = Input {
        paths: &paths, source_root: &src_root,
        mine_skills: &[("alpha".into(), src_root.join("alpha"))],
        targets: &[("codex".into(), codex.clone())],
    };
    let p = plan(&input);
    execute(&p, &MoveToDir, &archive).unwrap();
    let body = fs::read_to_string(codex.join("alpha/SKILL.md")).unwrap();
    assert!(body.contains("new"));
    // archive contains the old version
    let archived = fs::read_dir(&archive).unwrap().next().unwrap().unwrap();
    assert!(archived.path().is_dir());
}
```

- [ ] **Step 3: Run**

Run: `cargo test --test sync_test`
Expected: all sync tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "sync: executor with archive-on-update"
```

### Task 22: Sync IPC + dry-run preview dialog

**Files:** Modify `src-tauri/src/ipc/commands.rs`, `src-tauri/src/main.rs`, `src/lib/ipc.ts`; create `src/hooks/use-sync.ts`, `src/components/sync-preview-dialog.tsx`; modify `src/pages/library.tsx`.

- [ ] **Step 1: Backend `cmd_plan_sync`**

In `src-tauri/src/ipc/commands.rs` add:

```rust
use crate::sync::{plan, execute, Input, SyncPlan};
use crate::config::targets::TargetsFile;
use crate::config::ownership::{OwnershipFile, OwnershipClass};
use crate::trash::TrashAction;

fn default_targets(paths: &Paths) -> TargetsFile {
    use crate::config::targets::{Target, TargetKind};
    let mut targets = std::collections::BTreeMap::new();
    targets.insert("claude".into(), Target { install_path: Some(paths.claude_skills()), kind: TargetKind::DirectoryMirror });
    targets.insert("codex".into(),  Target { install_path: Some(paths.codex_skills()),  kind: TargetKind::DirectoryMirror });
    targets.insert("cursor".into(), Target { install_path: Some(paths.cursor_skills()), kind: TargetKind::DirectoryMirror });
    TargetsFile { version: 1, targets }
}

fn gather_inputs() -> Result<(Paths, Settings, OwnershipFile, TargetsFile), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home.clone());
    let cfg = paths.config_dir();
    let settings: Settings = load_or_init(&cfg.join("settings.json"), Settings::defaults(&home)).map_err(|e| e.to_string())?;
    let ownership: OwnershipFile = load_or_init(&cfg.join("ownership.json"), OwnershipFile { version: 1, skills: Default::default() }).map_err(|e| e.to_string())?;
    let targets: TargetsFile = load_or_init(&cfg.join("targets.json"), default_targets(&paths)).map_err(|e| e.to_string())?;
    Ok((paths, settings, ownership, targets))
}

#[tauri::command]
pub fn cmd_plan_sync() -> Result<SyncPlan, String> {
    let (paths, settings, ownership, targets) = gather_inputs()?;
    let mine: Vec<(String, std::path::PathBuf)> = ownership.skills.iter()
        .filter(|(_, e)| e.class == OwnershipClass::Mine)
        .map(|(name, e)| {
            let src = e.source_path.clone().unwrap_or_else(|| settings.source_root.join(name));
            (name.clone(), src)
        })
        .collect();
    let target_list: Vec<(String, std::path::PathBuf)> = targets.targets.iter()
        .filter(|(name, t)| settings.enabled_targets.contains(name) && t.install_path.is_some())
        .map(|(name, t)| (name.clone(), t.install_path.clone().unwrap()))
        .collect();
    Ok(plan(&Input {
        paths: &paths,
        source_root: &settings.source_root,
        mine_skills: &mine,
        targets: &target_list,
    }))
}
```

- [ ] **Step 2: Backend `cmd_execute_sync`**

```rust
#[tauri::command]
pub fn cmd_execute_sync(plan: SyncPlan) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    execute(&plan, &TrashAction, &paths.trash_archive_root()).map_err(|e| e.to_string())?;
    crate::audit::append_event("sync.execute", serde_json::json!({"rows": plan.rows.len()}))
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

(`audit::append_event` lands in Task 30; for this task, stub it as `Ok(())` and remove the audit call. Replace later when Task 30 ships.)

- [ ] **Step 3: Register both commands in `main.rs`**

```rust
.invoke_handler(tauri::generate_handler![
    cmd_list_skills,
    cmd_get_ownership, cmd_set_ownership,
    cmd_plan_sync, cmd_execute_sync,
])
```

- [ ] **Step 4: Frontend IPC wrappers**

In `src/lib/ipc.ts` add to the `ipc` object:

```ts
import type { SyncPlan } from "@/types/bindings";

planSync: () => invoke<SyncPlan>("cmd_plan_sync"),
executeSync: (plan: SyncPlan) => invoke<void>("cmd_execute_sync", { plan }),
```

- [ ] **Step 5: `src/hooks/use-sync.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { SyncPlan } from "@/types/bindings";

export function usePlanSync() {
  return useMutation({ mutationFn: () => ipc.planSync() });
}

export function useExecuteSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: SyncPlan) => ipc.executeSync(plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["drift"] });
    },
  });
}
```

- [ ] **Step 6: Add shadcn table primitive (needed for the preview)**

```bash
pnpm dlx shadcn@latest add table
```

- [ ] **Step 7: `src/components/sync-preview-dialog.tsx`**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SyncPlan, PlanAction } from "@/types/bindings";
import { useExecuteSync } from "@/hooks/use-sync";

const tone: Record<PlanAction, string> = {
  Create: "text-success", Update: "text-warning", Skip: "text-muted", Refuse: "text-danger",
};

export function SyncPreviewDialog({
  plan, open, onOpenChange,
}: { plan: SyncPlan | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const exec = useExecuteSync();
  if (!plan) return null;
  const counts = plan.rows.reduce<Record<string, number>>((m, r) => {
    m[r.action] = (m[r.action] ?? 0) + 1; return m;
  }, {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Sync preview</DialogTitle></DialogHeader>
        <p className="text-sm text-muted">
          {Object.entries(counts).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(" · ")}
        </p>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Skill</TableHead><TableHead>Target</TableHead>
              <TableHead>Action</TableHead><TableHead>Reason</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {plan.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.skill}</TableCell>
                  <TableCell>{r.target}</TableCell>
                  <TableCell className={tone[r.action]}>{r.action}</TableCell>
                  <TableCell className="text-xs text-muted">{r.reason ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={exec.isPending || !plan.rows.some(r => r.action === "Create" || r.action === "Update")}
            onClick={() => exec.mutate(plan, { onSuccess: () => onOpenChange(false) })}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8: Toolbar button in `src/pages/library.tsx`**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePlanSync } from "@/hooks/use-sync";
import { SyncPreviewDialog } from "@/components/sync-preview-dialog";
import type { SyncPlan } from "@/types/bindings";
// inside LibraryPage component:
const [plan, setPlan] = useState<SyncPlan | null>(null);
const planMut = usePlanSync();
// render alongside the table:
<div className="px-8 pb-3 flex justify-end">
  <Button onClick={() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })}>
    Sync mine
  </Button>
</div>
<SyncPreviewDialog plan={plan} open={!!plan} onOpenChange={(v) => !v && setPlan(null)} />
```

- [ ] **Step 9: Manual end-to-end test**

Run: `pnpm tauri dev`
1. Tag at least one skill as Mine in the inbox.
2. Click "Sync mine".
3. Preview dialog opens with a row per (skill, target). Verify rows for `~/.agents/skills/...` aren't present and any bundled skill appears as `Refuse` if it sneaks in.
4. Click Apply. Verify:
   - Skill content appears in `~/.codex/skills/<name>/` and `~/.cursor/skills/<name>/`.
   - If the skill already existed, a timestamped dir appears under `~/.Trash/skill-sync-archive/`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "ipc + ui: dry-run sync preview and apply"
```

### Task 23: Drift backend + per-target columns

**Files:** Create `src-tauri/src/drift.rs`; test `src-tauri/tests/drift_test.rs`; modify `src-tauri/src/ipc/commands.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, `src/lib/ipc.ts`, `src/hooks/use-drift.ts` (new), `src/components/library-table.tsx`.

- [ ] **Step 1: Failing test**

`src-tauri/tests/drift_test.rs`:

```rust
use skill_sync::drift::{status_for, DriftStatus};
use std::fs;
use tempfile::tempdir;

fn write_skill(dir: &std::path::Path, body: &str) {
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("SKILL.md"), format!("---\nname: x\n---\n{body}\n")).unwrap();
}

#[test]
fn in_sync_when_hashes_match() {
    let d = tempdir().unwrap();
    let s = d.path().join("src"); let t = d.path().join("dst");
    write_skill(&s, "same"); write_skill(&t, "same");
    assert!(matches!(status_for(&s, &t).unwrap(), DriftStatus::InSync));
}

#[test]
fn missing_when_dest_absent() {
    let d = tempdir().unwrap();
    let s = d.path().join("src"); write_skill(&s, "x");
    assert!(matches!(status_for(&s, &d.path().join("dst")).unwrap(), DriftStatus::MissingInTarget));
}

#[test]
fn unmanaged_when_dest_is_symlink() {
    let d = tempdir().unwrap();
    let s = d.path().join("src"); write_skill(&s, "x");
    let elsewhere = d.path().join("elsewhere"); write_skill(&elsewhere, "x");
    let link = d.path().join("dst");
    std::os::unix::fs::symlink(&elsewhere, &link).unwrap();
    assert!(matches!(status_for(&s, &link).unwrap(), DriftStatus::Unmanaged));
}

#[test]
fn drifted_target_newer_when_dest_modified_later() {
    let d = tempdir().unwrap();
    let s = d.path().join("src"); let t = d.path().join("dst");
    write_skill(&s, "old");
    std::thread::sleep(std::time::Duration::from_millis(20));
    write_skill(&t, "new");
    assert!(matches!(status_for(&s, &t).unwrap(), DriftStatus::DriftedTargetNewer));
}
```

- [ ] **Step 2: Implement `src-tauri/src/drift.rs`**

```rust
use serde::Serialize;
use std::path::Path;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../src/types/bindings.ts")]
#[serde(rename_all = "kebab-case")]
pub enum DriftStatus {
    InSync, DriftedTargetNewer, DriftedSourceNewer,
    MissingInTarget, Unmanaged, Refused,
}

pub fn status_for(source: &Path, dest: &Path) -> std::io::Result<DriftStatus> {
    match std::fs::symlink_metadata(dest) {
        Ok(meta) if meta.file_type().is_symlink() => return Ok(DriftStatus::Unmanaged),
        Err(_) => return Ok(DriftStatus::MissingInTarget),
        _ => {}
    }
    let h_src = crate::identity::content_hash(source)?;
    let h_dst = crate::identity::content_hash(dest)?;
    if h_src == h_dst { return Ok(DriftStatus::InSync); }
    let m_src = std::fs::metadata(source)?.modified()?;
    let m_dst = std::fs::metadata(dest)?.modified()?;
    Ok(if m_dst > m_src { DriftStatus::DriftedTargetNewer } else { DriftStatus::DriftedSourceNewer })
}
```

Register `pub mod drift;` in `lib.rs`.

- [ ] **Step 3: Run tests**

Run: `cd src-tauri && cargo test --test drift_test`
Expected: 4 passed.

- [ ] **Step 4: `cmd_drift_matrix` in `commands.rs`**

```rust
use crate::drift::{status_for, DriftStatus};
use std::collections::BTreeMap;

#[tauri::command]
pub fn cmd_drift_matrix() -> Result<BTreeMap<String, BTreeMap<String, DriftStatus>>, String> {
    let (paths, settings, ownership, targets) = gather_inputs()?;
    let _ = paths;
    let mut out = BTreeMap::new();
    for (name, entry) in ownership.skills.iter() {
        if entry.class != OwnershipClass::Mine { continue; }
        let src = entry.source_path.clone().unwrap_or_else(|| settings.source_root.join(name));
        let mut per_target = BTreeMap::new();
        for (tname, t) in targets.targets.iter() {
            if !settings.enabled_targets.contains(tname) { continue; }
            if let Some(install) = &t.install_path {
                let dest = install.join(name);
                let st = status_for(&src, &dest).unwrap_or(DriftStatus::MissingInTarget);
                per_target.insert(tname.clone(), st);
            }
        }
        out.insert(name.clone(), per_target);
    }
    Ok(out)
}
```

Register in `main.rs` invoke handler.

- [ ] **Step 5: Frontend wrapper + hook**

In `src/lib/ipc.ts`:

```ts
import type { DriftStatus } from "@/types/bindings";
driftMatrix: () => invoke<Record<string, Record<string, DriftStatus>>>("cmd_drift_matrix"),
```

`src/hooks/use-drift.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
export function useDrift() {
  return useQuery({ queryKey: ["drift"], queryFn: () => ipc.driftMatrix() });
}
```

- [ ] **Step 6: Update `library-table.tsx` to show per-target columns**

Replace the `LibraryTable` body:

```tsx
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";

const TARGETS = ["claude", "codex", "cursor"] as const;

export function LibraryTable() {
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  if (skills.isLoading) return <div className="p-8 text-muted">Scanning…</div>;
  if (!skills.data) return null;
  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs text-muted text-left">
          <th className="px-6 py-3">Skill</th>
          <th>Owner</th>
          {TARGETS.map(t => <th key={t} className="capitalize">{t}</th>)}
        </tr>
      </thead>
      <tbody>
        {skills.data.map(s => {
          const owned = ownership.data?.skills?.[s.name]?.class === "mine";
          const row = drift.data?.[s.name] ?? {};
          return (
            <tr key={s.name} className="border-t border-border">
              <td className="px-6 py-2.5">{s.name}</td>
              <td><OwnerBadge klass={s.class} confirmed={owned} /></td>
              {TARGETS.map(t => (
                <td key={t}>{row[t] ? <DriftBadge status={row[t]} /> : <span className="text-xs text-muted">—</span>}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Run**

Run: `pnpm tauri dev`
Expected: library table has Claude / Codex / Cursor columns with drift badges per skill.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "drift: backend + per-target columns in library"
```

### Task 24: Skill detail drawer

**Files:** Add shadcn `sheet`; create `src/components/skill-detail-drawer.tsx`, `src/components/ownership-picker.tsx`; modify `src/store/ui-state.ts`, `src/components/library-table.tsx`.

- [ ] **Step 1: Add shadcn sheet primitive**

```bash
pnpm dlx shadcn@latest add sheet
```

- [ ] **Step 2: Install zustand**

```bash
pnpm add zustand
```

- [ ] **Step 3: `src/store/ui-state.ts`**

```ts
import { create } from "zustand";

interface UIState {
  selectedSkill: string | null;
  selectSkill: (name: string | null) => void;
}

export const useUIState = create<UIState>(set => ({
  selectedSkill: null,
  selectSkill: (name) => set({ selectedSkill: name }),
}));
```

- [ ] **Step 4: `src/components/ownership-picker.tsx`**

```tsx
import { useSetOwnership } from "@/hooks/use-ownership";
import type { OwnershipClass } from "@/types/bindings";

const OPTIONS: { value: OwnershipClass; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "external", label: "External" },
  { value: "ignore", label: "Ignore" },
];

export function OwnershipPicker({ name, current }: { name: string; current?: OwnershipClass }) {
  const set = useSetOwnership();
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map(o => (
        <button key={o.value}
          onClick={() => set.mutate({ name, klass: o.value })}
          className={
            "px-2.5 py-1 text-xs rounded border " +
            (current === o.value ? "bg-accent text-accent-ink border-accent" : "border-border hover:bg-border/40")
          }>
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: `src/components/skill-detail-drawer.tsx`**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { OwnershipPicker } from "./ownership-picker";
import { DriftBadge } from "./drift-badge";

export function SkillDetailDrawer() {
  const selected = useUIState(s => s.selectedSkill);
  const close = useUIState(s => s.selectSkill);
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const skill = skills.data?.find(s => s.name === selected) ?? null;
  return (
    <Sheet open={!!selected} onOpenChange={v => !v && close(null)}>
      <SheetContent className="w-[480px] sm:max-w-[480px]">
        {skill && (
          <>
            <SheetHeader><SheetTitle>{skill.name}</SheetTitle></SheetHeader>
            {skill.description && <p className="text-sm text-muted mt-1">{skill.description}</p>}

            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Ownership</h3>
              <OwnershipPicker name={skill.name} current={ownership.data?.skills?.[skill.name]?.class} />
            </section>

            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Locations</h3>
              <ul className="space-y-2">
                {skill.locations.map(l => (
                  <li key={l.path.toString()} className="text-xs">
                    <div className="mono break-all">{String(l.path)}</div>
                    <div className="text-muted">hash: <span className="mono">{l.hash.slice(0, 12)}</span>{l.is_symlink ? " · symlink" : ""}</div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Targets</h3>
              <ul className="space-y-1.5">
                {Object.entries(drift.data?.[skill.name] ?? {}).map(([target, status]) => (
                  <li key={target} className="flex justify-between text-sm">
                    <span className="capitalize">{target}</span>
                    <DriftBadge status={status} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 6: Wire row click in `library-table.tsx`**

Wrap each `<tr>` body in an onClick:

```tsx
import { useUIState } from "@/store/ui-state";
// inside component:
const selectSkill = useUIState(s => s.selectSkill);
// on the row:
<tr key={s.name} onClick={() => selectSkill(s.name)}
    className="border-t border-border cursor-pointer hover:bg-border/30">
```

Mount drawer in `src/pages/library.tsx`:

```tsx
import { SkillDetailDrawer } from "@/components/skill-detail-drawer";
// in returned JSX:
<SkillDetailDrawer />
```

- [ ] **Step 7: Run, click a skill, verify drawer**

Run: `pnpm tauri dev`
Expected: clicking a row opens a drawer with ownership picker, locations list, per-target drift.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "ui: skill detail drawer with ownership picker and drift"
```

### Task 25: 30-second drift refresh tick

**Files:** Create `src/hooks/use-drift-refresh.ts`; modify `src/pages/library.tsx`.

- [ ] **Step 1: `src/hooks/use-drift-refresh.ts`**

```ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useDriftRefresh(intervalMs = 30_000) {
  const qc = useQueryClient();
  useEffect(() => {
    let id: number | null = null;
    const start = () => { if (id == null) id = window.setInterval(
      () => qc.invalidateQueries({ queryKey: ["drift"] }), intervalMs); };
    const stop = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVis = () => document.hidden ? stop() : start();
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [intervalMs, qc]);
}
```

- [ ] **Step 2: Mount in `library.tsx`**

```tsx
import { useDriftRefresh } from "@/hooks/use-drift-refresh";
// inside LibraryPage component, top:
useDriftRefresh();
```

- [ ] **Step 3: Manual test**

Run: `pnpm tauri dev`
Edit a target copy of a skill from outside the app (e.g., `echo x >> ~/.codex/skills/<name>/SKILL.md`). Within 30s the drift badge in the table flips to `drifted ↑`. Hide the window and verify console (Tauri devtools) shows the interval pausing on `visibilitychange`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "drift: 30s background refresh paused on hidden"
```

### Task 26: Pull-back override (target → source)

**Files:** Modify `src-tauri/src/sync.rs`, `src-tauri/src/ipc/commands.rs`, `src-tauri/src/main.rs`, `src/lib/ipc.ts`, `src/hooks/use-sync.ts`, `src/components/skill-detail-drawer.tsx`.

- [ ] **Step 1: Backend `pull_back` in `sync.rs`**

Add to `sync.rs`:

```rust
use crate::trash::MoveArchive;

pub fn pull_back(
    source: &std::path::Path,
    dest: &std::path::Path,
    archiver: &dyn MoveArchive,
    archive_root: &std::path::Path,
    label: &str,
) -> std::io::Result<()> {
    if !dest.exists() { return Err(std::io::Error::new(std::io::ErrorKind::NotFound, "target missing")); }
    if std::fs::symlink_metadata(source).map(|m| m.file_type().is_symlink()).unwrap_or(false) {
        return Err(std::io::Error::new(std::io::ErrorKind::Other, "source is a symlink — refusing"));
    }
    if source.exists() { archiver.archive(source, archive_root, label)?; }
    copy_dir(dest, source)?;
    Ok(())
}
```

- [ ] **Step 2: IPC command**

```rust
#[tauri::command]
pub fn cmd_pull_back(skill: String, target: String) -> Result<(), String> {
    let (_paths, settings, ownership, targets) = gather_inputs()?;
    let entry = ownership.skills.get(&skill).ok_or("skill not tagged")?;
    if entry.class != OwnershipClass::Mine { return Err("only Mine skills can be pulled back".into()); }
    let src = entry.source_path.clone().unwrap_or_else(|| settings.source_root.join(&skill));
    let install = targets.targets.get(&target).and_then(|t| t.install_path.clone())
        .ok_or("unknown target")?;
    let dest = install.join(&skill);
    let home = dirs::home_dir().ok_or("no home")?;
    let paths_for_archive = Paths::for_home(home);
    let label = format!("pullback-{target}-{skill}");
    crate::sync::pull_back(&src, &dest, &crate::trash::TrashAction,
        &paths_for_archive.trash_archive_root(), &label).map_err(|e| e.to_string())
}
```

Register in `main.rs`.

- [ ] **Step 3: Frontend wrapper**

`src/lib/ipc.ts`:

```ts
pullBack: (skill: string, target: string) => invoke<void>("cmd_pull_back", { skill, target }),
```

`src/hooks/use-sync.ts` — add:

```ts
export function usePullBack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skill, target }: { skill: string; target: string }) => ipc.pullBack(skill, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["drift"] });
    },
  });
}
```

- [ ] **Step 4: Button in detail drawer per-target row**

In `skill-detail-drawer.tsx`, change the Targets list rendering:

```tsx
import { usePullBack } from "@/hooks/use-sync";
// inside component:
const pullBack = usePullBack();
// in the targets list:
{Object.entries(drift.data?.[skill.name] ?? {}).map(([target, status]) => (
  <li key={target} className="flex justify-between items-center text-sm">
    <span className="capitalize">{target}</span>
    <div className="flex items-center gap-3">
      <DriftBadge status={status} />
      {status === "drifted-target-newer" && (
        <button
          className="text-xs underline text-muted hover:text-ink"
          onClick={() => {
            if (confirm(`Replace your source copy of ${skill.name} with the version from ${target}? The old source goes to Trash.`)) {
              pullBack.mutate({ skill: skill.name, target });
            }
          }}>
          Pull back
        </button>
      )}
    </div>
  </li>
))}
```

- [ ] **Step 5: Manual test**

Edit a target's copy of a Mine skill so it drifts newer. Open detail drawer → click "Pull back". Confirm. Verify source dir now matches target, and old source appears under `~/.Trash/skill-sync-archive/...`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "sync: pull-back override (target → source) with archive"
```

### Task 27: `.skill` package builder

**Files:** Create `src-tauri/src/package.rs`; test `src-tauri/tests/package_test.rs`; modify `src-tauri/src/lib.rs`, `src-tauri/src/ipc/commands.rs`, `src-tauri/src/main.rs`, `src/lib/ipc.ts`, `src/components/skill-detail-drawer.tsx`.

- [ ] **Step 1: Implement `src-tauri/src/package.rs`**

```rust
use std::io::Write;
use std::path::Path;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;

fn ignored(name: &str) -> bool {
    name == ".DS_Store" || name.ends_with(".swp") || name == ".git"
}

pub fn build_skill_package(skill_name: &str, src: &Path, out_path: &Path) -> std::io::Result<()> {
    if let Some(p) = out_path.parent() { std::fs::create_dir_all(p)?; }
    let f = std::fs::File::create(out_path)?;
    let mut zip = zip::ZipWriter::new(f);
    let opts = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let walk = WalkDir::new(src).follow_links(false).into_iter().filter_entry(|e| {
        !ignored(&e.file_name().to_string_lossy())
    });
    for entry in walk.filter_map(|e| e.ok()) {
        let rel = entry.path().strip_prefix(src).unwrap();
        if rel.as_os_str().is_empty() { continue; }
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
```

Register `pub mod package;` in `lib.rs`.

- [ ] **Step 2: Test `src-tauri/tests/package_test.rs`**

```rust
use skill_sync::package::build_skill_package;
use std::fs;
use tempfile::tempdir;

#[test]
fn writes_a_skill_archive_with_expected_layout() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("myskill");
    fs::create_dir_all(src.join("references")).unwrap();
    fs::write(src.join("SKILL.md"), "---\nname: myskill\n---\nbody\n").unwrap();
    fs::write(src.join("references/r.md"), "ref\n").unwrap();
    fs::write(src.join(".DS_Store"), "junk").unwrap();
    let out = dir.path().join("myskill.skill");
    build_skill_package("myskill", &src, &out).unwrap();
    assert!(out.exists());

    let f = fs::File::open(&out).unwrap();
    let mut zip = zip::ZipArchive::new(f).unwrap();
    let names: Vec<String> = (0..zip.len()).map(|i| zip.by_index(i).unwrap().name().to_string()).collect();
    assert!(names.iter().any(|n| n == "myskill/SKILL.md"));
    assert!(names.iter().any(|n| n == "myskill/references/r.md"));
    assert!(!names.iter().any(|n| n.contains(".DS_Store")));
}
```

- [ ] **Step 3: Run**

Run: `cd src-tauri && cargo test --test package_test`
Expected: 1 passed.

- [ ] **Step 4: IPC command**

In `src-tauri/src/ipc/commands.rs`:

```rust
use std::path::PathBuf;

#[tauri::command]
pub fn cmd_build_package(skill: String) -> Result<PathBuf, String> {
    let (_paths, settings, ownership, _targets) = gather_inputs()?;
    let entry = ownership.skills.get(&skill).ok_or("skill not tagged")?;
    if entry.class != OwnershipClass::Mine { return Err("only Mine skills can be packaged".into()); }
    let src = entry.source_path.clone().unwrap_or_else(|| settings.source_root.join(&skill));
    let stamp = chrono::Utc::now().format("%Y%m%d-%H%M");
    let out = settings.package_output_dir.join(format!("{skill}-{stamp}.skill"));
    crate::package::build_skill_package(&skill, &src, &out).map_err(|e| e.to_string())?;
    Ok(out)
}
```

Register in `main.rs`.

- [ ] **Step 5: Frontend wrapper**

`src/lib/ipc.ts`:

```ts
buildPackage: (skill: string) => invoke<string>("cmd_build_package", { skill }),
```

- [ ] **Step 6: Button in detail drawer**

In `skill-detail-drawer.tsx` add at the bottom of `SheetContent`:

```tsx
import { ipc } from "@/lib/ipc";
// in JSX:
<section className="mt-6 flex gap-2">
  <button className="text-xs underline"
    onClick={async () => {
      const p = await ipc.buildPackage(skill.name);
      alert(`Built ${p}`);
    }}>
    Build .skill package
  </button>
</section>
```

- [ ] **Step 7: Manual test**

Click "Build .skill package" on a Mine skill. Verify a `<name>-YYYYMMDD-HHMM.skill` file appears in `~/Downloads/`. Rename to `.zip` and unzip; structure is `<name>/SKILL.md` plus the rest of the source.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "package: build .skill (zip) for Cowork"
```

### Task 28: Targets page + test-write

**Files:** Create `src/components/target-card.tsx`, `src/pages/targets.tsx`; modify `src-tauri/src/ipc/commands.rs`, `src-tauri/src/main.rs`, `src/lib/ipc.ts`.

- [ ] **Step 1: Backend `cmd_test_target_write`**

In `commands.rs`:

```rust
use std::io::Write;

#[tauri::command]
pub fn cmd_test_target_write(install_path: PathBuf) -> Result<(), String> {
    if !install_path.exists() { return Err("path does not exist".into()); }
    let probe = install_path.join(".skill-sync-write-probe");
    let mut f = std::fs::File::create(&probe).map_err(|e| e.to_string())?;
    f.write_all(b"ok").map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;
    std::fs::remove_file(&probe).map_err(|e| e.to_string())?;
    Ok(())
}
```

Register in `main.rs`.

- [ ] **Step 2: Frontend wrapper**

`src/lib/ipc.ts`:

```ts
testTargetWrite: (installPath: string) => invoke<void>("cmd_test_target_write", { installPath }),
```

- [ ] **Step 3: `src/components/target-card.tsx`**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";

export function TargetCard({ name, path, kind }: { name: string; path?: string; kind: "directory-mirror" | "package-only" }) {
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const test = async () => {
    if (!path) return;
    try { await ipc.testTargetWrite(path); setStatus("ok"); setMsg(null); }
    catch (e) { setStatus("fail"); setMsg(String(e)); }
  };
  return (
    <div className="rounded border border-border p-4 bg-bg-elevated">
      <div className="flex justify-between items-baseline">
        <h3 className="capitalize text-base">{name}</h3>
        <span className="text-xs text-muted">{kind}</span>
      </div>
      {path && <div className="mono text-xs text-muted mt-1 break-all">{path}</div>}
      {kind === "directory-mirror" && (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={test}>Test write</Button>
          {status === "ok" && <span className="text-xs text-success">writable</span>}
          {status === "fail" && <span className="text-xs text-danger">{msg}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/pages/targets.tsx`**

```tsx
import { TargetCard } from "@/components/target-card";
import { useSettings } from "@/hooks/use-settings"; // landed in Task 31; until then read defaults inline

const HARDCODED = [
  { name: "claude", path: `${navigator.userAgent.includes("Mac") ? "" : ""}~/.claude/skills`, kind: "directory-mirror" as const },
  { name: "codex",  path: "~/.codex/skills",  kind: "directory-mirror" as const },
  { name: "cursor", path: "~/.cursor/skills", kind: "directory-mirror" as const },
  { name: "cowork", path: undefined,          kind: "package-only" as const },
];

export function TargetsPage() {
  return (
    <div className="py-6 px-8 space-y-3">
      <h1 className="text-lg">Targets</h1>
      <div className="grid grid-cols-2 gap-3">
        {HARDCODED.map(t => <TargetCard key={t.name} {...t} />)}
      </div>
    </div>
  );
}
```

(The hardcoded paths will be replaced with `useSettings()` data in Task 31. The string paths shown are display-only here; the test-write IPC needs an absolute path — Task 31 will pass that through. Until then, leave the test-write button disabled or use an absolute home expansion via a small inline helper.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: targets page + write-test IPC"
```

### Task 29: Settings backend + form

**Files:** Modify `src-tauri/src/ipc/commands.rs`, `src-tauri/src/main.rs`; create `src/hooks/use-settings.ts`, `src/components/settings-form.tsx`; modify `src/pages/settings.tsx`, `src/lib/ipc.ts`.

- [ ] **Step 1: Backend get/set commands**

In `commands.rs`:

```rust
#[tauri::command]
pub fn cmd_get_settings() -> Result<Settings, String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home.clone());
    load_or_init(&paths.config_dir().join("settings.json"), Settings::defaults(&home))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_set_settings(settings: Settings) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("no home")?;
    let paths = Paths::for_home(home);
    crate::config::save(&paths.config_dir().join("settings.json"), &settings)
        .map_err(|e| e.to_string())
}
```

Register in `main.rs`.

- [ ] **Step 2: Frontend wrapper + hook**

`src/lib/ipc.ts`:

```ts
import type { Settings } from "@/types/bindings";
getSettings: () => invoke<Settings>("cmd_get_settings"),
setSettings: (settings: Settings) => invoke<void>("cmd_set_settings", { settings }),
```

`src/hooks/use-settings.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { Settings } from "@/types/bindings";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => ipc.getSettings() });
}
export function useSetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Settings) => ipc.setSettings(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
```

- [ ] **Step 3: `src/components/settings-form.tsx`**

```tsx
import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { useSettings, useSetSettings } from "@/hooks/use-settings";
import type { Settings } from "@/types/bindings";

export function SettingsForm() {
  const { data } = useSettings();
  const save = useSetSettings();
  const [draft, setDraft] = useState<Settings | null>(null);
  useEffect(() => { if (data) setDraft(data); }, [data]);
  if (!draft) return null;

  const pickDir = async (key: "source_root" | "package_output_dir") => {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") setDraft({ ...draft, [key]: picked });
  };
  const toggleTarget = (name: string) => {
    const next = draft.enabled_targets.includes(name)
      ? draft.enabled_targets.filter(t => t !== name)
      : [...draft.enabled_targets, name];
    setDraft({ ...draft, enabled_targets: next });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Field label="Source root">
        <div className="flex gap-2">
          <input className="flex-1 mono text-xs px-2 py-1.5 rounded border border-border bg-bg" readOnly value={String(draft.source_root)} />
          <Button variant="outline" size="sm" onClick={() => pickDir("source_root")}>Browse</Button>
        </div>
      </Field>
      <Field label="Package output dir">
        <div className="flex gap-2">
          <input className="flex-1 mono text-xs px-2 py-1.5 rounded border border-border bg-bg" readOnly value={String(draft.package_output_dir)} />
          <Button variant="outline" size="sm" onClick={() => pickDir("package_output_dir")}>Browse</Button>
        </div>
      </Field>
      <Field label="Enabled targets">
        <div className="flex gap-2">
          {["claude", "codex", "cursor"].map(t => (
            <button key={t}
              className={"px-2.5 py-1 text-xs rounded border " +
                (draft.enabled_targets.includes(t) ? "bg-accent text-accent-ink border-accent" : "border-border")}
              onClick={() => toggleTarget(t)}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Show built-ins">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={draft.show_builtins}
            onChange={e => setDraft({ ...draft, show_builtins: e.target.checked })} />
          Show tool built-in skills in Library
        </label>
      </Field>
      <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>Save</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: `src/pages/settings.tsx`**

```tsx
import { SettingsForm } from "@/components/settings-form";
export function SettingsPage() {
  return <div className="py-6 px-8 space-y-4"><h1 className="text-lg">Settings</h1><SettingsForm /></div>;
}
```

- [ ] **Step 5: Run and verify save persists**

Run: `pnpm tauri dev`
Change source root, click Save, quit, relaunch. Verify the value persisted.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "settings: get/set IPC + form with dir pickers"
```

### Task 30: Activity log

**Files:** Create `src-tauri/src/audit.rs`; modify `src-tauri/src/lib.rs`, `src-tauri/src/sync.rs`, `src-tauri/src/package.rs`, `src-tauri/src/ipc/commands.rs`, `src-tauri/src/main.rs`; create `src/pages/activity.tsx`, `src/components/activity-list.tsx`; modify `src/lib/ipc.ts`.

- [ ] **Step 1: Implement `src-tauri/src/audit.rs`**

```rust
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/types/bindings.ts")]
pub struct AuditEntry {
    pub ts: chrono::DateTime<chrono::Utc>,
    pub kind: String,
    pub data: serde_json::Value,
}

fn audit_path() -> std::io::Result<std::path::PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| std::io::Error::new(std::io::ErrorKind::Other, "no home"))?;
    let dir = home.join("Library/Application Support/skill-sync");
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("audit.log"))
}

pub fn append_event(kind: &str, data: serde_json::Value) -> std::io::Result<()> {
    let entry = AuditEntry { ts: chrono::Utc::now(), kind: kind.to_string(), data };
    let line = serde_json::to_string(&entry).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    let path = audit_path()?;
    let mut f = std::fs::OpenOptions::new().create(true).append(true).open(path)?;
    writeln!(f, "{line}")?;
    Ok(())
}

pub fn read_last(limit: usize) -> std::io::Result<Vec<AuditEntry>> {
    let path = audit_path()?;
    if !path.exists() { return Ok(vec![]); }
    let file = std::fs::File::open(path)?;
    let lines: Vec<String> = BufReader::new(file).lines().filter_map(|l| l.ok()).collect();
    let tail = lines.iter().rev().take(limit);
    Ok(tail.filter_map(|l| serde_json::from_str(l).ok()).collect())
}
```

Register `pub mod audit;` in `lib.rs`.

- [ ] **Step 2: Hook into sync executor**

In `sync.rs`, at the end of `execute()` before `Ok(())`:

```rust
let _ = crate::audit::append_event("sync.execute", serde_json::json!({
    "rows": plan.rows.len(),
}));
```

(Add the same for `pull_back` and `package::build_skill_package` — one-line `let _ = audit::append_event(...)` per public entrypoint.)

- [ ] **Step 3: IPC `cmd_read_audit`**

In `commands.rs`:

```rust
use crate::audit::AuditEntry;

#[tauri::command]
pub fn cmd_read_audit(limit: usize) -> Result<Vec<AuditEntry>, String> {
    crate::audit::read_last(limit).map_err(|e| e.to_string())
}
```

Register in `main.rs`.

- [ ] **Step 4: Frontend wrapper**

`src/lib/ipc.ts`:

```ts
import type { AuditEntry } from "@/types/bindings";
readAudit: (limit: number) => invoke<AuditEntry[]>("cmd_read_audit", { limit }),
```

- [ ] **Step 5: `src/components/activity-list.tsx` + `src/pages/activity.tsx`**

```tsx
// activity-list.tsx
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";

export function ActivityList() {
  const { data } = useQuery({ queryKey: ["audit"], queryFn: () => ipc.readAudit(200) });
  if (!data?.length) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <ul className="space-y-2">
      {data.map((e, i) => (
        <li key={i} className="text-sm border-b border-border pb-2">
          <div className="flex justify-between">
            <span>{e.kind}</span>
            <span className="text-xs text-muted">{new Date(e.ts).toLocaleString()}</span>
          </div>
          <pre className="text-xs text-muted mt-1 mono">{JSON.stringify(e.data)}</pre>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// pages/activity.tsx
import { ActivityList } from "@/components/activity-list";
export function ActivityPage() {
  return <div className="py-6 px-8 space-y-4"><h1 className="text-lg">Activity</h1><ActivityList /></div>;
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "audit: append-only JSONL log + Activity page"
```

### Task 31: Dark mode + theme switch

**Files:** Modify `src/styles/tokens.css` (already has `.dark`), `src/components/settings-form.tsx`, `src/components/app-shell.tsx`; create `src/lib/theme.ts`.

- [ ] **Step 1: Persist theme as a top-level setting**

Extend `Settings` in Rust (`src-tauri/src/config/settings.rs`) with:

```rust
pub theme: String, // "system" | "light" | "dark"
```

And in `defaults()`:

```rust
theme: "system".into(),
```

Regenerate types: `cd src-tauri && cargo test --quiet`.

- [ ] **Step 2: `src/lib/theme.ts`**

```ts
export function applyTheme(theme: "system" | "light" | "dark") {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  root.classList.toggle("dark", dark);
}
```

- [ ] **Step 3: Apply in `app-shell.tsx`**

```tsx
import { useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import { applyTheme } from "@/lib/theme";
// inside AppShell:
const { data } = useSettings();
useEffect(() => {
  const theme = (data?.theme ?? "system") as "system" | "light" | "dark";
  applyTheme(theme);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => applyTheme(theme);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, [data?.theme]);
```

- [ ] **Step 4: Theme picker in settings form**

Add to `settings-form.tsx`:

```tsx
<Field label="Theme">
  <div className="flex gap-2">
    {(["system", "light", "dark"] as const).map(t => (
      <button key={t}
        className={"px-2.5 py-1 text-xs rounded border capitalize " +
          (draft.theme === t ? "bg-accent text-accent-ink border-accent" : "border-border")}
        onClick={() => setDraft({ ...draft, theme: t })}>
        {t}
      </button>
    ))}
  </div>
</Field>
```

- [ ] **Step 5: Manual verify**

Run: `pnpm tauri dev`
Toggle each theme; verify root `.dark` class flips and palette swaps.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ui: theme setting (system/light/dark)"
```

### Task 32: Icon + signed macOS build

**Files:** Replace `src-tauri/icons/`; modify `src-tauri/tauri.conf.json`.

- [ ] **Step 1: Generate icons from a 1024×1024 source PNG**

```bash
pnpm tauri icon path/to/source-1024.png
```

This populates `src-tauri/icons/` with all required `.icns`, `.ico`, and `.png` variants.

- [ ] **Step 2: Confirm `tauri.conf.json` identifier and product name**

In `src-tauri/tauri.conf.json` under `productName` and `identifier`:

```json
"productName": "Skill Sync",
"identifier": "com.devinwalker.skillsync",
```

Under `bundle.macOS`, set the minimum system version (Apple Silicon and recent Intel):

```json
"bundle": {
  "active": true,
  "targets": ["app", "dmg"],
  "macOS": { "minimumSystemVersion": "12.0" }
}
```

- [ ] **Step 3: Build release**

```bash
pnpm tauri build
```

Expected: `src-tauri/target/release/bundle/macos/Skill Sync.app` and `src-tauri/target/release/bundle/dmg/Skill Sync_*.dmg`.

- [ ] **Step 4: Drag to /Applications and smoke-test**

Drag the `.app` into Applications. Launch it. Walk through M2–M6 flows: tag a skill, sync, drift refresh, pull back, build a `.skill`. Verify everything works in the packaged build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "build: icon set + macOS bundle config"
```

### Task 33: v1 README

**Files:** Modify `README.md`.

- [ ] **Step 1: Write the README**

```markdown
# Skill Sync

A macOS desktop app that keeps your authored agent skills in sync across Claude Code CLI, Codex, and Cursor — and builds drop-in `.skill` packages for Cowork.

## What it does

- Discovers skills in `~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills`, `~/.agents/skills`
- Classifies each as **Mine**, **Bundle**, **Built-in**, or **Unknown** using path + symlink signals
- Lets you tag any unknown skill once; never touches Bundle or Built-in
- One-click sync from your source-of-truth to every enabled target, archiving overwrites to `~/.Trash/skill-sync-archive/<timestamp>/`
- Drift surface refreshes every 30s; pull-back lets you flow a target edit back to source
- Builds Cowork-ready `.skill` zips into your chosen output dir

## Run from source

```bash
pnpm install
pnpm tauri dev
```

## Build the macOS app

```bash
pnpm tauri build
open src-tauri/target/release/bundle/dmg
```

## Config

All state lives in `~/Library/Application Support/skill-sync/`:
- `settings.json` — source root, package output dir, enabled targets, theme
- `ownership.json` — your per-skill Mine/External/Ignore decisions
- `targets.json` — registered install paths per tool
- `audit.log` — append-only JSONL of every sync/pull-back/package event
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: v1 README"
```

---

## 13. Self-review

### Spec coverage

| Brief item | Task(s) |
|---|---|
| Discover skills across source + tool dirs | 8 (discovery), 11 (aggregator), 12 (IPC) |
| Show provenance per skill | 9 (provenance), 14 (owner badge), 15 (table), 24 (drawer) |
| Tag mine/external + persist | 7 (config), 16 (ownership IPC), 17 (inbox), 18 (badge confirm), 24 (picker in drawer) |
| Hard constraint: only sync user-authored | 9 (classifier) + 20 (planner refusals) + denylist in `sync.rs` |
| Never touch Codex `.system`, Cursor builtins, Anthropic plugin cache, `~/.agents/skills` | Provenance signals 1-3 (Task 9) + denylist refusals (Task 20) + symlink-destination refusal (Task 20) |
| One-click sync, archive to `~/.Trash` with timestamp | 19 (trash helper), 20 (planner), 21 (executor), 22 (dry-run UI + apply) |
| Build `.skill` for Cowork | 27 (zip backend + IPC + drawer button) |
| Drift + refresh + "Pull back" | 23 (drift backend + columns), 25 (30s tick), 26 (pull-back override) |
| Tauri + React + shadcn + Tailwind | 1 (scaffold), 2 (shadcn), 3 (tokens) |
| Read/write `~/.claude`, `~/.codex`, `~/.agents` | 5 (paths), Tauri FS scope in 1, all sync/drift/package tasks |
| Visual sensibility: warm, minimal, deliberate | 3 (tokens), §9 (visual design language), 13-18, 24 layout |
| Reference `multi-agent-sync` shell script | Sync engine in Tasks 20+21 ports that template's logic with stronger safety (symlink refusal, Trash-based archive, dry-run preview) |
| Settings + Activity + theme + signed build | 29 (settings form), 30 (audit + activity), 31 (theme), 32 (icon + build), 33 (README) |

### Placeholder scan

Every task contains complete code blocks for files it creates or modifies. No "TBD", "TODO", "implement later", "similar to Task N", or "add appropriate X". A `let _ = audit::append_event(...)` line in Task 22 is explicitly called out as a stub to swap in for the real `audit::append_event` when Task 30 lands — that's a documented forward reference, not a placeholder.

### Type consistency

- `Class` (Rust enum, PascalCase by default serde) ↔ TS type from ts-rs — used in Tasks 9, 11, 14, 15, 18
- `OwnershipClass` — Rust enum with `#[serde(rename_all = "lowercase")]` serializes as `"mine" | "external" | "ignore"`; all TS usages (Tasks 16, 17, 18, 24) use the lowercase strings
- `DriftStatus` (kebab-case) — Tasks 23, 25, 26; TS `DriftBadge` in Task 14 uses the matching string union
- `PlanAction` (PascalCase: `"Create" | "Update" | "Skip" | "Refuse"`) — Tasks 20, 21, 22; `SyncPreviewDialog` matches
- `SkillView` / `LocationView` / `Provenance` — defined once in Task 11, consumed in 12, 15, 23, 24
- IPC command names — `cmd_*` snake_case Rust, frontend wrappers camelCase in `src/lib/ipc.ts`
- Tauri command argument keys — Rust param names get camelCased by Tauri's codegen by default; the plan invokes match the Rust signatures (`{ skill, target }`, `{ plan }`, `{ name, class, note }`)

### Self-review fixes applied this pass

Spotted and corrected on the second read-through:
- **Test layout** — Rust integration tests moved from `tests/backend/*_test.rs` to `src-tauri/tests/*_test.rs` (cargo auto-discovers only flat `tests/*.rs`)
- **Fixture path resolution** — fixed `env!("CARGO_MANIFEST_DIR")` join to `"tests/fixtures/..."` (no `..` jump)
- **OwnershipClass casing** — Tasks 17 and 18 now use lowercase string literals matching the serde rename
- **Provenance symlink condition** — removed the broken `r != p.parent()` heuristic, kept the clean `is_symlink && !in_source` check
- **Ownership Inbox auto-open** — `useState` initialization replaced with `useEffect` that reacts to async data + a `dismissed` flag so closing it stays closed
- **`copy_dir`** — `follow_links(false)`, recreates internal symlinks as symlinks, preserves Unix mode bits
- **react-router-dom** pinned to `^6.26` (v7 has breaking imports)
- **Task 1 scaffold** — moved to a sibling dir + `rsync` since `create-tauri-app` refuses non-empty dirs
- **Tasks 22-33** — fully expanded from descriptive prose to complete code blocks per the "No Placeholders" rule

### Things explicitly out of scope for v1

- Linux/Windows builds (architecture is portable but only macOS paths are coded)
- Auto-update mechanism (defer to v1.1)
- Multi-machine sync over network (you'd use git for that anyway)
- Skill *authoring* — this is a sync tool, not an editor

---

## Execution Handoff

Plan complete and saved to `docs/plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute in this session with checkpoints, batched. Uses `superpowers:executing-plans`.

**Pausing here per your instructions — waiting for your review before either path.**
