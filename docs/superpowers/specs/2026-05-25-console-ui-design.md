# Console UI — Design Spec

> Replace the current "Provenance Archive" (editorial / Atelier) frontend with the **Console** aesthetic — a Vercel-discipline, Notion-spacious dark dashboard, mono-forward, with a lime accent. One coherent skin applied to every page, dark-first with a designed light mode. No product behavior changes.

- **Date:** 2026-05-25
- **Status:** Approved by user; ready for implementation plan
- **Scope:** Frontend only. Tauri config: one window-style tweak. No Rust changes.
- **Reference mockup:** `design-concepts/console.html`

---

## 1 · Goal & non-goals

### Goal

Make the running app look and feel like the Console mockup:

- Pitch-black canvas (`#0a0a0a`), hairline borders, dense data tables, mono-forward chrome.
- Geist + Geist Mono typography (self-hosted; works offline).
- Lime accent (`#d3ec5a`) reserved for "in sync" signals and primary actions — never decorative.
- A `// SKILL.SYNC` overlay title bar replacing Tauri's native title strip on macOS.
- Per-skill 4-segment drift visualizer (one segment per target, including the Cowork `.skill` package).
- Working keyboard shortcuts: `⌘K`, `/`, `⌘↵`, `G L` / `G T` / `G A` / `G S`.

### Non-goals

- **No new product features.** Sync, ownership, drift detection, audit log, packaging — unchanged.
- **No real fuzzy ⌘K palette.** A stub dialog that lists shortcuts; the real palette is a follow-up.
- **No Linux/Windows native-chrome polish.** Overlay title bar is macOS-tuned; other platforms fall back to default Tauri decorations and the in-app title bar adapts (no traffic-light padding).
- **No SwiftUI / native rewrite.** Still Tauri + React + Tailwind + shadcn.
- **No new Tauri commands or Rust changes.**

---

## 2 · Visual system

### 2.1 Tokens

Replace `src/styles/tokens.css` wholesale. Token names from shadcn are retained so existing primitives inherit without component-by-component rewrites.

**Dark (default):**

| Token                       | Value                                        | Use                                |
|-----------------------------|----------------------------------------------|------------------------------------|
| `--background`              | `#0a0a0a`                                    | App background                     |
| `--card`                    | `#0f0f0f`                                    | Stat cells, table wrap, sidebar bg |
| `--popover`                 | `#141414`                                    | Dialogs, dropdowns                 |
| `--foreground`              | `#ededed`                                    | Body text                          |
| `--muted-foreground`        | `#a1a1a1`                                    | Eyebrows, secondary text           |
| `--fg-dim`                  | `#6f6f6f`                                    | Metadata, kbd labels               |
| `--fg-faint`                | `#4a4a4a`                                    | Decorative chrome only             |
| `--border`                  | `#1c1c1c`                                    | Hairlines                          |
| `--border-strong`           | `#262626`                                    | Chip outlines, focus              |
| `--bg-hover`                | `#181818`                                    | Row hover                          |
| `--primary`                 | `#d3ec5a`                                    | Lime accent — "in sync", primary CTA |
| `--primary-foreground`      | `#0a0a0a`                                    | Text on lime                       |
| `--accent-glow`             | `rgba(211,236,90,0.18)`                      | Lime shadow / pulse                |
| `--success`                 | `#d3ec5a` (alias of `--primary`)             | DriftStatus `in-sync`              |
| `--warning`                 | `#f5a524`                                    | DriftStatus drifted                |
| `--danger` / `--destructive`| `#f5544c`                                    | Refused, Unknown                   |
| `--info`                    | `#5ec2ff`                                    | Bundle badge                       |
| `--violet`                  | `#b78cff`                                    | Built-in badge                     |
| `--radius`                  | `6px`                                        | Buttons, inputs                    |
| `--radius-lg`               | `10px`                                       | Table wrap, stat strip             |

**Light:**

