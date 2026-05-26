# Vibe-Dev Friendly Skill Sync — Design Spec

> Reframe Skill Sync from a developer power tool into a tool that vibe-devs can use to author, organize, and maintain their skill library. Add a new Home page, a Simple/Pro mode toggle, a new-skill scaffolder, git-repo awareness, and friendlier copy throughout. Keep the Console visual system, the Tauri architecture, and the sync engine intact.

- **Date:** 2026-05-25
- **Status:** Draft — awaiting user review
- **Scope:** Frontend + small Rust additions (two new Tauri commands). No changes to the sync engine, ownership model, audit log, or packaging.
- **Builds on:** [`2026-05-25-console-ui-design.md`](./2026-05-25-console-ui-design.md) (the Console aesthetic — kept as the visual system).

---

## 1 · Goal & non-goals

### Goal

Two personas are central: the **skill author / tinkerer** (writes their own skills, iterates, wants to know what propagated) and the **library curator** (has accumulated skills from various places and wants them organized, deduped of orphans, and consistently maintained). Skill Sync should feel approachable to both, while still being available in its full Console-density form for power users.

Concretely:

- A friendly **Home** page that answers "is my library healthy" in plain English.
- A **Simple / Pro** mode toggle that hides the deeper sync mechanics (hashes, refusals, packaging, bundle / built-in distinctions) by default while preserving them for power users.
- A **new-skill scaffolder** so authoring doesn't require leaving Skill Sync.
- **Git-repo awareness** for users whose source-of-truth is a local clone (branch + uncommitted count; read-only — no in-app git commands).
- **Orphan surfacing** (skills present in a tool but missing from source) as a primary attention surface, not buried in drift status.
- **Warmer copy** throughout — replacing developer jargon (drift, audit, refused, bundle) with plain English in Simple mode. Light gardening hints allowed in microcopy; the word "garden" stays out of nav and primary surfaces.
- **Guided 3-step first-run** for new installs (welcome → source folder → pick tools; followed by a brief scanning transition into Home).

### Non-goals

- **No re-skin.** The Console visual system (pitch-black, Geist + Geist Mono, lime accent, hairlines, dense tables) is kept verbatim. The shift is in copy, columns, what's surfaced, and onboarding.
- **No teams / sharing / registry features.** Single-user focus.
- **No in-app markdown editor for SKILL.md.** Scaffolder opens the file in the user's editor.
- **No in-app git commands.** Awareness only — Skill Sync never runs `git commit` / `git push` / `git pull`.
- **No telemetry / analytics added.**
- **No stale / undescribed / duplicate skill detection.** Orphans = "in a tool but not in source" only.
- **No recurring reminder / nudge system.** No notifications. A future iteration may add a weekly check.
- **No real fuzzy ⌘K palette.** Stub remains.
- **No Cowork `.skill` packaging wiring.** Still a follow-up; visible in Pro, disabled with tooltip.
- **No new sync semantics.** Sync engine, ownership model, audit log, archive behavior are untouched.

---

## 2 · Information architecture

### 2.1 Routes

| Route       | Simple label         | Pro label    | Notes                                                                  |
|-------------|----------------------|--------------|------------------------------------------------------------------------|
| `/`         | **Home**             | Home         | NEW landing page (health summary + jump-off). Replaces Library at `/`. |
| `/library`  | **My Skills**        | Library      | Was at `/`. Friendlier columns by default; dense Console columns in Pro. |
| `/targets`  | **Where they sync**  | Targets      | Same page, plainer copy in Simple.                                      |
| `/activity` | **History**          | Activity     | Friendly sentence feed in Simple; dense audit table in Pro.             |
| `/settings` | Settings             | Settings     | Houses the Mode toggle.                                                  |
| `/packages` | *(hidden)*           | **Packages** | Pro-only nav item — surfaces the `.skill` zip builder. Disabled until wired. |

### 2.2 Sidebar

The current Console sidebar (Workspace / Source / Targets / Footer) is kept structurally, with these changes:

- **Workspace** section nav items use the table above. The number badges per nav item are kept.
- **Source** section: under the source path, a new **git status chip** (mono, `branch · N uncommitted`) when the source root is a git repo. Hidden when not a repo. See §10.
- **Targets** section: unchanged.
- **Footer**: `last sync` and `archive` lines unchanged. `build · <sha>` is **Pro only**; in Simple it's hidden.

### 2.3 Default route

