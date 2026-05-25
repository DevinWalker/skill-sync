# Console UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Provenance Archive" editorial UI with the **Console** aesthetic — dark-first, Geist + Geist Mono self-hosted, lime accent, mono-forward chrome, working keyboard shortcuts — across all four pages and the two surface dialogs.

**Architecture:** Pure frontend refactor — `src/styles/tokens.css`, `tailwind.config.ts`, `src-tauri/tauri.conf.json` (one tweak), and the React component tree. No new Tauri commands, no Rust changes, no behavior changes. Shadcn token names retained so primitives inherit on token swap. Three sequential commits: Foundations → Library → Other pages.

**Tech Stack:** Tauri 2 + Vite + React 19 + TypeScript + Tailwind 3 + shadcn/ui + Radix + Zustand + TanStack Query. Variable woff2 fonts from `vercel/geist-font`.

**Verification model.** This project has no test framework and the spec is explicitly UI-only. Verification at each task is **(a)** `pnpm build` (which runs `tsc` first — catches type breakage) and **(b)** `pnpm tauri dev` for visual checks at noted checkpoints. Adding vitest is out of scope.

**Spec:** [`docs/superpowers/specs/2026-05-25-console-ui-design.md`](../specs/2026-05-25-console-ui-design.md)

---

## File structure

### New

- `public/fonts/Geist-Variable.woff2`
- `public/fonts/GeistMono-Variable.woff2`
- `src/components/title-bar.tsx` — 36px overlay bar with brand + sync state + version
- `src/components/cmd-bar.tsx` — floating bottom-center pill listing shortcuts
- `src/components/cmd-palette.tsx` — ⌘K stub Dialog
- `src/components/drift-bar.tsx` — per-skill 4-lane drift visualizer (Library)
- `src/components/health-bar.tsx` — per-target stacked health bar (Targets)
- `src/components/sparkline.tsx` — tiny CSS bar sparkline
- `src/components/ui/kbd.tsx` — mono kbd chip primitive
- `src/hooks/use-global-shortcuts.ts` — registers ⌘K, /, ⌘↵, G L/T/A/S, Esc
- `src/hooks/use-platform.ts` — exposes macOS / other for chrome conditionals
- `src/lib/shortcut-contexts.tsx` — `PrimarySearchContext` + `PrimaryActionContext`
- `src/lib/audit.ts` — bucket helpers for "archived this week" sparkline

### Rewritten

- `src/styles/tokens.css` — new palette + @font-face + grid background + `console-rise`
- `tailwind.config.ts` — new font stacks + Console type scale
- `src-tauri/tauri.conf.json` — `titleBarStyle: Overlay`, new window dimensions
- `src/components/app-shell.tsx` — mounts TitleBar + CmdBar; provides shortcut contexts
- `src/components/sidebar.tsx` — compact mono nav, source/target sections, footer
- `src/components/library-table.tsx` — new column layout; DriftBar; row-hover actions
- `src/components/owner-badge.tsx` — new chip system, no unicode marks
- `src/components/drift-badge.tsx` — restyled, retained for drawer single-target use
- `src/components/target-card.tsx` — new card layout + HealthBar
- `src/components/activity-list.tsx` — dense table rendering
- `src/components/settings-form.tsx` — labeled row layout under mono section headings
- `src/components/sync-preview-dialog.tsx` — Console-styled
- `src/components/skill-detail-drawer.tsx` — section-based Console layout
- `src/components/ui/{button,badge,input,dialog,sheet,table}.tsx` — restyled
- `src/pages/{library,targets,activity,settings}.tsx` — new headers + structure
- `vite.config.ts` — inject `VITE_BUILD_SHA` from `git rev-parse --short HEAD`

### Deleted

- `src/App.css` — unused Vite scaffold (verified: not imported anywhere)
- `src/components/ownership-inbox.tsx` — folded into Library table row

---

# PHASE 1 — Foundations

The result of this phase: app boots into the new chrome (title bar, sidebar, cmdbar, tokens, fonts, shortcuts). Existing pages still render — they pick up the new colors automatically but their internal layouts stay editorial. The phase ends with one commit titled `ui(console): foundations — tokens, fonts, chrome, shortcuts`.

---

### Task 1: Bring in Geist + Geist Mono variable fonts

**Files:**
- Create: `public/fonts/Geist-Variable.woff2`
- Create: `public/fonts/GeistMono-Variable.woff2`

- [ ] **Step 1: Fetch the two variable woff2 files from vercel/geist-font**

Run:
```bash
mkdir -p public/fonts
curl -L -o public/fonts/Geist-Variable.woff2 \
  https://github.com/vercel/geist-font/raw/main/packages/next/dist/fonts/geist-sans/Geist-Variable.woff2
curl -L -o public/fonts/GeistMono-Variable.woff2 \
  https://github.com/vercel/geist-font/raw/main/packages/next/dist/fonts/geist-mono/GeistMono-Variable.woff2
```

Expected: both files land in `public/fonts/`, each ~50–150 kB.

- [ ] **Step 2: Verify file sizes are sane (not 404 HTML pages)**

Run: `ls -lh public/fonts/`

Expected: two `.woff2` files each over 30 kB. If either is under 5 kB you fetched an HTML 404 — drop into the repo and grab them manually from a Vercel Geist GitHub release instead.

- [ ] **Step 3: Commit the fonts**

```bash
git add public/fonts/
git commit -m "ui(console): self-host Geist + Geist Mono variable fonts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Replace tokens.css with the Console palette

**Files:**
- Modify: `src/styles/tokens.css` (full rewrite)

- [ ] **Step 1: Replace `src/styles/tokens.css` with Console tokens**

Write the file with this exact content:

```css
/* CONSOLE — pitch-black canvas, lime accent, mono-forward.
   Self-hosted Geist + Geist Mono. Token names match shadcn so
   primitives inherit on theme swap. */

@font-face {
  font-family: "Geist";
  src: url("/fonts/Geist-Variable.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Geist Mono";
  src: url("/fonts/GeistMono-Variable.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

:root {
  /* DARK is the canonical Console theme. Applied when html.dark is present. */
  /* :root holds LIGHT defaults. */

  --background:           #fafafa;
  --foreground:           #0a0a0a;
  --card:                 #ffffff;
  --card-foreground:      #0a0a0a;
  --popover:              #ffffff;
  --popover-foreground:   #0a0a0a;

  --primary:              #6f8d18;        /* lime, darkened for AA on white */
  --primary-foreground:   #ffffff;

  --secondary:            #f1f1f1;
  --secondary-foreground: #0a0a0a;
  --muted:                #f1f1f1;
  --muted-foreground:     #6b6b6b;
  --accent:               #f1f1f1;
  --accent-foreground:    #0a0a0a;

  --destructive:          #c4321a;
  --destructive-foreground: #ffffff;

  --border:               #ebebeb;
  --input:                #ebebeb;
  --ring:                 #6f8d18;

  --success:              #6f8d18;
  --warning:              #b56a00;
  --danger:               #c4321a;
  --info:                 #1d72c4;
  --violet:               #7a4cd6;

  /* Console working aliases */
  --fg-dim:               #8a8a8a;
  --fg-faint:             #b3b3b3;
  --border-strong:        #d4d4d4;
  --bg-hover:             #f3f3f3;
  --accent-glow:          rgba(111,141,24,0.18);

  --radius:               6px;
  --radius-lg:            10px;

  --font-display: "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-body:    "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono:    "Geist Mono", ui-monospace, "JetBrains Mono", Menlo, monospace;
}

.dark {
  --background:           #0a0a0a;
  --foreground:           #ededed;
  --card:                 #0f0f0f;
  --card-foreground:      #ededed;
  --popover:              #141414;
  --popover-foreground:   #ededed;

  --primary:              #d3ec5a;
  --primary-foreground:   #0a0a0a;

  --secondary:            #181818;
  --secondary-foreground: #ededed;
  --muted:                #181818;
  --muted-foreground:     #a1a1a1;
  --accent:               #181818;
  --accent-foreground:    #ededed;

  --destructive:          #f5544c;
  --destructive-foreground: #0a0a0a;

  --border:               #1c1c1c;
  --input:                #1c1c1c;
  --ring:                 #d3ec5a;

  --success:              #d3ec5a;
  --warning:              #f5a524;
  --danger:               #f5544c;
  --info:                 #5ec2ff;
  --violet:               #b78cff;

  --fg-dim:               #6f6f6f;
  --fg-faint:             #4a4a4a;
  --border-strong:        #262626;
  --bg-hover:             #181818;
  --accent-glow:          rgba(211,236,90,0.18);
}

html, body {
  background: var(--background);
  color: var(--foreground);
}
body {
  font-family: var(--font-body);
  font-size: 13.5px;
  font-feature-settings: "ss01", "cv11", "tnum", "kern", "calt";
  -webkit-font-smoothing: antialiased;
  /* Subtle atmosphere: two faint radial gradients. NO paper-grain noise. */
  background-image:
    radial-gradient(1200px 600px at 80% -10%, var(--accent-glow), transparent 60%),
    radial-gradient(800px 500px at -10% 110%, rgba(94,194,255,0.03), transparent 60%);
  background-attachment: fixed;
}

code, .mono, .font-mono {
  font-family: var(--font-mono);
  font-feature-settings: "ss02", "zero", "calt", "tnum";
}
.font-display { font-family: var(--font-display); letter-spacing: -0.02em; }
.font-body    { font-family: var(--font-body); }

/* Eyebrow label — mono uppercase, used throughout */
.eyebrow {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--fg-dim);
  font-weight: 500;
}

/* Hairline rule */
.rule { border-color: var(--border); }

/* Grid background — subtle, on <main> only via a utility class */
.console-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(900px 500px at 40% 0%, black, transparent 75%);
          mask-image: radial-gradient(900px 500px at 40% 0%, black, transparent 75%);
}
:root:not(.dark) .console-grid {
  background-image:
    linear-gradient(rgba(0,0,0,0.020) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.020) 1px, transparent 1px);
}