| Token                       | Value                                        |
|-----------------------------|----------------------------------------------|
| `--background`              | `#fafafa`                                    |
| `--card`                    | `#ffffff`                                    |
| `--popover`                 | `#ffffff`                                    |
| `--foreground`              | `#0a0a0a`                                    |
| `--muted-foreground`        | `#6b6b6b`                                    |
| `--fg-dim`                  | `#8a8a8a`                                    |
| `--fg-faint`                | `#b3b3b3`                                    |
| `--border`                  | `#ebebeb`                                    |
| `--border-strong`           | `#d4d4d4`                                    |
| `--bg-hover`                | `#f3f3f3`                                    |
| `--primary`                 | `#6f8d18`                                    | (lime darkened for AA on white)    |
| `--primary-foreground`      | `#ffffff`                                    |
| `--warning`                 | `#b56a00`                                    |
| `--danger`                  | `#c4321a`                                    |

The lime is shifted from `#d3ec5a` → `#6f8d18` in light mode so it remains AA against white text and surfaces. All other semantics keep the same hue family.

### 2.2 Typography

- **Display + body:** Geist (variable, weights 300–700).
- **Mono:** Geist Mono (variable, weights 300–600).
- Both self-hosted as `.woff2` files under `public/fonts/geist/` and `public/fonts/geist-mono/`.
- Declared in `tokens.css` via `@font-face` with `font-display: swap`.
- Drop Fraunces and Newsreader from the Tailwind font stack entirely.
- Tabular figures globally on numeric data: `font-feature-settings: "tnum"`.
- `font-display` class (used in old code) is repurposed to point at Geist 600 with `letter-spacing: -0.02em`. Existing usages still render — they just no longer look editorial.

**Type scale** (Tailwind `fontSize` overrides):

| Token   | Size / line-height / tracking          | Use                                  |
|---------|----------------------------------------|--------------------------------------|
| `2xs`   | `10px / 1.5 / 0.18em` (uppercase)      | Eyebrows, column headers, kbd        |
| `xs`    | `11px / 1.5`                           | Mono metadata                        |
| `sm`    | `12.5px / 1.5`                         | Buttons, secondary text              |
| `base`  | `13.5px / 1.55`                        | Table cells, body                    |
| `lg`    | `17px / 1.4`                           | Subheads                             |
| `xl`    | `22px / 1.3 / -0.01em`                 | Sidebar nav active                   |
| `2xl`   | `28px / 1.05 / -0.02em`                | Page H1                              |
| `3xl`   | `36px / 1.02 / -0.025em`               | Reserved (large stats)               |

### 2.3 Spacing & shape

- Row padding in tables: `12px 14px`.
- Sidebar nav-item padding: `7px 10px`.
- Title bar height: `36px`.
- Page gutter: `32px` left/right of main; `28px` top.
- Card border: hairline `1px` `--border`; never elevation shadows except on the floating cmdbar.

### 2.4 Atmosphere

- Subtle 56px grid background overlay on `<main>`:
  `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)` × 2 axes, masked with a `radial-gradient(900px 500px at 40% 0%, black, transparent 75%)`.
- Two faint radial gradients on `<body>`: lime `rgba(211,236,90,0.04)` upper-right; cyan `rgba(94,194,255,0.03)` lower-left.
- **Remove** the SVG paper-grain noise that the Provenance Archive added — wrong texture for Console.

> **Token reference convention.** Throughout this spec, "the `--card` surface" means `#0f0f0f` in dark and `#ffffff` in light — i.e. the standard shadcn `--card` token. "The `--popover` surface" means `#141414` / `#ffffff` — used for dialogs and elevated panels. The mockup's working names `--bg-soft` and `--bg-elev` map to `--card` and `--popover` respectively in the production tokens. No additional surface tokens are introduced.

---

## 3 · App chrome

### 3.1 Tauri window config

`src-tauri/tauri.conf.json` change:

```json
{
  "app": {
    "windows": [{
      "title": "Skill Sync",
      "width": 1280,
      "height": 800,
      "minWidth": 980,
      "minHeight": 600,
      "titleBarStyle": "Overlay",
      "decorations": true
    }]
  }
}
```

