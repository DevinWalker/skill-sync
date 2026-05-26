/**
 * Centralized user-facing strings. Plain English. Second person.
 * Light gardening hints allowed in microcopy (empty states), but not
 * in nav or page H1s. Never raw error codes — always plain language.
 */

export const strings = {
  // Page titles + crumbs + subheads
  libraryTitle: "My Skills",
  libraryCrumb: (source: string) => `${source.replace(/^.*\/Users\/[^/]+/, "~")} › my skills`,
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

  // Status chips
  statusInSync: "In sync",
  statusOutOfSync: "Out of sync",
  statusNeedsClaiming: "Needs claiming",
  statusUnknown: "Unknown",
  statusNotInSource: "Not in your source",

  // Target card
  targetStatusActive: "In use",
  targetStatusOff: "Off",
  targetStatusNotSetUp: "Not set up",
  healthBarLabel: (synced: number, drift: number, blocked: number) =>
    `${synced} happy · ${drift} different · ${blocked} blocked`,

  // Filters
  activityFilters: ["All", "Synced", "Pulled in", "Removed", "Changes noticed"] as const,
  libraryFilters: ["All", "Mine", "Bundle", "Built-in", "Unknown", "Out of sync"] as const,

  // Diagnostics
  diagnosticsAuditRowLabel: "History file",

  // Buttons + actions
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

  // Microcopy
  nothingToTend: "Nothing to tend right now.",
} as const;

export type Strings = typeof strings;