/* Page-load stagger */
@keyframes console-rise {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.console-rise {
  animation: console-rise 540ms cubic-bezier(.2, .7, .2, 1) both;
}

/* Lime caret blink */
@keyframes caret-blink { 50% { opacity: 0; } }

/* Pulse halo */
@keyframes console-pulse {
  0%   { box-shadow: 0 0 0 0 var(--accent-glow); }
  70%  { box-shadow: 0 0 0 10px rgba(211,236,90,0); }
  100% { box-shadow: 0 0 0 0 rgba(211,236,90,0); }
}

::selection { background: color-mix(in oklch, var(--primary) 30%, transparent); color: var(--foreground); }

@media (prefers-reduced-motion: reduce) {
  .console-rise { animation: none; opacity: 1; transform: none; }
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 2: Run a typecheck pass to surface broken references**

Run: `pnpm build`

Expected: build may fail because Tailwind references unused tokens removed in Task 3 — that's fine, fix in next task. If TypeScript errors mention specific files, note them; they'll be addressed in later tasks.

- [ ] **Step 3: Run dev to verify fonts load and dark mode is the default-or-toggled palette**

Run: `pnpm tauri dev` (leave running in another shell)

Expected: app boots; text renders in Geist (rounded G, distinctive "a"). Open the macOS app menu → View, or whatever your system theme is set to. Toggle theme in Settings if dark isn't already on.

If text is rendering in serif still, the @font-face URL is wrong — open browser devtools (Cmd+Opt+I on the Tauri window), check Network tab, the woff2 requests should be 200.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css
git commit -m "ui(console): replace tokens — Console palette, both modes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Update Tailwind config — Console type scale and font stacks

**Files:**
- Modify: `tailwind.config.ts` (full rewrite)

- [ ] **Step 1: Replace `tailwind.config.ts` with the Console config**

Write the file with this content:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        input: "var(--input)",
        ring: "var(--ring)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        violet: "var(--violet)",
        "fg-dim": "var(--fg-dim)",
        "fg-faint": "var(--fg-faint)",
        "bg-hover": "var(--bg-hover)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 2px)",
      },
      fontFamily: {
        display: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        body:    ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        sans:    ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ["Geist Mono", "ui-monospace", "JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["10px",   { lineHeight: "1.5", letterSpacing: "0.18em" }],
        xs:    ["11px",   { lineHeight: "1.5" }],
        sm:    ["12.5px", { lineHeight: "1.5" }],
        base:  ["13.5px", { lineHeight: "1.55" }],
        lg:    ["17px",   { lineHeight: "1.4" }],
        xl:    ["22px",   { lineHeight: "1.3",  letterSpacing: "-0.01em" }],
        "2xl": ["28px",   { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "3xl": ["36px",   { lineHeight: "1.02", letterSpacing: "-0.025em" }],
      },
      letterSpacing: {
        widest: "0.22em",
      },
      animation: {
        "console-rise": "console-rise 540ms cubic-bezier(.2,.7,.2,1) both",
        "console-pulse": "console-pulse 1.8s ease-out infinite",
        "caret-blink": "caret-blink 1.05s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 2: Run `pnpm build` and resolve any token reference errors**

Run: `pnpm build`

Expected: any remaining type errors are in components referencing now-removed Fraunces `fontVariationSettings` calls. Note them down — they'll be fixed in later tasks when each component is rewritten. For now, if a single editorial style breaks the build, comment out the offending `style={{ fontVariationSettings: ... }}` lines but don't touch the surrounding layout.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "ui(console): tailwind — Geist stacks, Console type scale

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Update Tauri window config — Overlay title bar, larger window

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update the window config block**

Replace the `windows` array in `src-tauri/tauri.conf.json`:

```json
"windows": [
  {
    "title": "Skill Sync",
    "width": 1280,
    "height": 800,
    "minWidth": 980,
    "minHeight": 600,
    "titleBarStyle": "Overlay",
    "decorations": true
  }
]
```

- [ ] **Step 2: Restart Tauri dev to pick up window config**

Stop the running `pnpm tauri dev` (Ctrl+C). Start it again: `pnpm tauri dev`

Expected: window opens at 1280×800. On macOS, traffic lights float over the upper-left of the webview content (no native title strip above them). On Linux/Windows: standard decorated window.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "ui(console): tauri window — overlay title bar, 1280x800

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Inject git short-sha as a Vite define

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Read current vite.config.ts**

Open `vite.config.ts` and note the current `defineConfig` shape (it likely exports `react()` plugin and a server block for Tauri's port). Add a `define` field.

- [ ] **Step 2: Add the define block**

Add an import and modify the config:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

let buildSha = "dev";
try {
  buildSha = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* not a git checkout — fall through */
}

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_BUILD_SHA": JSON.stringify(buildSha),
  },
  /* keep the existing server/clearScreen options if present */
});
```

Merge with whatever Tauri-specific server config exists; don't replace it.

- [ ] **Step 3: Verify dev still runs and the env var is exposed**

Run: `pnpm tauri dev`

In the running app, open devtools console and type `import.meta.env.VITE_BUILD_SHA`. Expected: a 7-char hex string (or `"dev"` if not in git).

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "ui(console): vite — expose git short-sha as VITE_BUILD_SHA

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Platform detection hook

**Files:**
- Create: `src/hooks/use-platform.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useState } from "react";
import { platform } from "@tauri-apps/plugin-os";

export type Platform = "macos" | "linux" | "windows" | "other";

function detect(p: string): Platform {
  if (p === "macos") return "macos";
  if (p === "linux") return "linux";
  if (p === "windows") return "windows";
  return "other";
}

export function usePlatform(): Platform {
  const [p, setP] = useState<Platform>("macos");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await platform();
        if (!cancelled) setP(detect(result));
      } catch {
        /* outside Tauri or plugin not initialised */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return p;
}
```

- [ ] **Step 2: Add the `@tauri-apps/plugin-os` package**

Run: `pnpm add @tauri-apps/plugin-os`

Then add it in `src-tauri/Cargo.toml` under `[dependencies]` (Tauri 2 plugins require both):

```toml
tauri-plugin-os = "2"
```

And register it in `src-tauri/src/lib.rs` or wherever the existing plugins are registered, looking for the `tauri::Builder` chain:

```rust
.plugin(tauri_plugin_os::init())
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

Expected: clean. If the Cargo dep needs to be added, run `pnpm tauri dev` (Tauri will rebuild Rust automatically).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-platform.ts package.json pnpm-lock.yaml src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "ui(console): platform detection hook + tauri-plugin-os

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Kbd primitive

**Files:**
- Create: `src/components/ui/kbd.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono text-[10px] leading-none",
        "px-1.5 py-0.5 rounded-[3px]",
        "border border-border bg-card text-fg-dim",
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: no new errors. The component isn't imported anywhere yet.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/kbd.tsx
git commit -m "ui(console): Kbd primitive

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Shortcut contexts

**Files:**
- Create: `src/lib/shortcut-contexts.tsx`

- [ ] **Step 1: Write the contexts**

```tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

// — PrimarySearchContext ——————————————————————————————
// Pages register the ref of their primary search input here.
// The "/" global shortcut focuses whatever ref is currently registered.

interface PrimarySearchValue {
  register: (ref: RefObject<HTMLInputElement | null>) => void;
  focus: () => void;
}

const PrimarySearchCtx = createContext<PrimarySearchValue | null>(null);

export function PrimarySearchProvider({ children }: { children: ReactNode }) {
  const ref = useRef<RefObject<HTMLInputElement | null> | null>(null);
  const register = useCallback((r: RefObject<HTMLInputElement | null>) => {
    ref.current = r;
  }, []);
  const focus = useCallback(() => {
    ref.current?.current?.focus();
    ref.current?.current?.select();
  }, []);
  const value = useMemo(() => ({ register, focus }), [register, focus]);
  return <PrimarySearchCtx.Provider value={value}>{children}</PrimarySearchCtx.Provider>;
}

export function usePrimarySearch(): PrimarySearchValue {
  const v = useContext(PrimarySearchCtx);
  if (!v) throw new Error("usePrimarySearch must be used inside PrimarySearchProvider");
  return v;
}

// — PrimaryActionContext ——————————————————————————————
// Pages register the handler for ⌘↵. Library: Sync mine. Others: no-op.

interface PrimaryActionValue {
  setAction: (fn: (() => void) | null, label?: string) => void;
  trigger: () => void;
  label: string | null;
}

const PrimaryActionCtx = createContext<PrimaryActionValue | null>(null);

export function PrimaryActionProvider({ children }: { children: ReactNode }) {
  const [fn, setFn] = useState<(() => void) | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const setAction = useCallback((next: (() => void) | null, nextLabel?: string) => {
    setFn(() => next);
    setLabel(nextLabel ?? null);
  }, []);
  const trigger = useCallback(() => {
    fn?.();
  }, [fn]);
  const value = useMemo(() => ({ setAction, trigger, label }), [setAction, trigger, label]);
  return <PrimaryActionCtx.Provider value={value}>{children}</PrimaryActionCtx.Provider>;
}

export function usePrimaryAction(): PrimaryActionValue {
  const v = useContext(PrimaryActionCtx);
  if (!v) throw new Error("usePrimaryAction must be used inside PrimaryActionProvider");
  return v;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shortcut-contexts.tsx
git commit -m "ui(console): shortcut contexts (primary search + action)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Global shortcuts hook

**Files:**
- Create: `src/hooks/use-global-shortcuts.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePrimaryAction, usePrimarySearch } from "@/lib/shortcut-contexts";

const SEQUENCE_TIMEOUT_MS = 1200;

export function useGlobalShortcuts({ onOpenPalette }: { onOpenPalette: () => void }) {
  const navigate = useNavigate();
  const search = usePrimarySearch();
  const action = usePrimaryAction();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    }

    function clearPending() {
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
      }
    }

    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K — open palette
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenPalette();
        return;
      }

      // ⌘↵ — primary action
      if (meta && e.key === "Enter") {
        e.preventDefault();
        action.trigger();
        return;
      }

      // Esc — close drawer/dialog handled by Radix/Sheet; no global handler needed.

      // From here on, ignore if the user is typing.
      if (isTypingTarget(e.target)) return;

      // "/" — focus primary search
      if (e.key === "/") {
        e.preventDefault();
        search.focus();
        return;
      }

      // Two-key sequences "G L/T/A/S"
      if (e.key.toLowerCase() === "g" && !meta && !e.altKey && !e.shiftKey) {
        clearPending();
        pendingG.current = window.setTimeout(clearPending, SEQUENCE_TIMEOUT_MS);
        return;
      }
      if (pendingG.current !== null && !meta && !e.altKey) {
        clearPending();
        switch (e.key.toLowerCase()) {
          case "l": e.preventDefault(); navigate("/"); return;
          case "t": e.preventDefault(); navigate("/targets"); return;
          case "a": e.preventDefault(); navigate("/activity"); return;
          case "s": e.preventDefault(); navigate("/settings"); return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearPending();
    };
  }, [onOpenPalette, navigate, search, action]);
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-global-shortcuts.ts
git commit -m "ui(console): global shortcuts hook (⌘K, /, ⌘↵, G L/T/A/S)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Command palette stub Dialog

**Files:**
- Create: `src/components/cmd-palette.tsx`

- [ ] **Step 1: Write the stub palette**

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"],        label: "Filter / focus search" },
  { keys: ["⌘", "↵"], label: "Primary action (sync on Library)" },
  { keys: ["G", "L"], label: "Go to Library" },
  { keys: ["G", "T"], label: "Go to Targets" },
  { keys: ["G", "A"], label: "Go to Activity" },
  { keys: ["G", "S"], label: "Go to Settings" },
  { keys: ["Esc"],    label: "Close dialog / drawer" },
];

export function CmdPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <div className="px-5 py-4 border-b border-border">
          <div className="eyebrow">Command palette · coming soon</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Fuzzy search across skills, navigation, and sync actions. For now, here are the active shortcuts.
          </div>
        </div>
        <ul className="py-2">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-2 hover:bg-bg-hover">
              <span className="text-sm">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <Kbd key={j}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/cmd-palette.tsx
git commit -m "ui(console): command palette stub

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: TitleBar component

**Files:**
- Create: `src/components/title-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/use-platform";
import { useSettings } from "@/hooks/use-settings";
import packageJson from "../../package.json";

const APP_VERSION = packageJson.version;
const BUILD_SHA = import.meta.env.VITE_BUILD_SHA as string;

export function TitleBar() {
  const platform = usePlatform();
  const { data: settings } = useSettings();
  const targets = settings?.enabled_targets?.length ?? 0;
  const [now, setNow] = useState<string>(() => clockString());

  useEffect(() => {
    const id = window.setInterval(() => setNow(clockString()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      data-platform={platform}
      className={
        "sticky top-0 z-30 h-9 border-b border-border " +
        "flex items-center gap-2 backdrop-blur " +
        "bg-background/70 " +
        (platform === "macos" ? "pl-[70px] pr-3" : "pl-3 pr-3")
      }
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground flex items-center gap-1">
        <span>// SKILL.SYNC</span>
        <span
          aria-hidden
          className="inline-block w-[7px] h-3 bg-primary motion-safe:animate-caret-blink ml-0.5"
          style={{ boxShadow: "0 0 8px var(--accent-glow)" }}
        />
      </div>
      <div className="flex-1" />
      <div
        className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 px-2.5 py-1 border border-border rounded-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full bg-primary motion-safe:animate-console-pulse"
        />
        <span>watching · {targets} target{targets === 1 ? "" : "s"} · 30s</span>
      </div>
      <span className="font-mono text-[11px] text-fg-faint">
        v{APP_VERSION} · {BUILD_SHA} · {now}
      </span>
    </div>
  );
}

function clockString(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
```

Note the `WebkitAppRegion: "drag"` — this makes the whole bar a window-drag region on macOS, so users can drag the window from the title bar. The pill on the right opts out so it stays clickable.

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/title-bar.tsx
git commit -m "ui(console): TitleBar — overlay bar with brand and sync state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: CmdBar pill

**Files:**
- Create: `src/components/cmd-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Kbd } from "@/components/ui/kbd";

export function CmdBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenPalette}
      aria-label="Open command palette"
      className={
        "fixed left-1/2 -translate-x-1/2 bottom-[18px] z-20 " +
        "inline-flex items-center gap-3 px-3 py-2 " +
        "rounded-full border border-border-strong " +
        "bg-popover/85 backdrop-blur " +
        "shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] " +
        "font-mono text-[11px] text-muted-foreground " +
        "hover:text-foreground transition-colors"
      }
      role="region"
    >
      <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>K</Kbd><span>palette</span></span>
      <span className="text-fg-faint">·</span>
      <span className="flex items-center gap-1.5"><Kbd>/</Kbd><span>filter</span></span>
      <span className="text-fg-faint">·</span>
      <span className="flex items-center gap-1.5"><Kbd>G</Kbd><Kbd>L</Kbd><span>library</span></span>
      <span className="text-fg-faint">·</span>
      <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>↵</Kbd><span>sync</span></span>
    </button>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/cmd-bar.tsx
git commit -m "ui(console): CmdBar — floating shortcuts pill

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Rewrite Sidebar (compact mono nav)

**Files:**
- Modify: `src/components/sidebar.tsx` (full rewrite)

- [ ] **Step 1: Replace `src/components/sidebar.tsx`**

```tsx
import { NavLink } from "react-router-dom";
import { LayoutGrid, Boxes, Clock, Package } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useSkills } from "@/hooks/use-skills";
import { cn } from "@/lib/utils";

const BUILD_SHA = import.meta.env.VITE_BUILD_SHA as string;

const ITEMS = [
  { to: "/",         label: "Library",  Icon: LayoutGrid },
  { to: "/targets",  label: "Targets",  Icon: Boxes },
  { to: "/activity", label: "Activity", Icon: Clock },
  { to: "/settings", label: "Settings", Icon: Package }, // Settings as last; Packages is a future view
] as const;

const ALL_TARGETS = ["claude", "codex", "cursor", "cowork"] as const;

export function Sidebar() {
  const { data: settings } = useSettings();
  const skills = useSkills();
  const sourceRoot = settings?.source_root ?? "—";
  const enabled = new Set(settings?.enabled_targets ?? []);
  const skillCount = skills.data?.length ?? 0;

  return (
    <nav className="w-[220px] shrink-0 border-r border-border h-full flex flex-col bg-background">
      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Workspace</div>
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center justify-between px-2.5 py-[7px] rounded-md text-sm transition-colors",
                isActive
                  ? "bg-card text-foreground ring-1 ring-border-strong"
                  : "text-muted-foreground hover:bg-bg-hover hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="inline-flex items-center gap-2.5">
                  <item.Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </span>
                <span className={cn("font-mono text-[10.5px]", isActive ? "text-primary" : "text-fg-faint")}>
                  {item.label === "Library" ? skillCount : ""}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Source</div>
        <div className="px-2.5 py-1 font-mono text-[11.5px] text-muted-foreground truncate" title={sourceRoot}>
          {sourceRoot.replace(/^.*\/Users\/[^/]+/, "~")}
        </div>
        <NavLink to="/settings" className="px-2.5 py-1 block font-mono text-[11px] text-fg-faint hover:text-foreground">
          + change source
        </NavLink>
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="eyebrow px-2.5 pb-1.5">Targets</div>
        {ALL_TARGETS.map((t) => (
          <NavLink
            key={t}
            to="/targets"
            className="flex items-center justify-between px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="capitalize">{t === "cowork" ? "Cowork (zip)" : t === "claude" ? "Claude Code" : t}</span>
            <span className={cn("font-mono text-[10.5px]", enabled.has(t) ? "text-primary" : "text-fg-faint")}>
              {enabled.has(t) ? "●" : "○"}
            </span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto px-3 pt-3 pb-4 border-t border-dashed border-border">
        <div className="px-2.5 font-mono text-[10.5px] text-fg-faint leading-relaxed">
          <div className="flex justify-between"><span>last sync</span><span className="text-muted-foreground">—</span></div>
          <div className="flex justify-between"><span>archive</span><span className="text-muted-foreground">~/.Trash</span></div>
          <div className="flex justify-between"><span>build</span><span className="text-muted-foreground">{BUILD_SHA}</span></div>
        </div>
      </div>
    </nav>
  );
}
```

Note: `last sync` is shown as `—` for now; wiring it to the audit log is part of Phase 3's Activity rewrite (which already exposes the audit reader).

- [ ] **Step 2: Verify the rewrite typechecks**

Run: `pnpm build`

Expected: clean. If there are import errors for icons (`lucide-react` is already a dep — check `package.json`), confirm they resolve.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "ui(console): Sidebar — compact mono nav with source/targets

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Wire AppShell — TitleBar, CmdBar, providers, shortcuts

**Files:**
- Modify: `src/components/app-shell.tsx` (full rewrite)

- [ ] **Step 1: Replace `src/components/app-shell.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { applyTheme } from "@/lib/theme";
import { Sidebar } from "./sidebar";
import { TitleBar } from "./title-bar";
import { CmdBar } from "./cmd-bar";
import { CmdPalette } from "./cmd-palette";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { PrimaryActionProvider, PrimarySearchProvider } from "@/lib/shortcut-contexts";

function ShellInner() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto console-grid relative">
          <Outlet />
        </main>
      </div>
      <CmdBar onOpenPalette={() => setPaletteOpen(true)} />
      <CmdPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export function AppShell() {
  const { data } = useSettings();
  useEffect(() => {
    const theme = (data?.theme ?? "system") as "system" | "light" | "dark";
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(theme);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [data?.theme]);

  return (
    <PrimaryActionProvider>
      <PrimarySearchProvider>
        <ShellInner />
      </PrimarySearchProvider>
    </PrimaryActionProvider>
  );
}
```

- [ ] **Step 2: Visually verify the shell**

Run: `pnpm tauri dev`

Expected:
- 36px title bar at top, `// SKILL.SYNC` with blinking caret, sync-state pill on the right, version+sha.
- Sidebar (220px) on left with the compact mono nav.
- Main area shows current pages (still editorial inside, but in Console palette).
- Floating cmdbar pill at bottom-center showing shortcuts.
- Press `⌘K` — palette stub opens. Esc closes it.
- Press `G` then `L` quickly — navigates to Library.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "ui(console): AppShell — mount TitleBar, CmdBar, shortcut providers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Restyle primitive — Button

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Replace the variant config in `src/components/ui/button.tsx`**

Update only the `buttonVariants` cva and `size` block — keep the existing `Button` forwardRef export unchanged:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-transparent border border-border text-foreground hover:bg-bg-hover",
        primary:
          "bg-primary text-primary-foreground border border-primary " +
          "shadow-[0_0_0_1px_var(--accent-glow),0_8px_24px_-8px_var(--accent-glow)] " +
          "hover:brightness-105",
        destructive:
          "bg-transparent border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-bg-hover hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        outline:
          "bg-transparent border border-border text-foreground hover:bg-bg-hover",
        secondary:
          "bg-card text-foreground border border-border hover:bg-bg-hover",
      },
      size: {
        default: "h-8 px-3 text-[12.5px]",
        sm:      "h-7 px-2.5 text-[11.5px]",
        lg:      "h-9 px-4 text-sm",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

Keep `default` as the unobtrusive ghost-with-border variant; `primary` for the lime CTA. Existing call sites using `variant="default"` will now look like ghost buttons — that's the intended Console aesthetic.

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "ui(console): Button variants — ghost-default, lime primary

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Restyle primitive — Input

**Files:**
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: Read current `src/components/ui/input.tsx`**

It's a standard shadcn Input. Replace its className with:

```tsx
className={cn(
  "flex h-8 w-full rounded-md border border-border bg-card px-3 py-1 text-[12.5px] " +
  "shadow-none transition-colors " +
  "placeholder:text-fg-dim " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:cursor-not-allowed disabled:opacity-50",
  className
)}
```

Keep the forwardRef export shape; only the class string changes.

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "ui(console): Input — flat card surface, lime focus ring

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Restyle primitive — Badge

**Files:**
- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: Replace the badge variant definitions**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em]",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-card text-muted-foreground",
        primary: "border-primary/30 bg-primary/[0.06] text-primary",
        info:    "border-info/30 bg-info/[0.05] text-info",
        violet:  "border-violet/30 bg-violet/[0.05] text-violet",
        warning: "border-warning/30 bg-warning/[0.06] text-warning",
        danger:  "border-destructive/30 bg-destructive/[0.06] text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "ui(console): Badge — tinted chip variants (primary/info/violet/warning/danger)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Restyle primitive — Dialog

**Files:**
- Modify: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Update the Overlay and Content classNames**

Find the `DialogOverlay` and `DialogContent` `className` strings in the file. Replace overlay's bg/animation with `bg-black/60 backdrop-blur-sm`. Replace content's surface/border:

For `DialogContent`:
```ts
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 " +
  "border border-border-strong bg-popover shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] " +
  "rounded-lg " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out " +
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  className
)}
```

For `DialogOverlay`:
```ts
className={cn(
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out " +
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  className
)}
```

- [ ] **Step 2: Verify the ⌘K palette renders correctly**

Run: `pnpm tauri dev`. Press ⌘K. Expected: dialog shows on a deep blur, hairline border, popover background.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "ui(console): Dialog — popover surface, hairline border, deep blur

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Restyle primitives — Sheet and Table

**Files:**
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/components/ui/table.tsx`

- [ ] **Step 1: Update SheetContent's right-side className**

In `src/components/ui/sheet.tsx`, in the `sheetVariants` cva, change the `side: "right"` variant to:

```
right: "inset-y-0 right-0 h-full w-[480px] sm:max-w-[480px] border-l border-border bg-card",
```

Update the `SheetContent` outer className to remove `shadow-lg` and confirm padding is `p-0` (the drawer body handles its own).

- [ ] **Step 2: Update Table cells**

In `src/components/ui/table.tsx`:
- `TableHead`: `className="h-9 px-3.5 text-left align-middle font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-dim font-medium border-b border-border bg-card/30"`
- `TableCell`: `className="px-3.5 py-3 align-middle text-sm"`
- `TableRow`: keep `border-b border-border` and replace hover with `hover:bg-bg-hover transition-colors`

Don't change the React structure; just the className strings.

- [ ] **Step 3: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sheet.tsx src/components/ui/table.tsx
git commit -m "ui(console): Sheet (480px right drawer) and Table cell styling

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Remove unused App.css

**Files:**
- Delete: `src/App.css`

- [ ] **Step 1: Confirm it's still unimported**

Run: `grep -r "App.css" src/ index.html` — expect no results.

- [ ] **Step 2: Delete the file**

```bash
git rm src/App.css
```

- [ ] **Step 3: Verify**

Run: `pnpm build`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove unused App.css scaffold

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Phase 1 checkpoint

Stop here and visually verify before moving to Phase 2:

- [ ] `pnpm tauri dev` boots cleanly.
- [ ] TitleBar, Sidebar, CmdBar render on every page.
- [ ] `⌘K` opens palette stub; Esc closes; G L navigates to Library.
- [ ] Theme toggle in Settings still works (light/dark/system).
- [ ] Existing Library / Targets / Activity / Settings pages render their old layouts but in the new palette. Some editorial flourishes may look broken (large display type without Fraunces) — that's expected; Phase 2 starts fixing it.

---

# PHASE 2 — Library + drift bar

The result of this phase: Library page matches the Console mockup. The phase ends with one logical commit (Tasks 21–27 squashed into a single commit titled `ui(console): library — new header, drift bar, table`) or kept as a series — engineer's choice. The plan assumes one commit at the end.

---

### Task 21: Audit log bucket helper for "archived this week"

**Files:**
- Create: `src/lib/audit.ts`

- [ ] **Step 1: Confirm the audit reading hook exists**

Check `src/hooks/` — there should be a hook that reads audit entries, since the Activity page renders them. If there's no shared hook, the Activity page reads via a Tauri command directly; either way the data shape is `AuditEntry[]` per `src/types/bindings.ts`.

- [ ] **Step 2: Write the bucket helper**

```ts
import type { AuditEntry } from "@/types/bindings";

const MS_PER_DAY = 86_400_000;

/** Returns an array of 7 numbers: count of archive events per day,
 *  oldest first, newest last (today). */
export function bucketArchivesByDay(entries: AuditEntry[], now: Date = new Date()): number[] {
  const buckets = new Array(7).fill(0);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  for (const e of entries) {
    if (e.kind !== "archive") continue;
    const t = Date.parse(e.ts);
    if (Number.isNaN(t)) continue;
    const days = Math.floor((todayMs - t) / MS_PER_DAY);
    if (days < 0 || days > 6) continue;
    buckets[6 - days] += 1;
  }
  return buckets;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 22: Sparkline component

**Files:**
- Create: `src/components/sparkline.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";

interface Props {
  values: number[];
  /** Index of the bar to flare amber (e.g. day with drift). */
  hotIndex?: number;
  className?: string;
}

export function Sparkline({ values, hotIndex, className }: Props) {
  const max = Math.max(1, ...values);
  return (
    <span className={cn("inline-flex items-end gap-[2px] h-3.5", className)} aria-hidden>
      {values.map((v, i) => {
        const pct = Math.max(8, Math.round((v / max) * 100));
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-[1px]",
              i === hotIndex ? "bg-warning" : "bg-fg-faint"
            )}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </span>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 23: DriftBar component (per-skill 4-lane)

**Files:**
- Create: `src/components/drift-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { DriftStatus } from "@/types/bindings";

const LANES = ["claude", "codex", "cursor", "cowork"] as const;
type Lane = typeof LANES[number];

interface Props {
  /** Drift status per target. `cowork` is allowed but not required;
   *  if absent it renders as not-installed. */
  byTarget: Partial<Record<Lane, DriftStatus | undefined>>;
  /** Set of enabled target names from settings. Lanes not in this set render dashed. */
  enabled: Set<string>;
  className?: string;
}

function segmentClass(status: DriftStatus | undefined, isEnabled: boolean): string {
  if (!isEnabled) return "border border-dashed border-border-strong bg-transparent";
  if (!status || status === "missing-in-target") return "border border-dashed border-border-strong bg-transparent";
  if (status === "in-sync") return "bg-primary shadow-[0_0_6px_var(--accent-glow)]";
  if (status === "drifted-target-newer" || status === "drifted-source-newer") return "bg-warning";
  if (status === "refused") return "bg-destructive";
  /* "unmanaged" */
  return "bg-fg-dim";
}

function tooltipText(lane: Lane, status: DriftStatus | undefined, isEnabled: boolean): string {
  const name = lane === "claude" ? "Claude Code" : lane === "cowork" ? "Cowork (zip)" : lane[0].toUpperCase() + lane.slice(1);
  if (!isEnabled) return `${name} · not enabled`;
  if (lane === "cowork") return `${name} · packaging state not yet wired`;
  if (!status || status === "missing-in-target") return `${name} · not installed`;
  if (status === "in-sync") return `${name} · in sync`;
  if (status === "drifted-target-newer") return `${name} · drift (target newer)`;
  if (status === "drifted-source-newer") return `${name} · drift (source newer)`;
  if (status === "refused") return `${name} · refused (symlink or bundle)`;
  return `${name} · ${status}`;
}

export function DriftBar({ byTarget, enabled, className }: Props) {
  return (
    <TooltipPrimitive.Provider delayDuration={120}>
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="inline-flex gap-[3px]">
          {LANES.map((lane) => {
            const isEnabled = enabled.has(lane);
            // Cowork is always dashed in this spec (no packaging-state binding yet)
            const status = lane === "cowork" ? "missing-in-target" : byTarget[lane];
            return (
              <TooltipPrimitive.Root key={lane}>
                <TooltipPrimitive.Trigger asChild>
                  <span
                    role="img"
                    aria-label={tooltipText(lane, status, isEnabled)}
                    tabIndex={0}
                    className={cn(
                      "block w-4 h-1.5 rounded-[2px] focus:outline focus:outline-1 focus:outline-primary",
                      segmentClass(status, isEnabled)
                    )}
                  />
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    className="z-50 px-2 py-1 rounded-md border border-border-strong bg-popover text-[11px] font-mono text-muted-foreground"
                    side="top"
                    sideOffset={6}
                  >
                    {tooltipText(lane, status, isEnabled)}
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            );
          })}
        </span>
        <SummaryLabel byTarget={byTarget} enabled={enabled} />
      </span>
    </TooltipPrimitive.Provider>
  );
}

function SummaryLabel({ byTarget, enabled }: { byTarget: Props["byTarget"]; enabled: Set<string> }) {
  const enabledLanes = LANES.filter((l) => enabled.has(l) && l !== "cowork");
  let inSync = 0;
  let drifted: string[] = [];
  for (const lane of enabledLanes) {
    const s = byTarget[lane];
    if (s === "in-sync") inSync += 1;
    else if (s === "drifted-target-newer" || s === "drifted-source-newer") drifted.push(lane);
  }
  if (drifted.length > 0) {
    return <span className="font-mono text-[10.5px] text-warning">{drifted[0]} · drift</span>;
  }
  return (
    <span className="font-mono text-[10.5px] text-fg-dim">
      {inSync}/{enabledLanes.length} in sync
    </span>
  );
}
```

The `@radix-ui/react-tooltip` package is already an implicit dep through `@radix-ui/react-*` family in shadcn. If `pnpm build` complains about a missing module:

```bash
pnpm add @radix-ui/react-tooltip
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean (after installing Tooltip if needed).

---

### Task 24: Restyle OwnerBadge

**Files:**
- Modify: `src/components/owner-badge.tsx` (full rewrite)

- [ ] **Step 1: Replace with the new badge-driven OwnerBadge**

```tsx
import { Badge } from "@/components/ui/badge";
import type { Class } from "@/types/bindings";

const dot = (
  <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
);

export function OwnerBadge({ klass, confirmed }: { klass: Class; confirmed?: boolean }) {
  if (confirmed && klass === "MineHeuristic") {
    return <Badge variant="primary">{dot}Mine</Badge>;
  }
  switch (klass) {
    case "MineHeuristic":
      return <Badge variant="warning">{dot}Mine · auto</Badge>;
    case "Bundle":
      return <Badge variant="info">{dot}Bundle</Badge>;
    case "ToolBuiltin":
      return <Badge variant="violet">{dot}Built-in</Badge>;
    case "Unknown":
      return <Badge variant="warning">{dot}Unknown</Badge>;
  }
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 25: Restyle DriftBadge (kept for drawer)

**Files:**
- Modify: `src/components/drift-badge.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

```tsx
import { cn } from "@/lib/utils";
import type { DriftStatus } from "@/types/bindings";

const TONE: Record<DriftStatus, { label: string; tone: string }> = {
  "in-sync":              { label: "in sync",          tone: "text-primary" },
  "drifted-target-newer": { label: "drift · target",   tone: "text-warning" },
  "drifted-source-newer": { label: "drift · source",   tone: "text-warning" },
  "missing-in-target":    { label: "absent",           tone: "text-fg-dim" },
  "unmanaged":            { label: "linked",           tone: "text-fg-dim" },
  "refused":              { label: "refused",          tone: "text-destructive" },
};

export function DriftBadge({ status }: { status: DriftStatus }) {
  const c = TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.04em]", c.tone)}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 26: Rewrite LibraryTable

**Files:**
- Modify: `src/components/library-table.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

```tsx
import { useMemo, useState } from "react";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { useUIState } from "@/store/ui-state";
import { OwnerBadge } from "./owner-badge";
import { OwnershipPicker } from "./ownership-picker";
import { DriftBar } from "./drift-bar";
import type { DriftStatus, SkillView } from "@/types/bindings";

interface Props {
  filter: string;
  ownershipFilter: "all" | "mine" | "bundle" | "builtin" | "unknown";
}

function firstHash(skill: SkillView): string {
  return skill.locations[0]?.hash?.slice(0, 7) ?? "—";
}
function firstPath(skill: SkillView): string {
  return String(skill.locations[0]?.path ?? "—").replace(/^.*\/Users\/[^/]+/, "~");
}

export function LibraryTable({ filter, ownershipFilter }: Props) {
  const skills = useSkills();
  const { data: ownership } = useOwnership();
  const drift = useDrift();
  const { data: settings } = useSettings();
  const selectSkill = useUIState((s) => s.selectSkill);

  const enabledTargets = useMemo(
    () => new Set(settings?.enabled_targets ?? []),
    [settings?.enabled_targets]
  );

  const rows = useMemo(() => {
    const all = skills.data ?? [];
    const f = filter.trim().toLowerCase();
    const regex = /^\/(.+)\/$/.exec(filter);
    const matcher = (s: SkillView) => {
      if (!f) return true;
      if (regex) {
        try { return new RegExp(regex[1], "i").test(s.name); } catch { return false; }
      }
      return s.name.toLowerCase().includes(f);
    };
    const ownershipMatches = (s: SkillView) => {
      const confirmed = ownership?.skills?.[s.name]?.class === "mine";
      switch (ownershipFilter) {
        case "all":     return true;
        case "mine":    return s.class === "MineHeuristic" || confirmed;
        case "bundle":  return s.class === "Bundle";
        case "builtin": return s.class === "ToolBuiltin";
        case "unknown": return s.class === "Unknown";
      }
    };
    return all.filter((s) => matcher(s) && ownershipMatches(s));
  }, [skills.data, filter, ownershipFilter, ownership]);

  if (skills.isLoading) {
    return <div className="px-8 py-12 eyebrow">Scanning…</div>;
  }
  if (skills.error) {
    return <div className="px-8 py-12 font-mono text-xs text-destructive">{String(skills.error)}</div>;
  }

  return (
    <div className="px-8 pb-12">
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_220px_120px_80px_140px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
          <div className="eyebrow">Skill</div>
          <div className="eyebrow">Owner</div>
          <div className="eyebrow">Targets</div>
          <div className="eyebrow">Updated</div>
          <div className="eyebrow text-right">Size</div>
          <div className="eyebrow"></div>
        </div>
        <ul>
          {rows.map((s, i) => {
            const confirmed = ownership?.skills?.[s.name]?.class === "mine";
            const driftRow = (drift.data?.[s.name] ?? {}) as Partial<Record<string, DriftStatus>>;
            return (
              <SkillRow
                key={s.name}
                index={i}
                skill={s}
                confirmed={confirmed}
                drift={driftRow}
                enabled={enabledTargets}
                onSelect={() => selectSkill(s.name)}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SkillRow({
  index,
  skill,
  confirmed,
  drift,
  enabled,
  onSelect,
}: {
  index: number;
  skill: SkillView;
  confirmed: boolean;
  drift: Partial<Record<string, DriftStatus>>;
  enabled: Set<string>;
  onSelect: () => void;
}) {
  const [classifyOpen, setClassifyOpen] = useState(false);
  const isUnknown = skill.class === "Unknown";
  const sizeKb = (sumFileSize(skill) / 1024).toFixed(1);

  return (
    <li
      className="border-b border-border last:border-b-0 console-rise"
      style={{ animationDelay: `${Math.min(index * 28, 720)}ms` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
        className="grid grid-cols-[1fr_140px_220px_120px_80px_140px] gap-x-3 items-center px-3.5 py-3 cursor-pointer hover:bg-bg-hover focus:outline focus:outline-2 focus:outline-offset-[-2px] focus:outline-primary transition-colors group"
      >
        <div className="min-w-0">
          <div className="text-foreground font-medium text-sm truncate">{skill.name}</div>
          <div className="font-mono text-[11px] text-fg-faint truncate">
            {firstPath(skill)} · {skill.locations.length} location{skill.locations.length === 1 ? "" : "s"}
          </div>
        </div>
        <div>
          <OwnerBadge klass={skill.class} confirmed={confirmed} />
        </div>
        <div>
          <DriftBar byTarget={drift} enabled={enabled} />
        </div>
        <div className="font-mono text-[11.5px] text-muted-foreground">—</div>
        <div className="font-mono text-[11.5px] text-fg-dim text-right">{sizeKb} kB</div>
        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isUnknown ? (
            <button
              className="font-mono text-[10.5px] px-2 py-1 rounded border border-primary bg-primary text-primary-foreground"
              onClick={(e) => { e.stopPropagation(); setClassifyOpen(true); }}
            >
              classify
            </button>
          ) : (
            <button
              className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
            >
              open
            </button>
          )}
        </div>
      </div>
      {classifyOpen && (
        <div className="px-3.5 pb-3">
          <OwnershipPicker skillName={skill.name} onDone={() => setClassifyOpen(false)} />
        </div>
      )}
    </li>
  );
}

function sumFileSize(_skill: SkillView): number {
  // The current SkillView doesn't carry a size field. Estimate from location hash presence
  // and file count proxy; replaced when bindings expose size. For now, return 0.
  return 0;
}
```

Note the `sumFileSize` shim — the current `SkillView` type has no size field, so we render `0.0 kB` placeholder. Removing this column or wiring a real size is a follow-up. Mention in commit message.

Row-level "pull" is deliberately omitted from the Library table: pull-back is per-(skill, target) and the row doesn't know which target to pull from. The drawer's Targets section is where per-target pull lives.

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean. (Don't commit yet — Phase 2's commit happens at the end of Task 27.)

---

### Task 27: Rewrite LibraryPage header + wire shortcuts + delete OwnershipInbox

**Files:**
- Modify: `src/pages/library.tsx` (full rewrite)
- Delete: `src/components/ownership-inbox.tsx`

- [ ] **Step 1: Replace `src/pages/library.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { LibraryTable } from "@/components/library-table";
import { SyncPreviewDialog } from "@/components/sync-preview-dialog";
import { SkillDetailDrawer } from "@/components/skill-detail-drawer";
import { Sparkline } from "@/components/sparkline";
import { Kbd } from "@/components/ui/kbd";
import { usePrimaryAction, usePrimarySearch } from "@/lib/shortcut-contexts";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { usePlanSync } from "@/hooks/use-sync";
import { useDriftRefresh } from "@/hooks/use-drift-refresh";
import { bucketArchivesByDay } from "@/lib/audit";
import { ipc } from "@/lib/ipc";
import type { AuditEntry, DriftStatus, SyncPlan } from "@/types/bindings";
import { cn } from "@/lib/utils";

type OwnershipFilter = "all" | "mine" | "bundle" | "builtin" | "unknown";
const FILTERS: { id: OwnershipFilter; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "mine",    label: "Mine" },
  { id: "bundle",  label: "Bundle" },
  { id: "builtin", label: "Built-in" },
  { id: "unknown", label: "Unknown" },
];

export function LibraryPage() {
  useDriftRefresh();
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const { data: settings } = useSettings();
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const planMut = usePlanSync();
  const [filter, setFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const search = usePrimarySearch();
  const action = usePrimaryAction();
  const [archiveEntries, setArchiveEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    search.register(searchRef);
  }, [search]);

  useEffect(() => {
    action.setAction(() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) }), "Sync mine");
    return () => action.setAction(null);
  }, [action, planMut]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await ipc.readAudit(500);
        if (!cancelled) setArchiveEntries(list);
      } catch {
        /* audit might be empty */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const all = skills.data ?? [];
    const ownerOf = (name: string) => ownership.data?.skills?.[name];
    const isMine = (name: string, klass: string) => ownerOf(name)?.class === "mine" || klass === "MineHeuristic";

    let mine = 0, bundle = 0, builtin = 0, unknown = 0;
    let inSync = 0, drifted = 0;

    for (const s of all) {
      if (isMine(s.name, s.class)) mine++;
      else if (s.class === "Bundle") bundle++;
      else if (s.class === "ToolBuiltin") builtin++;
      else if (s.class === "Unknown") unknown++;

      const row = (drift.data?.[s.name] ?? {}) as Partial<Record<string, DriftStatus>>;
      const statuses = Object.values(row).filter(Boolean) as DriftStatus[];
      if (statuses.length > 0 && statuses.every((x) => x === "in-sync")) inSync++;
      else if (statuses.some((x) => x === "drifted-target-newer" || x === "drifted-source-newer")) drifted++;
    }
    return { total: all.length, mine, bundle, builtin, unknown, inSync, drifted };
  }, [skills.data, ownership.data, drift.data]);

  const sparkline = useMemo(() => bucketArchivesByDay(archiveEntries), [archiveEntries]);
  const archivedThisWeek = sparkline.reduce((a, b) => a + b, 0);

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>{(settings?.source_root ?? "~/.claude/skills").replace(/^.*\/Users\/[^/]+/, "~")}</span>
          <span>›</span>
          <span className="text-muted-foreground">library</span>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl text-foreground">Library</h1>
            <div className="font-mono text-xs text-fg-dim mt-1.5">
              <span className="text-foreground">{counts.total}</span> skills ·{" "}
              <span className="text-foreground">{settings?.enabled_targets?.length ?? 0}</span> targets ·{" "}
              <span className={counts.drifted ? "text-warning" : "text-foreground"}>{counts.drifted} drifting</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })}
              disabled={planMut.isPending}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-transparent text-foreground text-[12.5px] hover:bg-bg-hover"
            >
              Preview <Kbd>⌘</Kbd><Kbd>P</Kbd>
            </button>
            <button
              onClick={() => planMut.mutate(undefined, { onSuccess: (p) => setPlan(p) })}
              disabled={planMut.isPending}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-primary text-primary-foreground border border-primary text-[12.5px] font-medium hover:brightness-105 shadow-[0_8px_24px_-8px_var(--accent-glow)]"
            >
              {planMut.isPending ? "Drafting…" : "Sync all"} <Kbd className="!bg-transparent !border-black/15 !text-black/55">↵</Kbd>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 border border-border rounded-lg overflow-hidden bg-card">
          <Stat k="In sync"  v={counts.inSync}    d={`across ${settings?.enabled_targets?.length ?? 0} targets`} />
          <Stat k="Drift"    v={counts.drifted}   d={counts.drifted ? "needs attention" : "none"} tone={counts.drifted ? "warn" : undefined} />
          <Stat k="Unknown"  v={counts.unknown}   d={counts.unknown ? "needs ownership tag" : "—"} tone={counts.unknown ? "bad" : undefined} />
          <Stat
            k="Archived this week"
            v={archivedThisWeek}
            extra={<Sparkline values={sparkline} hotIndex={sparkline.findIndex((x) => x > 0)} />}
          />
        </div>

        <div className="mt-5 mb-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-card border border-border rounded-md">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setOwnershipFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded font-mono text-[11px] text-muted-foreground transition-colors",
                  ownershipFilter === f.id ? "bg-bg-hover text-foreground ring-1 ring-border-strong" : "hover:text-foreground"
                )}
              >
                {f.label}
                <span className={cn("ml-2", ownershipFilter === f.id ? "text-primary" : "text-fg-faint")}>
                  {countFor(f.id, counts)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-2 px-3 h-8 border border-border bg-card rounded-md min-w-[280px] text-muted-foreground">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/>
              <path d="M11 11l3 3"/>
            </svg>
            <input
              ref={searchRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter skills · regex with /…/"
              className="flex-1 bg-transparent border-0 outline-none text-foreground text-[12.5px] placeholder:text-fg-dim"
            />
            <Kbd>/</Kbd>
          </div>
        </div>
      </div>

      <LibraryTable filter={filter} ownershipFilter={ownershipFilter} />

      <SyncPreviewDialog plan={plan} open={!!plan} onOpenChange={(v) => !v && setPlan(null)} />
      <SkillDetailDrawer />
    </div>
  );
}

function countFor(f: OwnershipFilter, c: { total: number; mine: number; bundle: number; builtin: number; unknown: number }) {
  switch (f) {
    case "all":     return c.total;
    case "mine":    return c.mine;
    case "bundle":  return c.bundle;
    case "builtin": return c.builtin;
    case "unknown": return c.unknown;
  }
}

function Stat({ k, v, d, extra, tone }: { k: string; v: number; d?: string; extra?: React.ReactNode; tone?: "warn" | "bad" }) {
  return (
    <div className="px-4 py-3 border-r border-border last:border-r-0">
      <div className="eyebrow">{k}</div>
      <div className={cn(
        "mt-1.5 font-display text-2xl tabular-nums leading-none",
        tone === "warn" ? "text-warning" : tone === "bad" ? "text-destructive" : "text-foreground"
      )}>
        {String(v).padStart(2, "0")}
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
        {d}
        {extra}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete OwnershipInbox**

```bash
git rm src/components/ownership-inbox.tsx
```

- [ ] **Step 3: Verify**

Run: `pnpm build`

Expected: clean. The Library page typechecks.

- [ ] **Step 4: Visually verify the full Library page**

Run: `pnpm tauri dev` (or restart if running).

Expected:
- Console-style page header with crumb, H1 "Library", subhead.
- 4 stat cells with tabular numbers; sparkline in the 4th.
- Filter chips wired (clicking changes the table).
- Search input filters by name; press `/` anywhere on the page → focuses search.
- Press `⌘↵` → triggers Sync mine.
- Table shows skills with the DriftBar (4 segments per row) and tooltips on hover.
- Hover a row → "open / pull" buttons fade in. Unknown rows show "classify".
- Click a row → opens the SkillDetailDrawer (still editorial styling — fixed in Phase 3).

- [ ] **Step 5: Commit Phase 2**

```bash
git add -A
git commit -m "ui(console): library — new header, drift bar, dense table

Adds:
- DriftBar (per-skill 4-lane visualizer with tooltips)
- Sparkline (CSS bars) used by 'archived this week' stat
- Audit bucket helper

Library page rewrites:
- Crumb + H1 + mono subhead
- 4-cell stats strip with tabular numbers and sparkline
- Filter chips wired to ownership class
- Search input wired (regex with /…/) + '/' focus shortcut
- '⌘↵' triggers Sync mine via PrimaryActionContext

DriftBadge restyled (single-target, used in drawer).
OwnerBadge dropped unicode marks in favor of dotted chips.
OwnershipInbox deleted; classify action is inline in Library rows.

Size column shows '0.0 kB' until SkillView exposes a size field.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Phase 2 checkpoint

- [ ] Library renders the Console mockup layout.
- [ ] All four global shortcuts still work.
- [ ] Theme toggle still works.
- [ ] Targets / Activity / Settings still render their old layouts in the new palette.

---

# PHASE 3 — Other pages, dialogs, drawer

The result of this phase: every route looks like Console. Three pages restyled, two dialogs/drawers restyled. Single commit at the end: `ui(console): targets, activity, settings, dialogs, drawer`.

---

### Task 28: HealthBar component (per-target stacked)

**Files:**
- Create: `src/components/health-bar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { cn } from "@/lib/utils";

interface Props {
  inSync: number;
  drift: number;
  missing: number;
  refused: number;
  className?: string;
}

export function HealthBar({ inSync, drift, missing, refused, className }: Props) {
  const total = Math.max(1, inSync + drift + missing + refused);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className={cn("w-full h-1.5 rounded-[2px] overflow-hidden flex bg-border", className)} aria-label="target health">
      {inSync > 0  && <div style={{ width: seg(inSync) }} className="bg-primary" />}
      {drift > 0   && <div style={{ width: seg(drift) }} className="bg-warning" />}
      {missing > 0 && <div style={{ width: seg(missing) }} className="bg-fg-dim" />}
      {refused > 0 && <div style={{ width: seg(refused) }} className="bg-destructive" />}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 29: Rewrite TargetCard

**Files:**
- Modify: `src/components/target-card.tsx` (full rewrite)

- [ ] **Step 1: Read the current file** to see what hooks/IPC commands are used (e.g. test target, open in finder). Note the current props shape.

- [ ] **Step 2: Replace `src/components/target-card.tsx`**

```tsx
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { HealthBar } from "./health-bar";
import { useDrift } from "@/hooks/use-drift";
import { useSettings } from "@/hooks/use-settings";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { ipc } from "@/lib/ipc";
import type { DriftStatus } from "@/types/bindings";

interface Props {
  name: string;
  path: string | undefined;
  kind: "directory-mirror" | "package-only";
}

const PRETTY: Record<string, string> = {
  claude: "Claude Code",
  codex:  "Codex",
  cursor: "Cursor",
  cowork: "Cowork (zip)",
};

export function TargetCard({ name, path, kind }: Props) {
  const drift = useDrift();
  const { data: settings } = useSettings();
  const enabled = useMemo(() => new Set(settings?.enabled_targets ?? []), [settings?.enabled_targets]);
  const isEnabled = enabled.has(name);

  const counts = useMemo(() => {
    let inSync = 0, d = 0, missing = 0, refused = 0;
    for (const row of Object.values(drift.data ?? {})) {
      const s = (row as Record<string, DriftStatus>)[name];
      if (s === "in-sync") inSync++;
      else if (s === "drifted-source-newer" || s === "drifted-target-newer") d++;
      else if (s === "missing-in-target") missing++;
      else if (s === "refused") refused++;
    }
    return { inSync, drift: d, missing, refused };
  }, [drift.data, name]);

  const reveal = () => {
    if (path) revealItemInDir(path).catch(() => {});
  };
  const test = () => {
    if (path) ipc.testTargetWrite(path).catch(() => {});
  };

  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-foreground text-[17px] font-medium leading-tight">
            {PRETTY[name] ?? name}
          </div>
          <div className="font-mono text-[11px] text-fg-faint mt-1 truncate" title={path ?? ""}>
            {path ? path.replace(/^.*\/Users\/[^/]+/, "~") : (kind === "package-only" ? "output directory in Settings" : "not configured")}
          </div>
        </div>
        {!isEnabled ? <Badge variant="default">Disabled</Badge>
          : !path && kind === "directory-mirror" ? <Badge variant="warning">Not configured</Badge>
          : <Badge variant="primary"><span className="w-1.5 h-1.5 rounded-full bg-current"/>Active</Badge>}
      </div>

      <div className="mt-5">
        <HealthBar inSync={counts.inSync} drift={counts.drift} missing={counts.missing} refused={counts.refused} />
        <div className="mt-2 font-mono text-[11px] text-muted-foreground">
          <span className="text-primary">{counts.inSync}</span> in sync ·
          {" "}<span className={counts.drift ? "text-warning" : ""}>{counts.drift}</span> drift ·
          {" "}<span>{counts.missing}</span> missing ·
          {" "}<span className={counts.refused ? "text-destructive" : ""}>{counts.refused}</span> refused
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={reveal}
          disabled={!path}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          Reveal in Finder
        </button>
        <button
          onClick={test}
          disabled={!path}
          className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover disabled:opacity-50"
        >
          Test
        </button>
      </div>
    </div>
  );
}
```

The plan uses `revealItemInDir` from `@tauri-apps/plugin-opener` (already in `package.json`) and `ipc.testTargetWrite` from `src/lib/ipc.ts`. Both are confirmed to exist; no additional commands needed.

- [ ] **Step 3: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 30: Rewrite TargetsPage

**Files:**
- Modify: `src/pages/targets.tsx` (full rewrite)

- [ ] **Step 1: Replace the file**

```tsx
import { TargetCard } from "@/components/target-card";
import { useSettings } from "@/hooks/use-settings";

export function TargetsPage() {
  const { data: settings } = useSettings();
  const home = settings?.source_root
    ? String(settings.source_root).replace(/\/\.claude\/skills\/?$/, "")
    : "";

  const cards = [
    { name: "claude", path: home ? `${home}/.claude/skills` : undefined, kind: "directory-mirror" as const },
    { name: "codex",  path: home ? `${home}/.codex/skills`  : undefined, kind: "directory-mirror" as const },
    { name: "cursor", path: home ? `${home}/.cursor/skills` : undefined, kind: "directory-mirror" as const },
    { name: "cowork", path: undefined, kind: "package-only" as const },
  ];
  const enabledCount = settings?.enabled_targets?.length ?? 0;

  return (
    <div className="console-rise">
      <div className="px-8 pt-7">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">targets</span>
        </div>
        <h1 className="font-display text-2xl">Targets</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          <span className="text-foreground">{cards.length}</span> cabinets ·{" "}
          <span className="text-foreground">{enabledCount}</span> enabled · 3 directory mirrors · 1 package
        </div>
      </div>
      <div className="px-8 mt-6 pb-12 grid grid-cols-2 gap-4">
        {cards.map((t) => <TargetCard key={t.name} {...t} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 31: Rewrite ActivityList + ActivityPage

**Files:**
- Modify: `src/components/activity-list.tsx` (full rewrite)
- Modify: `src/pages/activity.tsx` (full rewrite)

- [ ] **Step 1: Skim the current `src/components/activity-list.tsx`** to see what shape `AuditEntry.data` typically holds (it's typed `any`). The replacement below uses `ipc.readAudit(1000)` from `src/lib/ipc.ts`.

- [ ] **Step 2: Replace `src/components/activity-list.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ipc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/types/bindings";

type FilterId = "all" | "sync" | "pull" | "package" | "refused" | "drift";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "sync",    label: "Sync" },
  { id: "pull",    label: "Pull" },
  { id: "package", label: "Package" },
  { id: "refused", label: "Refused" },
  { id: "drift",   label: "Drift" },
];

function matchFilter(kind: string, f: FilterId): boolean {
  if (f === "all") return true;
  if (f === "sync")    return kind === "sync" || kind === "archive";
  if (f === "pull")    return kind === "pull-back" || kind === "pull";
  if (f === "package") return kind === "package" || kind === "build-skill";
  if (f === "refused") return kind === "refused";
  if (f === "drift")   return kind === "drift-detected" || kind === "drift";
  return false;
}

function tone(kind: string): "primary" | "info" | "violet" | "danger" | "warning" | "default" {
  if (kind === "sync" || kind === "archive") return "primary";
  if (kind === "pull-back" || kind === "pull") return "info";
  if (kind === "package" || kind === "build-skill") return "violet";
  if (kind === "refused") return "danger";
  if (kind.startsWith("drift")) return "warning";
  return "default";
}

export function ActivityList() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await ipc.readAudit(1000);
        if (!cancelled) setEntries(list);
      } catch { /* empty */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = entries.filter((e) => matchFilter(e.kind, filter));
  const shown = filtered.slice(0, limit);

  return (
    <div className="px-8 pb-12">
      <div className="mb-4 inline-flex items-center gap-0.5 p-0.5 bg-card border border-border rounded-md">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-2.5 py-1 rounded font-mono text-[11px] text-muted-foreground transition-colors",
              filter === f.id ? "bg-bg-hover text-foreground ring-1 ring-border-strong" : "hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="grid grid-cols-[120px_120px_1fr_120px_140px] gap-x-3 px-3.5 py-2.5 border-b border-border bg-card/30">
          <div className="eyebrow">Time</div>
          <div className="eyebrow">Kind</div>
          <div className="eyebrow">Detail</div>
          <div className="eyebrow">Target</div>
          <div className="eyebrow">Outcome</div>
        </div>
        <ul>
          {shown.map((e, i) => {
            const ts = e.ts.replace("T", " ").replace(/\.\d+Z?$/, "");
            const data = e.data ?? {};
            return (
              <li key={i} className="grid grid-cols-[120px_120px_1fr_120px_140px] gap-x-3 items-center px-3.5 py-2.5 border-b border-border last:border-b-0 hover:bg-bg-hover">
                <div className="font-mono text-[11px] text-fg-dim">{ts}</div>
                <div><Badge variant={tone(e.kind)}>{e.kind}</Badge></div>
                <div className="font-mono text-[11.5px] text-muted-foreground truncate">
                  {String(data.skill ?? data.name ?? "—")}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">{String(data.target ?? "—")}</div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{String(data.outcome ?? data.reason ?? "—")}</div>
              </li>
            );
          })}
        </ul>
        {filtered.length > limit && (
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="w-full py-3 font-mono text-[11px] text-muted-foreground hover:text-foreground border-t border-border"
          >
            Load 50 more · {filtered.length - limit} remaining
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/pages/activity.tsx`**

```tsx
import { ActivityList } from "@/components/activity-list";

export function ActivityPage() {
  return (
    <div className="console-rise">
      <div className="px-8 pt-7 pb-2">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">activity</span>
        </div>
        <h1 className="font-display text-2xl">Activity</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          Append-only audit log · every sync, pull, refusal, and archive
        </div>
      </div>
      <ActivityList />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm build`

Expected: clean. If `data.skill ?? data.name` shape doesn't match the actual `AuditEntry.data` (which is typed `any`), adjust accordingly after reading recent entries in `pnpm tauri dev` devtools.

---

### Task 32: Rewrite SettingsForm + SettingsPage

**Files:**
- Modify: `src/components/settings-form.tsx` (full rewrite — keeps existing hooks/IPC)
- Modify: `src/pages/settings.tsx` (full rewrite)

- [ ] **Step 1: Read current `src/components/settings-form.tsx`** to learn the existing setting fields and update mechanism. The hook is likely `useSettings()` + a mutation. Note the exact write API.

- [ ] **Step 2: Replace `src/components/settings-form.tsx`**

```tsx
import { useMemo, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { ipc } from "@/lib/ipc";
import { applyTheme } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types/bindings";

const TARGETS = ["claude", "codex", "cursor", "cowork"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-5 mt-5 first:border-t-0 first:pt-0 first:mt-0">
      <div className="eyebrow mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="font-mono text-[11px] text-fg-dim mt-1 leading-relaxed">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsForm() {
  const { data, refetch } = useSettings();
  const [busy, setBusy] = useState(false);

  if (!data) return <div className="px-8 py-12 eyebrow">Loading…</div>;

  async function update(patch: Partial<Settings>) {
    setBusy(true);
    try {
      const next = { ...data, ...patch };
      await ipc.setSettings(next);
      await refetch();
      if (patch.theme) applyTheme(patch.theme as "system" | "light" | "dark");
    } finally {
      setBusy(false);
    }
  }

  const enabled = new Set(data.enabled_targets);

  return (
    <div className="px-8 pb-12 max-w-3xl">
      <Section title="Source">
        <Row label="Source root" hint="Where you author skills. Used as the source of truth for syncs.">
          <input
            value={data.source_root}
            onChange={(e) => update({ source_root: e.target.value })}
            className="w-full h-8 px-3 bg-card border border-border rounded-md font-mono text-[12.5px] text-foreground"
            disabled={busy}
          />
        </Row>
        <Row label="Show built-ins" hint="Display skills that come from anthropic-skills bundles.">
          <Toggle on={data.show_builtins} onClick={() => update({ show_builtins: !data.show_builtins })} />
        </Row>
      </Section>

      <Section title="Targets">
        {TARGETS.map((t) => (
          <Row
            key={t}
            label={t === "claude" ? "Claude Code" : t === "cowork" ? "Cowork (.skill)" : t[0].toUpperCase() + t.slice(1)}
            hint={t === "cowork" ? "Built as zip archives, not a directory mirror." : "Mirrors the source tree into ~/.${t}/skills."}
          >
            <Toggle
              on={enabled.has(t)}
              onClick={() => {
                const next = enabled.has(t)
                  ? data.enabled_targets.filter((x) => x !== t)
                  : [...data.enabled_targets, t];
                update({ enabled_targets: next });
              }}
            />
          </Row>
        ))}
      </Section>

      <Section title="Packaging">
        <Row label="Package output dir" hint="Where .skill zips are written when you build for Cowork.">
          <input
            value={data.package_output_dir}
            onChange={(e) => update({ package_output_dir: e.target.value })}
            className="w-full h-8 px-3 bg-card border border-border rounded-md font-mono text-[12.5px] text-foreground"
            disabled={busy}
          />
        </Row>
        <Row label="Cowork packaging" hint="Enable building .skill zips for Cowork.">
          <Toggle on={data.cowork_package_enabled} onClick={() => update({ cowork_package_enabled: !data.cowork_package_enabled })} />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Theme" hint="System follows your OS preference.">
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-card border border-border rounded-md">
            {(["system", "light", "dark"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => update({ theme: opt })}
                className={cn(
                  "px-3 py-1 rounded font-mono text-[11px] text-muted-foreground transition-colors",
                  data.theme === opt ? "bg-bg-hover text-foreground ring-1 ring-border-strong" : "hover:text-foreground"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Diagnostics">
        <Row label="Build" hint="Git short-sha and app version.">
          <span className="font-mono text-[12px] text-muted-foreground">
            v0.1.0 · {import.meta.env.VITE_BUILD_SHA as string}
          </span>
        </Row>
        <Row label="Config directory" hint="Settings, ownership, targets, and audit log live here.">
          <span className="font-mono text-[11.5px] text-muted-foreground break-all">
            ~/Library/Application Support/skill-sync
          </span>
        </Row>
      </Section>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative inline-block w-9 h-5 rounded-full transition-colors",
        on ? "bg-primary" : "bg-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}
```

`ipc.setSettings` is a typed wrapper around the Rust command `cmd_set_settings` — confirmed to exist in `src/lib/ipc.ts`. No additional verification needed.

- [ ] **Step 3: Replace `src/pages/settings.tsx`**

```tsx
import { SettingsForm } from "@/components/settings-form";

export function SettingsPage() {
  return (
    <div className="console-rise">
      <div className="px-8 pt-7 pb-4">
        <div className="font-mono text-[11px] text-fg-faint flex items-center gap-1.5 mb-3">
          <span>~</span><span>›</span><span className="text-muted-foreground">settings</span>
        </div>
        <h1 className="font-display text-2xl">Settings</h1>
        <div className="font-mono text-xs text-fg-dim mt-1.5">
          Source · 4 targets · packaging · appearance · diagnostics
        </div>
      </div>
      <SettingsForm />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 33: Restyle SyncPreviewDialog

**Files:**
- Modify: `src/components/sync-preview-dialog.tsx` (full rewrite — preserve mutation hookup)

- [ ] **Step 1: Replace the file**

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useExecuteSync } from "@/hooks/use-sync";
import type { SyncPlan, PlanAction } from "@/types/bindings";

const ACTION_TONE: Record<PlanAction, "primary" | "warning" | "default" | "danger"> = {
  Create: "primary",
  Update: "warning",
  Skip:   "default",
  Refuse: "danger",
};

export function SyncPreviewDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: SyncPlan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const exec = useExecuteSync();
  if (!plan) return null;
  const counts = plan.rows.reduce<Record<PlanAction, number>>(
    (m, r) => ({ ...m, [r.action]: (m[r.action] ?? 0) + 1 }),
    { Create: 0, Update: 0, Skip: 0, Refuse: 0 }
  );
  const hasWork = plan.rows.some((r) => r.action === "Create" || r.action === "Update");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <header className="px-5 py-4 border-b border-border">
          <div className="eyebrow">Sync preview · ⌘P</div>
          <div className="mt-3 grid grid-cols-4 gap-4">
            {(Object.keys(counts) as PlanAction[]).map((k) => (
              <div key={k}>
                <div className="font-display text-xl tabular-nums leading-none text-foreground">{String(counts[k]).padStart(2, "0")}</div>
                <div className="mt-1.5"><Badge variant={ACTION_TONE[k]}>{k}</Badge></div>
              </div>
            ))}
          </div>
        </header>

        <div className="max-h-[420px] overflow-auto">
          <div className="grid grid-cols-[1fr_120px_100px_2fr] gap-x-3 px-5 py-2.5 border-b border-border bg-card/30">
            <div className="eyebrow">Skill</div>
            <div className="eyebrow">Target</div>
            <div className="eyebrow">Action</div>
            <div className="eyebrow">Note</div>
          </div>
          <ul>
            {plan.rows.map((r, i) => (
              <li key={i} className="grid grid-cols-[1fr_120px_100px_2fr] gap-x-3 items-center px-5 py-2.5 border-b border-border last:border-b-0">
                <div className="text-sm text-foreground truncate">{r.skill}</div>
                <div className="font-mono text-[11.5px] text-muted-foreground">{r.target}</div>
                <div><Badge variant={ACTION_TONE[r.action]}>{r.action}</Badge></div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{r.reason ?? "—"}</div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button
            disabled={!hasWork || exec.isPending}
            onClick={() => exec.mutate(plan, { onSuccess: () => onOpenChange(false) })}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-primary text-primary-foreground border border-primary text-[12.5px] font-medium hover:brightness-105 disabled:opacity-50"
          >
            {exec.isPending ? "Syncing…" : "Sync now"} <Kbd className="!bg-transparent !border-black/15 !text-black/55">↵</Kbd>
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 34: Restyle SkillDetailDrawer

**Files:**
- Modify: `src/components/skill-detail-drawer.tsx` (full rewrite)

- [ ] **Step 1: Read existing `src/components/skill-detail-drawer.tsx`** to preserve the data hooks and pull-back wiring.

- [ ] **Step 2: Replace the file**

```tsx
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { OwnerBadge } from "./owner-badge";
import { DriftBadge } from "./drift-badge";
import { useUIState } from "@/store/ui-state";
import { useSkills } from "@/hooks/use-skills";
import { useOwnership } from "@/hooks/use-ownership";
import { useDrift } from "@/hooks/use-drift";
import { usePullBack } from "@/hooks/use-sync";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { DriftStatus, LocationView } from "@/types/bindings";

const PRETTY_TARGET: Record<string, string> = {
  claude: "Claude Code",
  codex:  "Codex",
  cursor: "Cursor",
  cowork: "Cowork (zip)",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
      <span className="eyebrow whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

export function SkillDetailDrawer() {
  const selected = useUIState((s) => s.selectedSkill);
  const close = useUIState((s) => s.selectSkill);
  const skills = useSkills();
  const ownership = useOwnership();
  const drift = useDrift();
  const pullBack = usePullBack();
  const skill = skills.data?.find((s) => s.name === selected) ?? null;
  if (!skill) return <Sheet open={false} onOpenChange={(v) => !v && close(null)}><SheetContent side="right" /></Sheet>;

  const confirmed = ownership.data?.skills?.[skill.name]?.class === "mine";
  const driftRow = (drift.data?.[skill.name] ?? {}) as Partial<Record<string, DriftStatus>>;
  const primaryLoc: LocationView | undefined = skill.locations[0];

  return (
    <Sheet open={!!selected} onOpenChange={(v) => !v && close(null)}>
      <SheetContent side="right" className="overflow-y-auto p-0">
        <div className="px-6 py-5 border-b border-border">
          <div className="eyebrow mb-2">Skill detail</div>
          <h2 className="font-display text-xl text-foreground leading-tight">{skill.name}</h2>
          <div className="mt-1 font-mono text-[11.5px] text-fg-dim truncate" title={primaryLoc?.path}>
            {primaryLoc?.path.replace(/^.*\/Users\/[^/]+/, "~") ?? "—"}
          </div>
        </div>

        <div className="px-6 py-5">
          <SectionLabel>Meta</SectionLabel>
          <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 font-mono text-[12px]">
            <dt className="text-fg-dim">class</dt>
            <dd className="text-foreground"><OwnerBadge klass={skill.class} confirmed={confirmed} /></dd>
            <dt className="text-fg-dim">locations</dt>
            <dd className="text-foreground">{skill.locations.length}</dd>
            <dt className="text-fg-dim">hash</dt>
            <dd className="text-foreground">{primaryLoc?.hash.slice(0, 12) ?? "—"}</dd>
            <dt className="text-fg-dim">symlink</dt>
            <dd className="text-foreground">{primaryLoc?.is_symlink ? "yes" : "no"}</dd>
          </dl>

          <SectionLabel>Targets</SectionLabel>
          <ul className="space-y-2">
            {(["claude", "codex", "cursor", "cowork"] as const).map((t) => {
              const status = t === "cowork" ? undefined : driftRow[t];
              return (
                <li key={t} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 border border-border rounded-md bg-card">
                  <div className="text-sm">{PRETTY_TARGET[t]}</div>
                  <div>{status ? <DriftBadge status={status} /> : <span className="font-mono text-[10.5px] text-fg-dim">—</span>}</div>
                  <div className="flex gap-1.5">
                    {status === "drifted-target-newer" && (
                      <button
                        onClick={() => pullBack.mutate({ skill: skill.name, target: t })}
                        className="font-mono text-[10.5px] px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:bg-bg-hover"
                      >
                        pull
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <SectionLabel>Archive</SectionLabel>
          <div className="font-mono text-[11.5px] text-muted-foreground leading-relaxed">
            Overwrites are archived to <span className="text-foreground">~/.Trash/skill-sync-archive/&lt;ts&gt;/</span> before write. Recoverable via Finder.
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => primaryLoc && revealItemInDir(primaryLoc.path).catch(() => {})}
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground hover:bg-bg-hover"
            >
              Reveal in Finder
            </button>
            <button
              disabled
              title="Packaging not yet wired"
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-muted-foreground opacity-50 cursor-not-allowed"
            >
              Build .skill
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

`usePullBack` takes `{ skill: string; target: string }` (confirmed in `src/hooks/use-sync.ts`). The call here matches.

- [ ] **Step 3: Verify**

Run: `pnpm build`

Expected: clean.

---

### Task 35: Phase 3 verification + commit

- [ ] **Step 1: Full visual sweep**

Run: `pnpm tauri dev`

Walk each route and verify:

- **Library**: header strip, stats, filter chips, search, drift bars, hover actions. Press `⌘↵` → Sync mine triggers preview dialog.
- **Targets**: 2×2 grid of TargetCards with HealthBar; "Reveal in Finder" works for an enabled card.
- **Activity**: dense table, filter chips work; load more pagination works.
- **Settings**: every section renders; toggles update settings; theme switch toggles instantly.
- **Sync preview dialog**: opens with action counts, table of plan rows, primary button.
- **Skill drawer**: opens on row click, sections render, "Build .skill" is disabled with tooltip.

- [ ] **Step 2: Light mode sweep**

In Settings → Theme, switch to Light. Re-walk the same routes. Confirm contrast is acceptable, accents render in the darker lime (`#6f8d18`), no dark-mode-only values are leaking through.

- [ ] **Step 3: Reduced motion sweep**

In macOS System Settings → Accessibility → Display → Reduce motion, enable. Restart the app. Confirm the caret stops blinking, the sync-state pulse stops, and table rows fade in instantly.

- [ ] **Step 4: Commit Phase 3**

```bash
git add -A
git commit -m "ui(console): targets, activity, settings, dialogs, drawer

- HealthBar (per-target stacked health, proportional widths)
- TargetCard: new layout with HealthBar + reveal/test actions
- ActivityList: dense table with kind chips + filter chips + load more
- SettingsForm: labeled rows under mono section headers
- SyncPreviewDialog: Console-styled with action counts and chips
- SkillDetailDrawer: section-based with targets/archive/actions
- Every page now uses the same crumb + H1 + mono subhead pattern

Build .skill in the drawer is disabled-with-tooltip until packaging UI is wired.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Phase 3 checkpoint

- [ ] Every route looks Console.
- [ ] All shortcuts still work.
- [ ] Light + dark modes both render the spec.
- [ ] Reduced-motion respected.
- [ ] `pnpm build` clean.

---

## Self-review checklist

Run through this checklist after the engineer completes all three phases:

- [ ] **Tokens** — `--background #0a0a0a` (dark) and `#fafafa` (light) confirmed in tokens.css. Lime `#d3ec5a` (dark) and `#6f8d18` (light) confirmed.
- [ ] **Type stacks** — `font-display` and `font-body` resolve to Geist; `font-mono` to Geist Mono. Tailwind types applied.
- [ ] **Title bar** — Overlay style on macOS, `// SKILL.SYNC` + caret blink, sync-state pill, version+sha+clock.
- [ ] **Sidebar** — 220px compact mono nav with Workspace / Source / Targets / Footer sections.
- [ ] **Library page** — crumb · H1 · subhead · 4-cell stats with sparkline · 5 filter chips · search with `/` · dense table with DriftBar per row · row hover actions · click opens drawer.
- [ ] **DriftBar** — 4 lanes (claude/codex/cursor/cowork), tooltips, summary label, cowork lane dashed.
- [ ] **OwnerBadge** — dotted chips, no unicode marks.
- [ ] **OwnershipInbox** — deleted; classify is inline in the table row.
- [ ] **TargetsPage** — 2×2 grid, HealthBar with proportional segments.
- [ ] **ActivityPage** — dense table with kind chips and filter chips.
- [ ] **SettingsPage** — sectioned form, theme toggle, all settings round-trip.
- [ ] **SyncPreviewDialog & SkillDetailDrawer** — Console-styled.
- [ ] **Build .skill** — disabled with tooltip (per spec).
- [ ] **Cowork lane in DriftBar** — always dashed (per spec).
- [ ] **Shortcuts** — `⌘K`, `/`, `⌘↵`, `G L/T/A/S`, `Esc` all working. Cmdbar pill visible.
- [ ] **Animations** — page rise stagger, caret blink, pulse halo — all respect `prefers-reduced-motion`.
- [ ] **Accessibility** — focus rings lime, drift state encoded by shape + color + label.
- [ ] **Both themes** — light and dark each look intentional, contrast passes.
- [ ] **No App.css** — confirmed deleted.

If anything is missing, fix it in a follow-up commit before declaring the swap done.

---

## Out of scope follow-ups

- Real fuzzy `⌘K` command palette with skill search + navigation + sync actions.
- Wiring the drawer's "Build .skill" button to the existing packaging command and surfacing cowork freshness.
- Adding `size` field to `SkillView` so the Library "Size" column shows actual bytes.
- A diff viewer surface beyond the drawer's archive note.
- Vitest setup + unit coverage for `bucketArchivesByDay`, `HealthBar` widths, and the global-shortcut state machine.