- `titleBarStyle: "Overlay"` only takes effect on macOS — the OS hides its title strip but keeps traffic lights floating over the webview.
- On Linux/Windows the property is ignored; the native title bar still renders. The in-app title bar adapts: it omits the 70px left padding when `data-platform` (set at boot from `@tauri-apps/api/os` `platform()`) is not `"macos"`.

### 3.2 TitleBar component

New component at `src/components/title-bar.tsx`, mounted by `AppShell` before the shell grid.

- 36px tall, full-width, `position: sticky; top: 0; z-index: 30`.
- `backdrop-filter: blur(8px)` over `rgba(10,10,10,0.6)`.
- Left padding: `70px` on macOS, `12px` elsewhere.
- Brand: mono `// SKILL.SYNC` followed by a 7×12 lime block caret that blinks via `@keyframes blink` (1.05s, `steps(1)`). Respects `prefers-reduced-motion`.
- Spacer.
- Sync-state pill: pulsing 6px lime dot + mono text `watching · 4 targets · 30s`. The text is dynamic (reads from `useSettings` for the enabled-target count and `use-drift-refresh` for the interval).
- Version: mono `v0.1.0 · darwin/arm64`, read from `package.json` version + `platform()` + `arch()` at boot.

### 3.3 Sidebar

Rewrite `src/components/sidebar.tsx`. 220px width. Sections, top-to-bottom:

1. **Workspace** (eyebrow heading).
   - Library / Targets / Activity / Packages.
   - Each row: 14×14 outline icon, label, mono count badge on the right.
   - Active row: `--card` background, inset `1px` `--border-strong`, lime count.
2. **Source** (eyebrow heading).
   - Mono path line (truncated mid-path with ellipsis): `~/.claude/skills`.
   - "+ change source" affordance in `--fg-faint`, opens the same dialog the Settings page uses.
3. **Targets** (eyebrow heading).
   - Four lines: Claude Code / Codex / Cursor / Cowork (zip). Each with a dot indicator (filled lime when enabled, open ring when disabled).
   - Clicking jumps to `/targets`.
4. **Footer** (3 lines, mono, top-bordered with a dashed line):
   - `last sync · <hh:mm:ss>` from latest audit entry of kind `sync.commit`.
   - `archive · ~/.Trash/skill-sync`.
   - `build · <short-sha>` from `import.meta.env.VITE_BUILD_SHA` (added to Vite config; falls back to `dev`).

### 3.4 Command bar pill

New `src/components/cmd-bar.tsx`, fixed `left: 50%; bottom: 18px; transform: translateX(-50%)`.

- Pill: `rgba(15,15,15,0.85)` with `backdrop-filter: blur(12px)`, hairline border.
- Lists active shortcuts inline: `⌘K command palette · / filter · G L library · ⌘↵ sync`.
- Clicking the pill or pressing `⌘K` opens the ⌘K **stub** modal (a small Dialog titled "Command palette · coming soon" listing all shortcuts).

---

## 4 · Page reskins

### 4.1 Library

Replace the editorial header + table.

**Header strip:**
- Crumb: `~/.claude/skills › library` (mono, `--fg-faint`).
- H1 `Library` (Geist 600, 28px) + mono subhead `82 skills · 4 targets · 3 drifting · last scan 11:42:08`. Drifting count is amber-tinted when non-zero.
- Right side: two buttons — `Preview ⌘P` (ghost, hairline border) and `Sync all ↵` (primary lime).

**Stats strip** (`grid-cols-4` inside a `--card` block with hairline borders between cells):

| Cell                  | Source                                                                          |
|-----------------------|---------------------------------------------------------------------------------|
| In sync               | Count of skills where every enabled target has `DriftStatus = "in-sync"`.       |
| Drift                 | Count of skills with any `drifted-target-newer` or `drifted-source-newer`. Detail line names the worst-affected target(s). |
| Unknown               | Count of skills where `OwnershipEntry` is missing or `class != "mine"` and `Class = Unknown`. |
| Archived this week    | Count of `audit.log` entries with `kind = "archive"` in last 7 days. The detail row gets a 7-bar CSS sparkline (one bar per day, taller = more events; the day with drift events flares amber). |