- First launch (no `settings.json` yet): the first-run modal blocks the app; on completion, lands on `/` (Home).
- Returning users: same per-session route persistence behavior the app has today.

### 2.4 Visual system

Unchanged from the Console UI spec. Pitch-black canvas, Geist / Geist Mono, lime accent for primary actions and in-sync signals, hairline borders, mono-forward chrome. Tokens, fonts, spacing, motion — all kept. The mode toggle never affects colors, fonts, or layout density rules.

---

## 3 · Simple / Pro mode toggle

### 3.1 Where it lives

Settings page, new top section labeled **Mode**, before the existing Source section. A 2-segment switch: `Simple | Pro`. One-line explainer below: *"Simple hides the deeper sync mechanics. Pro shows everything — hashes, refusals, packaging."*

### 3.2 Storage

`settings.json` gains a `mode: "simple" | "pro"` field.

- New installs (no prior `settings.json`): defaults to `"simple"` (written by first-run flow).
- Existing installs (current Console UI users): on first launch after this ships, migrate to `"pro"` and surface a one-time toast *"We added a Simple mode that hides the deeper details. You're in Pro now."* with `Try Simple` / `Stay in Pro` buttons. See §11.

### 3.3 Runtime exposure

A new `useMode()` hook reads from the existing settings store. Components branch on `mode === "pro"` for **structural decisions only** (which columns to render, whether to show a chip, whether to mount the diff block). Strings — labels, chip text, tooltips, error messages — never live in those branches; they come from `useCopy()` (§3.6). No prop drilling; both hooks are read at the leaf that needs them.

### 3.4 What the toggle gates

Single source of truth:

| Surface                          | Simple                                                                                       | Pro                                                                            |
|----------------------------------|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Sidebar nav                      | Home · My Skills · Where they sync · History                                                 | Home · Library · Targets · Activity · **Packages**                              |
| Page H1s + crumb labels          | Friendly names (see §2.1)                                                                    | Console names                                                                  |
| Library columns                  | Skill · Status · Where it lives · Updated · Actions                                          | Skill · Owner · Targets · Updated · Size · Actions                              |
| DriftBar (per-skill, on Library) | Replaced by Tool-icon-row (icons of each tool, colored by status)                            | DriftBar (4 lanes) with hash-on-hover tooltip                                  |
| Owner badges                     | `Mine` / `Mine · auto` / `Unknown` only                                                      | + Bundle · + Built-in                                                          |
| Refused state                    | Per-tool lane in `ToolIconRow` shows a dim/dashed icon with tooltip *"Skill Sync wouldn't write here — looks like it's installed by the tool itself"*. No red-badge surfaces. | Visible with red badge + reason tooltip on per-target rows                     |
| Bundle / Built-in skills         | Hidden from listings entirely                                                                | Shown with their badges                                                        |
| Drawer diff block                | Hidden; replaced with `Compare with this tool's version →` button                            | Full lime/red diff lines (current Console spec)                                |
| `.skill` packaging               | Hidden everywhere (no button in drawer, no Packages route)                                   | `Build .skill` button in drawer (disabled, tooltip) + Packages sidebar item    |
| Activity event names             | Sentence rows: `Synced "writing-tips" to Claude, Codex` etc.                                 | `sync.commit` / `pull.back` / `archive` (raw kinds) in dense columns           |
| Symlink badges                   | Shown plainly: *"linked from …"*                                                             | Shown with full path + symlink icon                                            |
| Footer `build · <sha>`           | Hidden                                                                                       | Shown                                                                          |
| Drift-status chips in Drawer     | Plain language: `In sync`, `Different`, `Not in source`                                      | Console wording: `in-sync`, `drifted-target-newer`, `missing-in-target`, etc.  |

### 3.5 What the toggle does NOT change

