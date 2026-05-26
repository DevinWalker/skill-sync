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
    libraryCrumb: (_source: string) => `home › my skills`,
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
    turnOn: "Turn on",
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
    turnOn: "Enable",
    nothingToTend: "no drift detected.",
    migrationToast:
      "We added a Simple mode that hides the deeper details. You're in Pro now.",
    tryThisSimple: "Try Simple",
    stayInPro: "Stay in Pro",
  },
} as const;

export type CopyMap = typeof copy.simple;