**Toolbar row:**
- Left: filter chips (`All` · `Mine` · `Bundle` · `Built-in` · `Unknown`), each with count. Active chip gets `--card` background and lime count.
- Right: search input with leading magnifier icon, placeholder `filter skills · regex with /…/`, trailing `/` kbd hint. Pressing `/` anywhere focuses this input.

**Table** — replaces `src/components/library-table.tsx`'s rendering (data hookup unchanged):

Columns:

| Col       | Width  | Content                                                                              |
|-----------|--------|--------------------------------------------------------------------------------------|
| Skill     | `36%`  | `skill.name` (Geist 500), `<path · file-count>` underneath in mono `--fg-faint`.     |
| Owner     | auto   | OwnerBadge chip (Mine / Bundle / Built-in / Unknown).                                |
| Targets   | auto   | DriftBar (see below) + label like `3/4 in sync` or amber `codex · drift`.            |
| Updated   | auto   | Mono timestamp (HH:MM:SS for today, `Nd ago` for older).                             |
| Size      | auto   | Mono size in kB, right-aligned.                                                      |
| Actions   | auto   | Slide-in hover row: `open` / `pull` / `diff` / `push` (push lime-filled).            |

**Row interaction:**
- Hover: `--bg-hover` background, actions opacity 0→1 (120ms).
- Selected (when drawer open): lime inset border on the left (`box-shadow: inset 2px 0 0 var(--primary)`), faint left-to-transparent lime gradient backing.
- Click row → opens `SkillDetailDrawer`.

**Ownership inbox fold-in:**
- Delete `src/components/ownership-inbox.tsx`.
- Unknown skills render as a normal table row with the amber Unknown badge and a single action: `classify` (lime). Clicking opens the existing `OwnershipPicker` inline at the row (or a small popover; details in plan).

### 4.2 DriftBar component (new)

`src/components/drift-bar.tsx`. Replaces the current per-target CL/CX/CR badge stack.

- 4 segments arranged horizontally. Each `16px × 6px`, `border-radius: 2px`, `gap: 3px`.
- Order: Claude Code · Codex · Cursor · Cowork.
- Segment visual states (derived from `DriftStatus`):
  - `in-sync` → solid lime, `box-shadow: 0 0 6px var(--accent-glow)`.
  - `drifted-*` → solid amber.
  - `missing-in-target` / `refused` → transparent fill, dashed `1px` `--border-strong` outline.
  - `unmanaged` → solid `--fg-dim` (no glow).
- Cowork segment — **for this spec**, renders dashed/not-built for every skill. The underlying packaging-state data isn't exposed by any existing Tauri binding (`src/types/bindings.ts` has no `PackageState`), and adding a new Rust command is out of scope (see §1 non-goals). A follow-up will add `pkg.list_built()` or equivalent and wire the segment; until then the Cowork lane in the bar is honest about being uninstrumented.
- Tooltip on each segment (Radix Tooltip): `claude · in sync · aa3b1f0`.
- Label to the right: `3/4 in sync` (`--fg-dim`) when all green, otherwise the worst-affected target in amber/red.

### 4.3 OwnerBadge restyle

`src/components/owner-badge.tsx`:

| Class                       | Color          | Background tint                   | Label      |
|-----------------------------|----------------|-----------------------------------|------------|
| `Mine` (confirmed)          | `--primary`    | `rgba(211,236,90,0.06)`           | Mine       |
| `MineHeuristic` (unconfirmed)| `--warning`   | `rgba(245,165,36,0.06)`           | Mine · auto |
| `Bundle`                    | `--info`       | `rgba(94,194,255,0.05)`           | Bundle     |
| `ToolBuiltin`               | `--violet`     | `rgba(183,140,255,0.05)`          | Built-in   |
| `Unknown`                   | `--warning`    | `rgba(245,165,36,0.06)`           | Unknown    |

- Chip shape: `font-mono`, `10.5px`, `letter-spacing: 0.04em`, `padding: 3px 7px`, `border-radius: 4px`, `1px` hairline border in the same hue.
- Prefix: 5×5 dot in `currentColor`.
- Drop the unicode marks (◆ ◇ ○ ·) — Console doesn't use glyph language.