- Visual system (colors, fonts, spacing, motion, focus rings).
- Underlying sync engine, Tauri commands, audit log format, ownership model.
- File paths displayed in the Source and Targets sections (paths stay visible — they're concrete and orient users).
- Symlink protection (Simple-mode users still benefit from refusal-to-overwrite; they just see plainer language about it).

### 3.6 Copy module pattern

Components don't carry `mode === 'simple' ? 'X' : 'Y'` strings inline. All mode-dependent strings live in `src/lib/copy.ts`:

```ts
export const copy = {
  simple: {
    libraryTitle: "My Skills",
    libraryCrumb: "home › my skills",
    driftLabel: "out of sync",
    unknownLabel: "unknown",
    orphanLabel: "not in your source",
    refusedLabel: "couldn't write",
    historyTitle: "History",
    targetsTitle: "Where your skills go",
    // …
  },
  pro: {
    libraryTitle: "Library",
    libraryCrumb: "~/.claude/skills › library",
    driftLabel: "drifted",
    unknownLabel: "Unknown",
    orphanLabel: "missing-in-source",
    refusedLabel: "refused",
    historyTitle: "Activity",
    targetsTitle: "Targets",
    // …
  },
} as const;
```

A `useCopy()` hook (built on `useMode()`) returns the active map. Components call `useCopy().libraryTitle`.

A short style guide lives at the top of `copy.ts` as a doc comment — see §12.

---

## 4 · Home page

New page at `/`. Landed on after first-run; accessible via sidebar.

### 4.1 Header strip

- **Crumb:** `skill sync · home` (mono, `--fg-faint`).
- **H1 (the health sentence)** — one-line plain English status, written from the current scan data:
  - All happy: *"Your 24 skills are in sync across 3 tools."*
  - Issues: *"22 of your 24 skills are in sync. 1 is out of sync, 1 lives in a tool but not in your source."*
- **Subhead** (mono): `last scan 11:42:08 · source ~/.claude/skills`.

### 4.2 Status strip (4 cells, `--card`, hairline-divided)

| Cell                | Simple-mode content                                              | Pro-mode adds                                       |
|---------------------|------------------------------------------------------------------|-----------------------------------------------------|
| In sync             | `22 skills`                                                       | + small per-target segment count                    |
| Out of sync         | `1 skill · in Codex`                                              | + worst-affected target name + drifted-newer side   |
| Needs claiming      | `1 skill in Claude isn't in your source` (orphan count)           | (same)                                              |
| Unknown             | `1 skill we couldn't classify yet`                                | (same; "Unknown")                                   |

Each cell is clickable and deep-links to `/library` with a pre-set filter chip selected.

### 4.3 Primary actions (right of header)

- `Sync everything ↵` — primary lime; binds to the same `usePlanSync()` the Library page uses.
- `+ New skill` — secondary ghost; opens the New Skill dialog (§9).

### 4.4 "Needs your attention" card

Only renders when the count is > 0. Hairline border, `--card` background.

Row types (sorted by recency):

- **Orphan row** — *"`agent-coder` lives in Claude but not in your source."* Actions: `Claim · Remove from Claude`.
- **Drifting row** — *"`writing-tips` was changed in Codex."* Actions: `Pull changes in · Push your version out · Open in editor`.
- **Unknown row** — *"We're not sure who owns `blog-helper`."* Action: `Classify` (opens existing `OwnershipPicker` inline).

Each row is one line by default. Clicking the row expands inline to a short plain-English explanation (~1 sentence) for users who don't recognize the term. Capped at 5 rows total; *"view all in My Skills →"* link follows if there are more.

### 4.5 Recent activity teaser

A 3-row mini list of the most recent activity events, rendered in Simple-mode sentence style (§6) regardless of current mode toggle — the Home page never gets dense rows. *"view full history →"* link to `/activity`.

### 4.6 Empty states

- **Pre-first-scan (new install, before first-run completes):** Home is not reachable; the first-run modal blocks the UI. After first-run, Home renders normally.
- **All-happy state:** the H1 carries the message; the "Needs your attention" card is replaced with a small mono line *"Nothing to tend right now. Last checked 11:42:08."* The Recent activity teaser still renders if there's any history.
- **Zero skills, post first-run:** H1 reads *"Your source folder is empty. Create your first skill to get going."* with a single `+ Create your first skill` button (lime).

---

## 5 · `/library` — "My Skills" in Simple

### 5.1 Header strip

- Crumb: `home › my skills` (Simple) / `~/.claude/skills › library` (Pro).
- H1: per `useCopy().libraryTitle`.
- Mono subhead, Simple: `24 skills · 3 tools · 1 out of sync · last checked 11:42:08`. Pro: keeps Console wording.
- Right side buttons: `Preview ⌘P` (ghost) and `Sync all ↵` (primary lime). Same in both modes.
- Above the table on Simple, a `+ New skill` ghost button appears at the right edge of the toolbar row.

### 5.2 Stats strip

Same 4-cell shape as Home. Simple labels: `In sync` / `Out of sync` / `Needs claiming` / `Unknown`. Pro labels match current Console spec: `In sync` / `Drift` / `Unknown` / `Archived this week`.

### 5.3 Toolbar

- Filter chips, Simple: `All · Mine · Unknown · Out of sync`.
- Filter chips, Pro: `All · Mine · Bundle · Built-in · Unknown` (Console spec).
- Search input: identical to Console spec in both modes (placeholder still `filter skills · regex with /…/` — search is the same regardless of mode).

### 5.4 Table columns

**Simple mode:**

| Col              | Width  | Content                                                                                  |
|------------------|--------|------------------------------------------------------------------------------------------|
| Skill            | `36%`  | `skill.name` (Geist 500), `<path · file-count>` in mono `--fg-faint`.                    |
| Status           | auto   | Plain-English chip: `In sync` (lime), `Out of sync · 1 tool` (amber), `Unknown` (amber outline), `Not in your source` (red outline). |
| Where it lives   | auto   | `ToolIconRow` — small icons for each enabled tool, colored by drift status; tooltip per icon. |
| Updated          | auto   | Friendly relative timestamps: *"today at 11:42"*, *"3d ago"*.                            |
| Actions          | auto   | Hover row: `Open · Push · Pull · Compare` (Push is primary lime).                        |

**Pro mode:** the Console-spec column set verbatim — Skill · Owner · Targets · Updated · Size · Actions, with `DriftBar` in the Targets column and the lime Push action.

The **Where it lives** column in Simple uses the same `DriftStatus` data as `DriftBar`; only the rendering differs.

### 5.5 Orphan section

If any orphans exist, they render above the main table in a separate visually-distinct group:

- Section header: `1 skill in your tools isn't in your source` (`--fg-dim`, mono uppercase 10.5px eyebrow).
- Each orphan row: name, the tool(s) it's in (small icon list), two actions: `Claim it (copy to source)` (lime) · `Remove from <tool>` (danger ghost).
- Orphan rows expand to a smaller preview drawer on click — shows the file content and the path it was found at. Same `SkillDetailDrawer` component, with a Simple-mode banner that says *"This skill isn't tracked in your source yet."*

In Pro mode, orphans render as ordinary table rows with their full `OwnerBadge` + `Targets` columns; the section header is dropped.

### 5.6 Row interaction

Identical to Console spec — hover background, click row opens drawer, selected row inset lime border. Unchanged.

### 5.7 Drawer (Simple)

- Header: skill name + path. Same.
- Meta grid (Simple): name, size, file count, last edit. Pro keeps source hash + commit timestamp rows.
- Tools list: one row per tool with plain-English status (`In sync` / `Different (their version is newer)` / `Different (your version is newer)` / `Not present`), per-row `Push` / `Pull` mini-buttons. Pro adds the per-target hash beside each row.
- **Diff block (Simple): hidden.** Replaced with a row containing a `Compare with this tool's version →` button. Clicking opens a Compare modal:
  - Title: `Compare with <Tool>`
  - Body: *"Your version was last edited 2 days ago. Claude's version was last edited yesterday. They're different."*
  - Footer: `Open both files` (opens in editor via Tauri opener) · `Close`.
- Pro: diff block renders as in Console spec (lime adds, red dels).
- Archive block: `2 older versions saved · open archive folder →`. Same in both modes.
- Actions row (Simple): `Open in editor · Push to all tools` (primary lime). `Build .skill` button: hidden in Simple, visible-but-disabled in Pro (as in Console spec).

---

## 6 · `/targets` — "Where they sync" in Simple

Minimal changes from Console spec — mostly copy.

- Crumb: `home › where they sync` (Simple) / `~/.claude/skills › targets` (Pro).
- H1: per `useCopy().targetsTitle`.
- Subhead, Simple: comma list of tool names (`Claude Code · Codex · Cursor · Cowork (zip)` if all enabled). Pro: `4 cabinets · 3 directory mirrors · 1 package`.
- `TargetCard`:
  - Status pill labels, Simple: `In use` / `Off` / `Not set up`. Pro: `Active` / `Disabled` / `Not configured`.
  - Path line: same in both modes.
  - `HealthBar`: same component. Label below it, Simple: `34 happy · 2 different · 0 blocked`. Pro: `34 in sync · 2 drift · 0 refused`.
  - Actions row, Simple: `Show in Finder · Test connection · Turn off`. Pro: `Open in Finder · Test · Disable`.
- Cowork target card: hidden in Simple (no `.skill` packaging surface); shown in Pro.

---

## 7 · `/activity` — "History" in Simple

- H1: per `useCopy().historyTitle`.
- Subhead, Simple: `214 things happened in the last month`. Pro: Console wording.
- Filter chips, Simple: `All · Synced · Pulled in · Removed · Changes noticed`. Pro: `All · Sync · Pull · Package · Refused · Drift detected`.

### 7.1 Row template — Simple

- Timestamp friendly (`today at 11:42`, `Tue 14:08`).
- A single **event sentence** column instead of `kind · skill · target`. Examples:
  - `Synced "writing-tips" to Claude, Codex, Cursor`
  - `Noticed "agent-coder" changed in Codex`
  - `Removed "old-helper" — your version was newer`
  - `Couldn't write "team-skill" to Cursor — looks like it's installed by Cursor itself`
- Outcome tag on the right: lime dot (success), amber (drift / drift-detected), red (refused), info-blue (pull).
- Hover reveals `Open archive →` when applicable.

### 7.2 Row template — Pro

The dense columnar table from Console spec, verbatim.

### 7.3 Footer

`Load more` button (mono, ghost) — same in both modes; existing pagination preserved.

---

## 8 · `/settings`

Console-spec structure, with two additions and two collapse changes.

### 8.1 New top section: **Mode**

- 2-segment switch `Simple | Pro`.
- One-line explainer below.
- Switching modes triggers a re-render only; no app restart.

### 8.2 Source section additions

When source root is a git repo (i.e. `git.status()` returns `Some`):
- New row **"Branch / status"** showing the same chip as the sidebar (e.g. `main · 2 uncommitted`).
- Tooltip: *"Skill Sync only watches. Use your git client to commit and push."*

### 8.3 Collapsed sections in Simple

- **Packaging section**: hidden entirely in Simple. Visible in Pro.
- **Diagnostics section**: collapsed by default in Simple to a one-line `Build info, history file, advanced…` row that expands on click. Visible expanded by default in Pro. The Diagnostics expand reveals: build info, history file path (Pro mode labels this row "Audit log"), `Reveal config dir`, and a Pro-only `Run first-time setup again` link.

### 8.4 Other sections

Unchanged from Console spec — Targets and Appearance render identically; Source keeps its existing rows (Source root, Show built-ins toggle).

---

## 9 · New-skill scaffolder

### 9.1 Triggers

- Home → `+ New skill` button.
- Library → `+ New skill` ghost button in the toolbar (Simple) or trailing `+` icon on the header (Pro).
- Global shortcut `⌘N` — registered in `useGlobalShortcuts` alongside the existing ones.

### 9.2 Dialog

Uses existing `--popover` Dialog primitive.

- H2: "Create a new skill"
- Two inputs:
  - **Name** — kebab-case, validated client-side against `^[a-z0-9-]+$` and against existing skill names (case-insensitive). Inline hint: *"This becomes the folder name. Use dashes, not spaces."*
  - **What does it do?** — one-sentence description. Inline hint: *"This is what tells the AI when to use your skill. Write it like you're explaining to a colleague."* Soft warning past ~200 chars (*"Long descriptions are fine, but most skills get away with one sentence."*).
- Toggle: **Open in editor when created** (default on).
- Buttons: `Cancel · Create skill` (primary lime).

### 9.3 Tauri command

New: `skills.scaffold(name: String, description: String) -> Result<PathBuf, ScaffoldError>` in `src-tauri/src/commands/skills_scaffold.rs`.

Behavior:

1. Validate name: matches `^[a-z0-9-]+$`, length 1..=64, not equal to any existing entry in source root (case-insensitive).
2. Build path `<source_root>/<name>/`.
3. Create directory; fail if it already exists.
4. Write `<source_root>/<name>/SKILL.md` with the template:

   ```markdown
   ---
   name: {name}
   description: {description}
   ---

   # {name}

   <!-- Replace this with your skill content. -->
   ```

5. Return absolute path of the new SKILL.md.

`ScaffoldError` variants: `InvalidName(String)`, `Duplicate(String)`, `SourceRootUnset`, `Io(String)`. All surface as plain-English toasts on the frontend.

### 9.4 Post-submit

- Dialog closes.
- If "open in editor" was on: open the returned SKILL.md path via `tauri-plugin-opener`.
- Toast: *"Created `<name>`. Sync it to your tools when you're ready."* with an inline `Sync now` action that triggers the existing sync plan.
- The Library table refreshes automatically via the existing scanner; the new row pulses briefly (uses the existing `console-rise` animation, retargeted at the row's `data-skill-id`).

### 9.5 Errors

- Duplicate name → inline error in the dialog input row: *"You already have a skill called `<name>`. Pick a different name."*
- Source root unset → dialog refuses to open; instead opens Settings → Source with a toast *"Set your source folder first."*
- Filesystem error → toast with the OS error message and a `Try again` action.

---

## 10 · Git awareness

### 10.1 Tauri command

New: `git.status(path: PathBuf) -> Result<Option<GitStatus>, GitError>` in `src-tauri/src/commands/git_status.rs`.

```rust
struct GitStatus {
  branch: String,           // current branch name
  uncommitted: u32,         // files with any working-tree change
  ahead: u32,               // commits ahead of upstream (0 if no upstream)
  behind: u32,              // commits behind upstream
  has_upstream: bool,
}
```

- Returns `Ok(None)` when no `.git` directory is found at or above `path`.
- Uses the `git2` crate (add to `src-tauri/Cargo.toml`).
- Bubble libgit2 errors as `GitError::Lib(String)`; frontend logs them but does not surface (treats as "no git status available").

### 10.2 Refresh cadence

Alongside the existing 30s drift refresh, a `use-git-status` hook re-fetches the source-root git status. Cached in the frontend store.

### 10.3 Surface

- **Sidebar Source section** — mono chip under the source path: `main · 2 uncommitted`.
  - Color: lime when `uncommitted == 0 && ahead == 0 && behind == 0`; amber when `uncommitted > 0`; dim when `ahead > 0 || behind > 0`; otherwise lime.
  - Hidden when `git.status` returns `None`.
- **Settings → Source section** — read-only "Branch / status" row with the same chip and the disclaimer tooltip.
- **Drawer** — no git surface. Per-skill commit history is a Pro follow-up.

### 10.4 Read-only guarantee

The new command performs **no writes**. No `commit` / `push` / `pull` / `fetch` calls. This is enforceable by reviewing `git_status.rs` — it should only invoke `Repository::open`, `head`, `statuses`, and `branch_upstream`. A unit test asserts that `GitStatus` is the only output type and `git.status` is the only registered command from this module.

---

## 11 · Migration & rollout

### 11.1 Settings migration

On launch:

1. If `settings.json` doesn't exist → first-run flow runs (§11.2), writes `mode: "simple"` + `first_run_completed: true`.
2. If `settings.json` exists and has no `mode` field → set `mode: "pro"` and persist. Surface a one-time toast: *"We added a Simple mode that hides the deeper details. You're in Pro now."* with `Try Simple` / `Stay in Pro` buttons. Persist a `mode_migration_announced: true` flag so the toast doesn't repeat.
3. If `settings.json` exists with a `mode` field → no migration.

### 11.2 First-run flow trigger

`settings.json.first_run_completed !== true`. Blocks the rest of the app behind a centered modal.

Three configuration steps (Welcome → Source → Tools), followed by a brief scanning transition that hands off to Home. Throughout the spec, this is referred to as a "3-step" setup; the scanning screen is a mechanical waiting state, not a step the user interacts with.

#### Step 1 — Welcome

- Lime `//` monogram.
- H1: "Let's set up Skill Sync."
- Body: *"Skill Sync watches the folder where you keep your skills and copies them into Claude Code, Codex, and other tools so they stay in sync. Takes about 30 seconds to set up."*
- One button: `Get started →`.

#### Step 2 — Source folder

- H2: "Where are your skills?"
- Body: *"This is the folder you edit. Skill Sync treats it as the source of truth and copies from here into your tools."*
- Path input prefilled with `~/.claude/skills` + a `Choose folder…` button (Tauri `dialog.open`).
- If the chosen folder is a git repo, an inline lime line: *"This is a git repo on branch `main`. Skill Sync will keep track but won't commit for you."*
- If the chosen folder doesn't exist: *"This folder doesn't exist yet. We'll create it for you."*
- If empty: *"This folder is empty. That's fine — we'll create your first skill in a minute."*
- Buttons: `← Back · Next →`.

#### Step 3 — Pick tools

- H2: "Which tools should we sync to?"
- 4 toggleable rows (Claude Code / Codex / Cursor / Cowork zips). Each row shows the auto-detected path and a status badge: `Detected ✓` (lime) / `Not found` (dim).
- On-by-default if detected; off-by-default if not.
- Body: *"You can change these any time in Settings."*
- Buttons: `← Back · Start syncing →`.

#### Transition — First scan (not a user step)

- Brief loading screen with a scanning spinner + "Scanning your skills…"
- On completion, transitions to Home with a one-time toast: *"Found 24 skills. They're all in sync."* (or whatever the actual state is).

#### Persistence

- After Step 3 completes: write `first_run_completed: true` to `settings.json`.
- Re-runnable from Settings → Diagnostics → `Run first-time setup again` (Pro only).

### 11.3 Backward compatibility

- `settings.json` schema additions (`mode`, `mode_migration_announced`, `first_run_completed`) are backward compatible — older binaries ignore unknown keys.
- `ownership.json`, `targets.json`, `audit.log` formats are unchanged.

---

## 12 · Voice & copy guide

A new file `src/lib/copy.ts` is the single source of mode-dependent strings. A short style guide at the top of the file as a doc comment:

> **Simple voice:** Plain English. Second person ("your skills"). Present tense. No jargon. Light gardening hints allowed in microcopy and empty states ("nothing to tend right now"), but never in primary nav or page H1s. Never say "drift" or "audit" in Simple. Never display a hash string in Simple-mode user-facing text.
>
> **Pro voice:** Console terminology (drift, audit, archive, refused, bundle, built-in, hash). Mono-forward. Dense.
>
> **Errors:** Plain English in both modes. *"Couldn't write to Cursor — looks like a symlink we shouldn't touch."* Never raw error codes.

### 12.1 Jargon table

Enforced by code review:

| Pro term                | Simple replacement                           |
|-------------------------|----------------------------------------------|
| Drift / drifted         | Out of sync / different                       |
| Audit log               | History                                       |
| Archive                 | Saved older versions                          |
| Refused                 | Couldn't write (with reason)                  |
| Source-of-truth         | Your source folder / where you edit           |
| Target                  | Tool                                          |
| Bundle                  | (hidden in Simple)                            |
| Built-in                | (hidden in Simple)                            |
| OwnershipEntry / class  | Who made this                                 |
| sync.commit / pull.back | Synced / Pulled in                            |
| Hash                    | (hidden in Simple)                            |
| Missing-in-source       | Not in your source (orphan)                   |
| Missing-in-target       | Not present                                   |

### 12.2 Light gardening hints

Allowed in microcopy:

- Empty "Needs your attention" card: *"Nothing to tend right now."*
- Orphan section header (alternative phrasing): *"These skills could use a home."* (use sparingly).
- Toast on successful sync: occasional *"Your library is happy."* (rotate with neutral phrasings).

Not allowed:

- Page names (`Garden`, `Beds`, `Compost`).
- Sidebar nav.
- Primary actions.
- Anything in Pro mode.

---

## 13 · Files touched

### 13.1 New

- `src/pages/home.tsx`
- `src/components/needs-attention-card.tsx`
- `src/components/orphan-row.tsx`
- `src/components/tool-icon-row.tsx` (Simple-mode "Where it lives" column renderer)
- `src/components/first-run-modal.tsx` (the 3-step wizard plus scan transition, mounted by `AppShell`)
- `src/components/new-skill-dialog.tsx`
- `src/components/compare-dialog.tsx` (Simple-mode replacement for the diff block)
- `src/components/git-status-chip.tsx`
- `src/components/mode-switch.tsx`
- `src/hooks/use-mode.ts`
- `src/hooks/use-copy.ts`
- `src/hooks/use-git-status.ts`
- `src/hooks/use-first-run.ts`
- `src/lib/copy.ts`
- `docs/superpowers/specs/2026-05-25-vibe-dev-friendly-design.md` (this spec)
- `src-tauri/src/commands/skills_scaffold.rs`
- `src-tauri/src/commands/git_status.rs`

### 13.2 Rewritten

- `src/routes.tsx` (add `/`, demote Library to `/library`)
- `src/components/sidebar.tsx` (Simple/Pro labels + git status chip in Source section)
- `src/components/library-table.tsx` (mode-aware columns + orphan section)
- `src/components/skill-detail-drawer.tsx` (mode-aware meta grid; no diff in Simple)
- `src/components/sync-preview-dialog.tsx` (Simple-mode action labels)
- `src/components/activity-list.tsx` (mode-aware row template — sentence in Simple, dense columns in Pro)
- `src/components/target-card.tsx` (Simple labels)
- `src/components/settings-form.tsx` (add Mode + git-status row, collapsed Diagnostics)
- `src/components/owner-badge.tsx` (Simple-mode badge subset)
- `src/components/drift-badge.tsx` (Simple language)
- `src/components/title-bar.tsx` (no changes, listed for completeness — confirms titlebar unchanged)
- `src/pages/library.tsx` · `src/pages/targets.tsx` · `src/pages/activity.tsx` · `src/pages/settings.tsx` (Simple/Pro copy)
- `src-tauri/src/lib.rs` (register new commands)
- `src-tauri/Cargo.toml` (add `git2` dep)

### 13.3 Deleted

None.

---

## 14 · Out of scope (explicit follow-ups)

- **In-app SKILL.md editor.** Scaffolder opens the file in the user's editor.
- **Recurring reminder / nudge system.** No notifications or scheduled prompts; weekly Garden Check is a future iteration.
- **Stale / undescribed / duplicate detection.** Orphan handling covers only "in target, not in source".
- **Per-skill git commit history in the drawer.** Awareness only.
- **In-app `git commit` / `git push` / `git pull`.** Awareness only.
- **Real fuzzy ⌘K palette** with skill jump-to. Stub remains from Console spec.
- **Cowork `.skill` packaging wiring.** Pro-only `Build .skill` button stays disabled until wired.
- **Teams / shared library / registries.** Single-user focus.
- **Telemetry / analytics.** None added.
- **Re-running first-run from a primary surface.** Hidden in Pro Diagnostics; not promoted.

---

## 15 · Implementation phasing

Three commits. Each commit builds + runs end-to-end.

### Commit 1 — Mode plumbing + Home

- `mode` field in settings + `useMode()` + `useCopy()` + `src/lib/copy.ts`.
- Migration logic for existing installs (force `mode: "pro"`).
- `ModeSwitch` component + Settings → Mode section.
- New `/` route with `home.tsx` (uses existing scan data + audit log).
- `needs-attention-card.tsx`, `orphan-row.tsx`.
- Mini activity teaser (sentence renderer extracted into a shared util).
- Sidebar nav swaps Simple/Pro labels via `useCopy()`.
- Validation: existing app routes still work; mode toggle visibly changes labels.

### Commit 2 — Library / Targets / Activity Simple variants

- Library table mode-aware columns; `ToolIconRow` for "Where it lives"; orphan section header.
- Drawer mode-aware meta grid; `compare-dialog.tsx` for Simple "Compare" action.
- Activity sentence row template (mode-aware row renderer).
- Target card label swaps.
- Settings collapsed Diagnostics section in Simple.
- Validation: every route renders correctly in both modes; switching mode at runtime doesn't break state.

### Commit 3 — First-run + New skill + Git awareness

- `first-run-modal.tsx` + the 3 steps + scan transition + `use-first-run.ts`.
- `new-skill-dialog.tsx` + Tauri `skills.scaffold` + `⌘N` shortcut + post-submit toast.
- Git: `git2` dep, `git_status.rs`, `use-git-status.ts`, `git-status-chip.tsx`, sidebar + Settings surfaces.
- Validation: fresh install runs through first-run and lands on Home; New skill creates a folder + file + opens editor; git status appears when source is a clone.

---

## 16 · Acceptance checklist

- [ ] New installs land on a working first-run flow and end up on Home with `mode: "simple"`.
- [ ] Existing installs migrate to `mode: "pro"` with a one-time toast.
- [ ] Mode toggle in Settings live-swaps nav labels, columns, badges, and chip language across every page without requiring a reload.
- [ ] Home page health sentence updates as scan data changes.
- [ ] Orphans (skills present in a target but not in source) appear in the Home "Needs your attention" card and in a dedicated section atop the Library table.
- [ ] New skill dialog creates `<source>/<name>/SKILL.md` with the template; collides cleanly on duplicate name; opens in editor when toggled.
- [ ] Git-status chip appears in the sidebar and Settings when source is a git repo; hidden when it's not.
- [ ] No git commands run from Skill Sync (verified by code review of `git_status.rs`).
- [ ] No hash strings appear in any Simple-mode user-facing text.
- [ ] No `.skill` packaging surfaces are visible in Simple mode.
- [ ] The word "drift" / "audit" / "refused" / "bundle" / "built-in" does not appear in any Simple-mode user-facing text.
- [ ] The Compare dialog opens both files in the user's editor; never shows a raw hash.
- [ ] Visual system tokens (colors, fonts, spacing) are unchanged from the Console spec.
