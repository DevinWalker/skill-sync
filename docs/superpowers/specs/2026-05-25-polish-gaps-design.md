# Polish Gaps — Design Spec

> Close nine polish gaps left from the vibe-dev friendly redesign ([2026-05-25-vibe-dev-friendly-design.md](./2026-05-25-vibe-dev-friendly-design.md)). Same architecture, same visual system, same Simple/Pro toggle — just finish the wiring.

- **Date:** 2026-05-25
- **Status:** Draft — awaiting user review
- **Branch base:** `claude/goofy-swirles-8b5480` (stacked PR off PR #3, not merged yet)
- **Scope:** Frontend wiring + two new Tauri commands + one struct extension. No new features, no visual changes.
- **Builds on:** [`2026-05-25-vibe-dev-friendly-design.md`](./2026-05-25-vibe-dev-friendly-design.md).

---

## 1 · Goal & non-goals

### Goal

PR #3 shipped the Simple/Pro mode toggle, Home page, scaffolder, git awareness, and first-run. Nine items came back as polish gaps during dogfooding. This spec closes them as a stacked follow-up PR so PR #3 doesn't grow further.

### Non-goals

- **No Simple/Pro toggle removal.** Considered and deferred — a separate decision worth its own PR.
- **No visual system changes.** Tokens, fonts, spacing, motion: untouched.
- **No new commands beyond the two listed.**
- **No copy module restructure.** Two new keys, that's it.
- **No per-skill last-modified column** in the Library Updated cell. `modified_at` is added to `LocationView` to power Compare, but threading it into the table is out of scope.

---

## 2 · Polish gap inventory

| # | Gap                                                | Severity | Touches Rust |
|---|----------------------------------------------------|----------|--------------|
| 1 | TargetCard missing Disable/Enable button           | low      | no           |
| 3 | Compare dialog timestamps fake (`yourUpdated`/`theirUpdated` are path strings) | high     | yes          |
| 4 | Compare dialog "Open both files" opens same file twice | high     | yes (same as #3) |
| 5 | `+ change source` sidebar opens text input, not folder picker | med      | no           |
| 6 | CmdBar shortcut hints stale (`G L library` actually goes to `/`) | low      | no           |
| 7 | `/packages` route is a 404 (sidebar link in Pro) | med      | yes          |
| 8 | `Build .skill` button in drawer is hardcoded disabled | med      | no (command already exists) |
| 9 | Library `Preview ⌘P` and `Sync mine` run identical handlers | low      | no           |
| 10 | Orphan `Remove from <tool>` is an `alert()` stub  | high     | yes          |

(Original item #2 — HealthBar counts — was dropped after verification: counts derive correctly from `useDrift()` in [target-card.tsx:29-41](../../../src/components/target-card.tsx).)

---

## 3 · Rust foundation

Three Rust changes underpin the rest. Doing them first lets the TS work proceed against stable bindings.

### 3.1 Extend `LocationView` with `modified_at`

Powers Compare dialog timestamps (#3) and the Packages page (#7) implicitly through the same `modified_at` pattern.

In `src-tauri/src/aggregator.rs`:

```rust
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/types/bindings.ts")]
pub struct LocationView {
    pub path: PathBuf,
    pub real_path: PathBuf,
    pub is_symlink: bool,
    pub hash: String,
    pub modified_at: String,   // RFC 3339, e.g. "2026-05-25T14:08:22Z"
    pub provenance: Provenance,
}
```

Construction in `list_skills`:

```rust
let modified_at = std::fs::metadata(&loc.real_path.join("SKILL.md"))
    .and_then(|m| m.modified())
    .ok()
    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
    .map(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.as_secs() as i64, 0))
    .flatten()
    .map(|dt| dt.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
    .unwrap_or_default();
```

Empty-string fallback is fine — `friendlyTime("")` already returns `—`.

**Bindings regen:** run `cd src-tauri && cargo test --quiet`. The `zz_bindings.rs` aggregator test re-emits `bindings.ts`. Verify the diff includes the new field on `LocationView`.

**Test:** add `aggregator_test.rs::location_view_carries_modified_at` — create a fixture skill, scan, assert `modified_at` parses as RFC 3339.

### 3.2 New command: `cmd_remove_from_target`

Powers orphan `Remove from <tool>` (#10).

Location: `src-tauri/src/ipc/remove_from_target.rs` (follows the per-command file pattern PR #3 introduced for `skills_scaffold.rs` and `git_status.rs`).

```rust
use std::path::PathBuf;
use crate::{
    audit::{append_audit, AuditEntry},
    config::settings::Settings,
    paths::Paths,
    trash::{MoveArchive, TrashAction},
};

#[derive(Debug, serde::Serialize, ts_rs::TS)]
#[ts(export, export_to = "../../../src/types/bindings.ts")]
pub struct RemoveResult {
    pub archived_to: PathBuf,
}

#[tauri::command]
pub fn cmd_remove_from_target(skill: String, target: String) -> Result<RemoveResult, String> {
    let home = dirs::home_dir().ok_or("no home dir")?;
    let paths = Paths::for_home(home.clone());

    let target_root = match target.as_str() {
        "claude" => paths.claude_skills(),
        "codex"  => paths.codex_skills(),
        "cursor" => paths.cursor_skills(),
        "cowork" => return Err("cowork is package-only, not directory-mirrored".into()),
        other    => return Err(format!("unknown target: {other}")),
    };

    let skill_path = target_root.join(&skill);
    if !skill_path.exists() {
        return Err(format!("{skill_path:?} does not exist"));
    }
    let meta = std::fs::symlink_metadata(&skill_path).map_err(|e| e.to_string())?;
    if meta.file_type().is_symlink() {
        return Err("refusing to remove a symlink".into());
    }

    let archive_root = paths.trash_archive_root();
    let label = format!("{target}-{skill}");
    let archived_to = TrashAction
        .archive(&skill_path, &archive_root, &label)
        .map_err(|e| e.to_string())?;

    append_audit(&paths, AuditEntry::now(
        "target.remove",
        serde_json::json!({ "skill": skill, "target": target, "archived_to": archived_to }),
    )).map_err(|e| e.to_string())?;

    Ok(RemoveResult { archived_to })
}
```

`TrashAction::archive` already does rename-then-send-to-Trash — same behavior the sync engine uses for overwrites. The remove is implicit in the rename step.

Register in `src-tauri/src/lib.rs::invoke_handler!` and `src-tauri/src/ipc/mod.rs`.

**Tests** (with `tempfile`):
- `remove_from_target_archives_directory` — creates a skill dir, removes it, asserts original is gone and archive dir contains the contents.
- `remove_from_target_refuses_symlink` — creates a symlink, asserts `Err("refusing to remove a symlink")`.
- `remove_from_target_missing_path` — asserts `Err(".. does not exist")`.
- `remove_from_target_writes_audit` — asserts an `AuditEntry { kind: "target.remove", .. }` is appended.

Tests must wire `Paths::for_home(tempdir)` rather than the real home; existing tests in `sync_test.rs` show the pattern.

### 3.3 New command: `cmd_list_packages`

Powers the Packages page (#7).

Location: `src-tauri/src/ipc/list_packages.rs`.

```rust
use std::path::PathBuf;

#[derive(Debug, serde::Serialize, ts_rs::TS)]
#[ts(export, export_to = "../../../src/types/bindings.ts")]
pub struct PackageInfo {
    pub name: String,
    pub path: PathBuf,
    pub size_bytes: u64,
    pub modified_at: String,
}

#[tauri::command]
pub fn cmd_list_packages() -> Result<Vec<PackageInfo>, String> {
    use crate::{config::{load_or_init, settings::Settings}, paths::Paths};
    let home = dirs::home_dir().ok_or("no home dir")?;
    let paths = Paths::for_home(home.clone());
    let settings: Settings = load_or_init(
        &paths.config_dir().join("settings.json"),
        Settings::defaults(&home),
    ).map_err(|e| e.to_string())?;

    let dir = PathBuf::from(&settings.package_output_dir);
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(vec![]),  // missing dir = empty list, not an error
    };

    let mut packages: Vec<PackageInfo> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|x| x == "skill"))
        .filter_map(|e| {
            let meta = e.metadata().ok()?;
            let modified = meta.modified().ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .and_then(|d| chrono::DateTime::<chrono::Utc>::from_timestamp(d.as_secs() as i64, 0))
                .map(|dt| dt.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
                .unwrap_or_default();
            Some(PackageInfo {
                name: e.file_name().to_string_lossy().to_string(),
                path: e.path(),
                size_bytes: meta.len(),
                modified_at: modified,
            })
        })
        .collect();
    packages.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    Ok(packages)
}
```

Register in `lib.rs` + `ipc/mod.rs`.

**Tests:**
- `list_packages_empty_dir` — missing dir, returns `Ok(vec![])`.
- `list_packages_filters_extension` — dir with `.skill`, `.zip`, `.txt`; only `.skill` returned.
- `list_packages_sorts_mtime_desc` — two files, newer first.

---

## 4 · Frontend gap-by-gap

### 4.1 Target card Disable button (#1)

[src/components/target-card.tsx](../../../src/components/target-card.tsx) currently shows two actions (Reveal in Finder, Test). Add a third that toggles `settings.enabled_targets`.

```tsx
const { mutate: toggleEnabled } = useToggleTargetEnabled();
// ...
<button
  onClick={() => toggleEnabled(name)}
  disabled={busy}
  className="...same ghost style as the others..."
>
  {isEnabled ? c.turnOff : c.turnOn}
</button>
```

New mutation hook `useToggleTargetEnabled()` in `src/hooks/use-settings.ts` — patches `enabled_targets` and `setSettings`.

Add `turnOn` keys to [src/lib/copy.ts](../../../src/lib/copy.ts):
- Simple: `turnOn: "Turn on"`
- Pro: `turnOn: "Enable"`

No confirmation dialog — toggle is reversible.

### 4.2 Compare dialog timestamps + per-target paths (#3, #4)

Depends on §3.1 (`modified_at` field).

**Helper:** new `src/lib/target-locations.ts`:

```ts
import type { LocationView, SkillView } from "@/types/bindings";

export function locationsByTarget(
  skill: SkillView,
  sourceRoot: string,
): { source?: LocationView; byTarget: Record<string, LocationView | undefined> } {
  const byTarget: Record<string, LocationView | undefined> = {};
  let source: LocationView | undefined;
  for (const loc of skill.locations) {
    const p = String(loc.path);
    if (sourceRoot && p.startsWith(sourceRoot)) {
      if (!source) source = loc;
      continue;
    }
    const t = inferTarget(p);
    if (t && !byTarget[t]) byTarget[t] = loc;
  }
  // Fallback when source_root is empty or no location matched it.
  if (!source) source = skill.locations[0];
  return { source, byTarget };
}

function inferTarget(path: string): string | null {
  if (path.includes("/.claude/skills/"))  return "claude";
  if (path.includes("/.codex/skills/"))   return "codex";
  if (path.includes("/.cursor/skills"))   return "cursor";
  return null;
}
```

The source location is whichever `LocationView` lives under `settings.source_root`; per-target locations are inferred from the well-known install paths. Returning both in one call keeps the drawer code simple.

**Drawer wiring** ([skill-detail-drawer.tsx](../../../src/components/skill-detail-drawer.tsx)):

```tsx
const { data: settings } = useSettings();
const { source: sourceLoc, byTarget } = useMemo(
  () => locationsByTarget(skill, settings?.source_root ?? ""),
  [skill, settings?.source_root],
);
// ...
{compareTarget && (
  <CompareDialog
    open={!!compareTarget}
    onClose={() => setCompareTarget(null)}
    skillName={skill.name}
    tool={compareTarget}
    yourPath={String(sourceLoc?.path ?? "")}
    yourUpdated={sourceLoc?.modified_at ?? ""}
    theirPath={String(byTarget[compareTarget]?.path ?? "")}
    theirUpdated={byTarget[compareTarget]?.modified_at ?? ""}
  />
)}
```

`CompareDialog` itself unchanged — `friendlyTime` already handles ISO strings, returning `—` for empty.

### 4.3 Source picker (#5)

Shared helper `src/lib/pick-source-folder.ts`:

```ts
import { open } from "@tauri-apps/plugin-dialog";
import { ipc } from "./ipc";

export async function pickSourceFolder(
  current: string,
  setSettings: (next: Partial<Settings>) => Promise<void>,
): Promise<void> {
  const picked = await open({ directory: true, defaultPath: current });
  if (typeof picked === "string") {
    await setSettings({ source_root: picked });
  }
}
```

**Sidebar** ([sidebar.tsx](../../../src/components/sidebar.tsx)): convert `<NavLink>` to `<button>`:

```tsx
<button
  type="button"
  onClick={() => pickSourceFolder(sourceRoot, updateSettings)}
  className="px-2.5 py-1 block font-mono text-[11px] text-fg-dim hover:text-foreground text-left w-full"
>
  + change source
</button>
```

Same dim-mono style preserved.

**Settings form** ([settings-form.tsx](../../../src/components/settings-form.tsx)): add a `Choose folder…` button next to the existing text input:

```tsx
<div className="flex gap-2">
  <input ... existing ... />
  <button
    type="button"
    onClick={() => pickSourceFolder(data.source_root, update)}
    disabled={busy}
    className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50 whitespace-nowrap"
  >
    Choose folder…
  </button>
</div>
```

Text input retained for paste / show full path.

### 4.4 Shortcut bindings + CmdBar pill (#6)

[use-global-shortcuts.ts](../../../src/hooks/use-global-shortcuts.ts): rebind:

```ts
switch (e.key.toLowerCase()) {
  case "h": e.preventDefault(); navigate("/"); return;          // NEW
  case "l": e.preventDefault(); navigate("/library"); return;   // CHANGED from "/"
  case "t": e.preventDefault(); navigate("/targets"); return;
  case "a": e.preventDefault(); navigate("/activity"); return;
  case "s": e.preventDefault(); navigate("/settings"); return;
}
```

[cmd-bar.tsx](../../../src/components/cmd-bar.tsx): add `G H home` chip between `/ filter` and `G L library`:

```tsx
<span className="flex items-center gap-1.5"><Kbd>G</Kbd><Kbd>H</Kbd><span>home</span></span>
<span className="text-fg-faint">·</span>
<span className="flex items-center gap-1.5"><Kbd>G</Kbd><Kbd>L</Kbd><span>library</span></span>
```

### 4.5 Packages route (#7)

Depends on §3.3 (`cmd_list_packages`).

New `src/pages/packages.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useSettings } from "@/hooks/use-settings";
import { ipc } from "@/lib/ipc";
import { friendlyTime } from "@/lib/time";

export function PackagesPage() {
  const { data: settings } = useSettings();
  const { data: pkgs } = useQuery({
    queryKey: ["packages"],
    queryFn: () => ipc.listPackages(),
  });

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint mb-3">
          {(settings?.source_root ?? "").replace(/^.*\/Users\/[^/]+/, "~")} › packages
        </div>
        <h1 className="font-display text-2xl text-foreground">Packages</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          {settings?.package_output_dir ?? "—"}
        </div>
      </div>

      <div className="px-8 pb-12 mt-6">
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_140px_120px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">File</div>
            <div className="eyebrow text-right">Size</div>
            <div className="eyebrow">Updated</div>
            <div className="eyebrow"></div>
          </div>
          {!pkgs?.length ? (
            <div className="px-3.5 py-10 text-center font-mono text-[11.5px] text-fg-dim">
              No .skill files yet. Use Build .skill in the drawer to generate one.
            </div>
          ) : (
            <ul>
              {pkgs.map((p) => (
                <li key={p.name} className="grid grid-cols-[1fr_120px_140px_120px] gap-x-3 items-center px-3.5 py-3 border-b border-border last:border-b-0">
                  <div className="text-foreground font-medium text-sm truncate">{p.name}</div>
                  <div className="font-mono text-[11.5px] text-fg-dim text-right">{(p.size_bytes / 1024).toFixed(1)} kB</div>
                  <div className="font-mono text-[11.5px] text-muted-foreground">{friendlyTime(p.modified_at)}</div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => revealItemInDir(String(p.path)).catch(() => {})}
                      className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:bg-bg-hover"
                    >
                      Reveal
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
```

[routes.tsx](../../../src/routes.tsx): register `{ path: "packages", element: <PackagesPage /> }`.

`ipc.listPackages()` wrapper in [src/lib/ipc.ts](../../../src/lib/ipc.ts).

The route is reachable from any mode but only the Pro sidebar links to it (existing behavior unchanged).

### 4.6 Build .skill button wiring (#8)

[skill-detail-drawer.tsx](../../../src/components/skill-detail-drawer.tsx) — replace the hardcoded `disabled` block:

```tsx
{mode === "pro" && (
  <button
    onClick={() => buildPackage.mutate(skill.name)}
    disabled={buildPackage.isPending}
    className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
  >
    {buildPackage.isPending ? "Building…" : "Build .skill"}
  </button>
)}
```

New mutation hook `useBuildPackage()` in [src/hooks/use-sync.ts](../../../src/hooks/use-sync.ts):

```ts
export function useBuildPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skill: string) => ipc.buildPackage(skill),
    onSuccess: (path) => {
      toast.success(`Built ${path.split("/").pop()}`, {
        action: { label: "Reveal", onClick: () => revealItemInDir(path) },
      });
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (err) => toast.error(`Build failed: ${err}`),
  });
}
```

`ipc.buildPackage` already exists (calls registered `cmd_build_package`).

### 4.7 Preview as read-only dialog (#9)

[sync-preview-dialog.tsx](../../../src/components/sync-preview-dialog.tsx): add `readOnly?: boolean` prop. When true:
- Title: `Preview — sync plan` (was `Sync plan`).
- Execute button: hidden.
- Close button label: `Close` (was `Cancel`).

[library.tsx](../../../src/pages/library.tsx):

```tsx
const [plan, setPlan] = useState<{ rows: SyncPlan; readOnly: boolean } | null>(null);

// Preview:
<button onClick={() => planMut.mutate(undefined, {
  onSuccess: (p) => setPlan({ rows: p, readOnly: true }),
})}>Preview <Kbd>⌘</Kbd><Kbd>P</Kbd></button>

// Sync mine:
<button onClick={() => planMut.mutate(undefined, {
  onSuccess: (p) => setPlan({ rows: p, readOnly: false }),
})}>Sync mine ↵</button>

// Dialog:
<SyncPreviewDialog
  plan={plan?.rows ?? null}
  readOnly={plan?.readOnly}
  open={!!plan}
  onOpenChange={(v) => !v && setPlan(null)}
/>
```

The `⌘P` shortcut isn't currently wired; add it alongside the existing `⌘N` / `⌘↵` in `use-global-shortcuts.ts`:

```ts
if (meta && e.key.toLowerCase() === "p") {
  e.preventDefault();
  // Trigger the Preview action — only meaningful on /library.
  // Use a new shortcut-context channel; or check pathname directly.
  ...
}
```

The simplest wiring: add `PreviewActionProvider` + `usePreviewAction()` next to the existing `PrimaryActionProvider`/`usePrimaryAction()` in [src/lib/shortcut-contexts.tsx](../../../src/lib/shortcut-contexts.tsx) (same ref-based pattern), then call `setAction(...)` from `library.tsx`. Mount the provider alongside `PrimaryActionProvider` in `app-shell.tsx`.

### 4.8 Orphan Remove handler (#10)

Depends on §3.2 (`cmd_remove_from_target`).

[library.tsx](../../../src/pages/library.tsx): replace the `alert()`:

```tsx
const [removeTarget, setRemoveTarget] = useState<{ skill: string; tool: string } | null>(null);
const removeMut = useRemoveFromTarget();

const removeFromTarget = (name: string, tool: string) =>
  setRemoveTarget({ skill: name, tool });

const confirmRemove = () => {
  if (!removeTarget) return;
  removeMut.mutate(removeTarget, {
    onSuccess: ({ archived_to }) => {
      toast.success(`Removed ${removeTarget.skill} from ${removeTarget.tool}`, {
        action: { label: "Reveal archive", onClick: () => revealItemInDir(String(archived_to)) },
      });
      setRemoveTarget(null);
    },
  });
};
```

Confirmation via Radix `AlertDialog`:

```tsx
<AlertDialog.Root open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay className="fixed inset-0 bg-black/60" />
    <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-5">
      <AlertDialog.Title className="font-display text-lg">
        Remove {removeTarget?.skill} from {removeTarget?.tool}?
      </AlertDialog.Title>
      <AlertDialog.Description className="text-[13px] text-muted-foreground mt-2">
        Skill Sync will move it to ~/.Trash/skill-sync-archive first so you can restore it from Finder.
      </AlertDialog.Description>
      <div className="mt-5 flex justify-end gap-2">
        <AlertDialog.Cancel className="rounded-md border border-border px-3 py-1.5 text-[12.5px]">Cancel</AlertDialog.Cancel>
        <AlertDialog.Action onClick={confirmRemove} className="rounded-md bg-destructive px-3 py-1.5 text-[12.5px] text-white">
          Remove from {removeTarget?.tool}
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
```

New `useRemoveFromTarget()` mutation in `use-sync.ts`. On success, invalidates `skills` + `drift` queries — orphan list re-derives.

`ipc.removeFromTarget(skill, tool)` wrapper in `src/lib/ipc.ts`.

---

## 5 · Files touched

### 5.1 New (4 + 2 Rust)

- `src/pages/packages.tsx`
- `src/lib/pick-source-folder.ts`
- `src/lib/target-locations.ts`
- `src-tauri/src/ipc/remove_from_target.rs`
- `src-tauri/src/ipc/list_packages.rs`

### 5.2 Modified

**TypeScript:**
- `src/components/target-card.tsx` — Disable button
- `src/components/skill-detail-drawer.tsx` — Compare wiring + Build .skill wiring
- `src/components/sync-preview-dialog.tsx` — `readOnly` prop
- `src/components/sidebar.tsx` — source picker button
- `src/components/settings-form.tsx` — Choose folder button
- `src/components/cmd-bar.tsx` — pill chips
- `src/hooks/use-global-shortcuts.ts` — G H + G L rebinds + ⌘P
- `src/hooks/use-sync.ts` — `useBuildPackage`, `useRemoveFromTarget`
- `src/hooks/use-settings.ts` — `useToggleTargetEnabled`
- `src/lib/copy.ts` — `turnOn` key in both modes
- `src/lib/ipc.ts` — `listPackages`, `removeFromTarget`, `buildPackage` if missing
- `src/lib/shortcut-contexts.ts` — `usePreviewAction`
- `src/pages/library.tsx` — Preview/Sync split, AlertDialog, removeFromTarget rewire
- `src/routes.tsx` — `/packages` route

**Rust:**
- `src-tauri/src/aggregator.rs` — `modified_at` on `LocationView`
- `src-tauri/src/ipc/mod.rs` — module registration
- `src-tauri/src/lib.rs` — `invoke_handler!`
- `src-tauri/tests/aggregator_test.rs` — `modified_at` test
- `src-tauri/tests/zz_bindings.rs` — register new types if needed

### 5.3 Deleted

None.

---

## 6 · Validation checklist

Per polish gap, manual click-through (`pnpm tauri dev`):

- [ ] **#1** TargetCard shows Disable when enabled; clicking flips status pill to Off and label to Enable; clicking again restores. Both modes.
- [ ] **#3** Open drawer for a drifted skill; click `compare`; dialog shows real friendly timestamps for both sides, not "—".
- [ ] **#4** From the Compare dialog, click `Open both files` — Finder opens both the source and the per-target file (separate paths).
- [ ] **#5** Sidebar `+ change source` opens a folder picker; selecting writes the new path and surfaces via sidebar + Settings. Settings `Choose folder…` button does the same.
- [ ] **#6** CmdBar shows `G H home · G L library`; pressing `G H` from outside a text input navigates to `/`; `G L` navigates to `/library`.
- [ ] **#7** Pro sidebar `Packages` link opens a page listing built `.skill` files (or the empty state if none exist). Reveal in Finder works.
- [ ] **#8** Drawer `Build .skill` (Pro only) is enabled; clicking shows `Building…`, then a success toast with `Reveal`; the resulting file appears in the Packages page.
- [ ] **#9** Preview opens the SyncPreviewDialog with title `Preview — sync plan` and no Execute button. Sync mine opens the same dialog with Execute available.
- [ ] **#10** Orphan `Remove from <tool>` opens AlertDialog; confirming removes the skill from the target's directory (verified in Finder), shows toast with `Reveal archive`, and the orphan row disappears from the Library.

Rust tests:

- [ ] `cd src-tauri && cargo test --quiet` — all green, including the new `aggregator_test.rs::location_view_carries_modified_at` and `remove_from_target_*` + `list_packages_*` tests.
- [ ] `bindings.ts` regenerates with `modified_at` on `LocationView` and new `RemoveResult`, `PackageInfo` types.

---

## 7 · Out of scope (explicit follow-ups)

- Simple/Pro toggle removal — separate decision, separate PR.
- Per-skill last-modified column in the Library table (data is now available but threading it through `library-table.tsx` Updated cell is deferred).
- `cmd_build_package` smarter status reporting (progress events, stderr capture).
- Symlinked-skill remove path (currently refused — surface as user-friendly error).
- Packages page sorting/filtering controls.
- Activity entry showing `target.remove` in the History feed with a sensible sentence template (the audit entry is written; rendering is the follow-up).