### 4.4 Targets page

`src/pages/targets.tsx` + `src/components/target-card.tsx`:

- Same header strip pattern (crumb, H1, mono subhead). Subhead reads `4 cabinets · 3 directory mirrors · 1 package`.
- 2×2 grid of TargetCards.
- Each card:
  - Hairline border, `--card` background, `22px` padding, `--radius-lg`.
  - Header row: target name (Geist 500, 18px) + status pill (`Active` lime / `Disabled` muted / `Not configured` amber).
  - Path in mono, click-to-reveal full path; "Reveal in Finder" button alongside (opens via Tauri `plugin-opener`).
  - Per-target **health bar**: a single horizontal stacked bar (full card width, 6px tall, `--radius: 2px`) with proportional segments — lime for in-sync skills, amber for drifted, dim for missing, red for refused. Width of each segment is proportional to the count. This is a distinct component from `DriftBar` (per-skill, 4 fixed lanes) — name it `HealthBar`. Label below: `34 in sync · 2 drift · 0 refused`.
  - Action row: `Open in Finder` (ghost) · `Test` (ghost) · `Disable` (danger ghost).

### 4.5 Activity page

`src/pages/activity.tsx` + `src/components/activity-list.tsx`:

- Header strip with subhead `214 events · last 30 days`.
- Filter chip row: `All · Sync · Pull · Package · Refused · Drift detected`.
- Activity list rendered as a dense table:
  - Columns: `[ts mono]  [kind badge]  [skill]  [target]  [outcome / reason]`.
  - Kind badge color: sync = lime, pull = info blue, package = violet, refused = red, drift = amber.
  - Hover: row reveals `view archive →` link when an archive path exists for that event (opens the archived file via Tauri opener).
- Footer: `Load more` button (mono, ghost). Existing pagination hook (or whatever the current list uses) is preserved.

### 4.6 Settings page

`src/pages/settings.tsx` + `src/components/settings-form.tsx`:

- Header strip with subhead `Source · 4 targets · packaging · diagnostics`.
- Form restructured as labeled rows under mono section headers:
  1. **Source** — Source root (read-only path with "Change…" button), Show built-ins toggle.
  2. **Targets** — Per-target toggles + path inputs (Claude / Codex / Cursor / Cowork).
  3. **Packaging** — Package output dir, "Build .skill for all" button.
  4. **Appearance** — Theme: 3-segment switch `System / Light / Dark`.
  5. **Diagnostics** — Build info, audit log path, "Reveal config dir" button.
- "Reset to defaults" rendered as a danger ghost button in a separate row at the bottom.

### 4.7 Dialogs & drawer

- `SyncPreviewDialog` — Console-styled Dialog. Title eyebrow `SYNC PREVIEW · ⌘P`; body lists the `SyncPlan` rows in a dense table with action badges (`Create` / `Update` / `Skip` / `Refuse`); footer has `Cancel` and `Sync now` (primary lime).
- `SkillDetailDrawer` — right-side Sheet, 480px. Sections:
  1. Header: skill name in Geist 600 + path in mono.
  2. Meta grid: class, size, file count, source hash, latest commit timestamp.
  3. Targets list: one row per target with per-target hash + `DriftStatus` chip + per-row `pull` / `push` mini-buttons.
  4. Diff block: most recent diff between source and any drifted target (existing logic; styled with lime add / red del lines on `--card`).
  5. Archive block: archive count + "Open archive folder" link.
  6. Actions row: `Open in editor` (ghost) · `Push to all` (primary lime) · `Build .skill` (ghost, **disabled with tooltip "Packaging not yet wired"** — the existing packaging Rust command is fine but no UI plumbing exists yet; full wiring is a follow-up).

---

## 5 · Component primitives

`src/components/ui/`:

- **`button.tsx`** — variants: `default` (hairline border, transparent), `primary` (lime fill + black text + lime glow shadow), `ghost` (no border), `danger` (red text on transparent, red fill on hover). Sizes: `sm` (24px), `md` (32px, default), `lg` (40px).
- **`badge.tsx`** — chips per OwnerBadge table; same shape regardless of variant.
- **`input.tsx`** — adds a `search` variant with leading-icon and trailing-kbd-hint slots.
- **`dialog.tsx`** — `--popover` background, hairline border, eyebrow-cased title.
- **`sheet.tsx`** — right-side default, 480px width.
- **`table.tsx`** — header cells in mono uppercase 10.5px; body cells 13.5px; row separators hairline `--border`.

---

## 6 · Interactions & motion

### 6.1 Global shortcuts

New hook `src/hooks/use-global-shortcuts.ts`, registered once by `AppShell`. Two-key sequences use a 1.2s timeout window.

| Shortcut       | Action                                                                |
|----------------|-----------------------------------------------------------------------|
| `⌘K`           | Open the ⌘K stub Dialog.                                              |
| `/`            | Focus the page's primary search input (registered via context).       |
| `⌘↵`           | Trigger primary action of the current page (Library: Sync mine).       |
| `G L`          | Navigate to `/`.                                                       |
| `G T`          | Navigate to `/targets`.                                                |
| `G A`          | Navigate to `/activity`.                                                |
| `G S`          | Navigate to `/settings`.                                                |
| `Esc`          | Close drawer/dialog if open; otherwise no-op.                          |

A `PrimarySearchContext` lets each page register its search ref. A `PrimaryActionContext` lets each page register its primary action handler (Library page registers Sync; others register no-op).

### 6.2 Motion

- Page-load stagger: stats cells 40/90/140/190ms, then table rows 40ms apart capped at 720ms total. `cubic-bezier(.2,.7,.2,1)` 540ms.
- Pulse on sync-state dot: 1.8s ring expansion (`box-shadow` 0 → 10px → 0).
- Brand caret blink: 1.05s `steps(1)`.
- Row hover: 120ms `background` transition.
- Row actions slide-in: 120ms opacity 0→1.
- **All motion respects `prefers-reduced-motion: reduce`** — staggers become a single instant fade-in; pulse and caret blink stop.

The existing CSS class `.archive-rise` is renamed `.console-rise` (identical animation; rename so it documents the current aesthetic).

### 6.3 Accessibility

- All text on `#0a0a0a` passes WCAG AA. `--fg-faint #4a4a4a` (≈ 3.5:1) is reserved for non-content decoration (kbd chips, faint dividers, inactive bar segments).
- Focus rings: `outline: 2px solid var(--primary); outline-offset: 2px;` on every interactive element. Replaces the shadcn ring color.
- Drift state is **shape + color + label**, not color alone:
  - Solid / dashed / outlined segments.
  - Lime / amber / dim swatches.
  - Textual label (`3/4 in sync`, `codex · drift`).
- Tooltips on DriftBar segments are keyboard-reachable (Radix Tooltip handles this).
- The ⌘K shortcut is announced in the cmdbar; the cmdbar pill itself is `role="region" aria-label="Shortcuts"` so screen readers can scan it.

---

## 7 · Implementation phasing

One spec, one plan, three commits. Each commit builds + runs the app end-to-end.

### Commit 1 — Foundations

- Self-host Geist + Geist Mono into `public/fonts/geist/` and `public/fonts/geist-mono/` (5 weights each, woff2). Source: vercel/geist-font GitHub releases.
- Replace `src/styles/tokens.css` with the Console palette (both modes, font-face declarations, grid background, console-rise keyframe).
- Update `tailwind.config.ts`: drop editorial font stacks + sizes, install the Console scale.
- Update `src-tauri/tauri.conf.json`: `titleBarStyle: Overlay`, new dimensions.
- New `TitleBar` component, mounted in `AppShell` ahead of the shell grid.
- Rewrite `Sidebar` (compact mono nav, source/target sections, footer metadata).
- New `useGlobalShortcuts` hook + `⌘K` stub Dialog + `CmdBar` pill component + `PrimarySearchContext` / `PrimaryActionContext`.
- Restyle primitives in `src/components/ui/`: button, badge, input, dialog, sheet, table.
- Rename `archive-rise` → `console-rise` everywhere it's referenced.

Validation: existing pages render without breaking. They look transitional but functional — Sidebar, TitleBar, cmd palette stub all work end-to-end.

### Commit 2 — Library + drift bar

- Rewrite `LibraryPage` (crumb, title row, stats strip, toolbar with chips + search).
- Rewrite `LibraryTable` with the new column layout and row-hover actions.
- New `DriftBar` component (4 segments). Replace per-row DriftBadge stack with DriftBar.
- Rewrite `OwnerBadge` styles (drop unicode marks).
- Delete `OwnershipInbox`; Unknown skills render inline in the table with a `classify` action that opens `OwnershipPicker`.
- Wire `/` shortcut to focus the search input on the Library page (via `PrimarySearchContext`).
- Wire `⌘↵` to trigger `usePlanSync()` on the Library page (via `PrimaryActionContext`).
- Compute sparkline data for "Archived this week" from `audit.log`.

Validation: Library renders the mockup; filter chips, search filter, row-hover actions, click-to-drawer all work.

### Commit 3 — Targets, Activity, Settings, dialogs, drawer

- Rewrite `TargetCard` and `TargetsPage` with the Targets-page mockup pattern.
- Rewrite `ActivityList` and `ActivityPage`.
- Rewrite `SettingsForm` and `SettingsPage`.
- Restyle `SyncPreviewDialog` and `SkillDetailDrawer`.
- Update screenshots in `README.md` if any are referenced. (None currently; section is `## Screenshots` if added.)

Validation: every route looks like Console; settings round-trip works; sync preview dialog and skill detail drawer match the new style.

---

## 8 · Out of scope (explicit)

The following are deliberately not in this spec and will be follow-up work:

- **Real fuzzy ⌘K palette** with skill search, navigation, and sync actions. (Stub only.)
- **New Tauri commands or Rust changes.** None — pure frontend swap.
- **Linux/Windows window-chrome polish** beyond the platform-conditional padding on TitleBar.
- **Route reorganization** (no URL changes).
- **Toast / notification system overhaul.** Existing call sites stay where they are.
- **Native macOS rewrite.** Still Tauri + React.

---

## Files touched (estimate)

**New:**
- `public/fonts/geist/*.woff2` (5)
- `public/fonts/geist-mono/*.woff2` (4)
- `src/components/title-bar.tsx`
- `src/components/cmd-bar.tsx`
- `src/components/drift-bar.tsx` (per-skill, 4 fixed lanes — Library page)
- `src/components/health-bar.tsx` (per-target stacked health — Targets page)
- `src/hooks/use-global-shortcuts.ts`
- `src/lib/shortcut-context.tsx` (PrimarySearchContext + PrimaryActionContext)
- `src/components/ui/kbd.tsx` (small mono kbd chip primitive)
- `docs/superpowers/specs/2026-05-25-console-ui-design.md` (this spec)

**Rewritten:**
- `src/styles/tokens.css`
- `tailwind.config.ts`
- `src-tauri/tauri.conf.json`
- `src/components/app-shell.tsx`
- `src/components/sidebar.tsx`
- `src/components/library-table.tsx`
- `src/components/owner-badge.tsx`
- `src/components/drift-badge.tsx` (kept; restyled for drawer-only usage)
- `src/components/target-card.tsx`
- `src/components/activity-list.tsx`
- `src/components/settings-form.tsx`
- `src/components/sync-preview-dialog.tsx`
- `src/components/skill-detail-drawer.tsx`
- `src/components/ui/{button,badge,input,dialog,sheet,table}.tsx`
- `src/pages/{library,targets,activity,settings}.tsx`

**Deleted:**
- `src/components/ownership-inbox.tsx` (folded into the Library table).

---

## Open follow-ups (not blocking this spec)

- Real fuzzy ⌘K palette.
- Wire `Build .skill` button in `SkillDetailDrawer` to the existing packaging command.
- Audit log filtering & search.
- Diff viewer surface for the "diff" row action (currently the drawer's diff block is the only place).
