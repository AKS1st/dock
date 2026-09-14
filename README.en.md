# dock

[中文](README.md)

> **The best workbench base plugin in the DSH ecosystem — no contest.** Others reinvent the wheel when they build a workbench; dock hands you a VSCode-grade layout shell, an open registry and a plug-and-play plugin ecosystem. Want a file explorer? Install one. Want a Git graph? Install another. Your DSH gains a whole IDE-class workbench, and dock is the miracle base that ties it all together.

Base plugin for the DSH Web workbench: a VSCode-style layout shell (activity bar / side bar / editor area / panel / status bar) with a registry service (`ctx.workbench`) that lets feature plugins mount panels, editor views, activity items, status items and commands. This is the base of the **dock family**: `dock-files`, `dock-editor`, `dock-images`, `dock-markdown` and `dock-git` all depend on the workbench shell it provides.

## Features

- **Activity bar**: left vertical strip with registered icon items; clicking switches the side-bar panel.
- **Side bar**: hosts feature panels (file explorer, Git launcher, ...).
- **Editor area**: multi-tab editor views (file viewers, Git commit graph, ...).
- **Dock mode**: the whole workbench docks to any screen edge and supports independent floating windows (draggable / resizable).
- **Status bar**: bottom status item registration.
- **Command system**: `executeCommand` command registration and invocation.
- **Layout persistence**: panel / floating-window layout is kept in localStorage and restored on reload.
- **Settings window**: a built-in settings dialog displays settings registered by feature plugins, with validation, ordering, keyboard focus management and persistence across reloads.
- **Open registry**: `registerActivityBarItem` / `registerPanel` / `registerEditorView` / `registerStatusBarItem` / `registerCommand` / `registerSetting` — each returns a disposer, so wrapping it in `ctx.effect` cleans up automatically when the plugin is disabled.

## Recommended companion plugins (composable — install on demand)

The dock base only provides the workbench shell; concrete capabilities like file browsing and editing live in feature plugins. Each recommendation below is listed one by one: **all of them are optional, freely composable, and installed per your actual needs — you do not need all of them.**

1. **[dock-files](https://github.com/AKS1st/dock-files)** — file explorer. Mounts a side-bar files panel browsing the session workspace with new/rename/copy-paste/delete, drag-and-drop import, local-file paste and clipboard-image paste. *Install it when you want to browse and manage files.*
2. **[dock-editor](https://github.com/AKS1st/dock-editor)** — text viewer/editor. Undo/redo, Ctrl+S save, unsaved-change confirmation and binary detection; the default text viewer of dock-files. *Install it when you want to edit text (requires dock-files).*
3. **[dock-images](https://github.com/AKS1st/dock-images)** — image viewer. PNG/JPEG/GIF/WebP/BMP/SVG/ICO/AVIF with safe SVG rendering. *Install it when you need to view images (requires dock-files).*
4. **[dock-markdown](https://github.com/AKS1st/dock-markdown)** — Markdown viewer. md/markdown/mdx rendering, document outline, relative-asset resolution and one-click switch to editing. *Install it when you often read docs/READMEs (requires dock-files and dock-editor).*
5. **[dock-git](https://github.com/AKS1st/dock-git)** — Git history visualization. Swimlane commit graph, branch/tag management, stage/commit/push and remote operations. *Install it when you work in repositories; fully independent of file browsing.*

**Suggested combinations (for reference only — never mandatory):**

| Scenario | Install |
| --- | --- |
| Browse files only | `dock` + `dock-files` |
| Browse + edit text | `dock` + `dock-files` + `dock-editor` |
| Full file workbench | `dock` + `dock-files` + `dock-editor` + `dock-images` + `dock-markdown` |
| Manage Git too | any of the above + `dock-git` |

Installing `dock` alone is perfectly fine too — it is a clean workbench shell, ready for you to add components any time.

## Settings API

Since 0.2.0, the workbench exposes a public settings-registration API. Feature plugins call `ctx.workbench.registerSetting`; pass the disposer to `ctx.effect` so the registration is removed automatically when the plugin is disabled or hot-reloaded. The settings window sorts entries by `order` (then `id`), and each editor receives only its current value, an `onChange` callback and the active locale. Values are validated before they are written:

```ts
ctx.effect(() => ctx.workbench.registerSetting({
  id: 'my-plugin:compact',
  pluginId: 'my-plugin',
  // Text may be a plain string or a locale-aware factory.
  title: (locale) => locale === 'zh' ? '紧凑模式' : 'Compact mode',
  defaultValue: false,
  component: CompactToggle,
  validate: (value): value is boolean => typeof value === 'boolean',
}))
```

`pluginId` decides which plugin page hosts the setting. A plugin should also register metadata through `registerPlugin({ id, title, description, icon, hasEntry })` so the settings window can list it (a missing icon falls back to dock's generic plugin icon). Plugins with a dock entry (`hasEntry: true`) get an "Open" button and a "Show in dock" switch; a hidden entry can still be opened from the settings window.

Open the settings window from the workbench to edit registered values. Settings are persisted in `localStorage` under `dock:settings` and restored after reload. If storage is unavailable or corrupt, the workbench continues with in-memory values and defaults. Plugins can also use `getSetting`, `setSetting` and `onDidChangeSetting` to read, update and subscribe to changes.

### General settings

Dock's own options live under "General settings": position, auto-hide, "Reserve space for the dock", and the two magnification factors. The dock icon at the end of the bar opens that settings window:

- **Dock position**: a four-way segmented switch (left/right/top/bottom) that shares one state with the right-click menu.
- **Auto-hide**: the bar slides, scales, and fades out when the mouse leaves; a visible edge marker remains so users can discover it and move to the edge to expand it. Disabling auto-hide immediately forces a hidden dock back into view.
- **Reserve space for the dock** (on by default): only the conversation turn rail is moved left by the measured dock width plus a 12px gap when the dock is on the right; page width and scrollbar position remain unchanged. The offset is recomputed when the bar resizes, the window resizes, or the switch changes, and drops to zero when disabled.
- **Hovered icon / neighbour magnification** (1.6× / 1.2× by default): the fisheye pop in dock mode, each tunable on its own slider between 1.0–2.5× and 1.0–2.0× in 0.05 steps, applied live while dragging; the neighbour factor never exceeds the hovered one.
- **Dock icon**: the dock glyph at the end of the bar (three squares on a bar) opens this settings window. Like any other entry it can be hidden under "Plugins → Entry → Dock"; the dock bar's right-click menu still opens settings afterwards.

## Dependencies

| Dependency | Type | Notes |
| --- | --- | --- |
| DSH Web environment | runtime | required, minimum version `>=0.1.3-alpha.2`. Client platform is Web; installed via `dsh plugin --profile web add` |
| `cordis` ^4.0.0-rc.7 | peer | plugin framework (ships with DSH) |
| `react` / `react-dom` ^18.2.0 | peer (optional) | needed for client rendering; without them the workbench UI does not activate |

dock itself depends on no other dock-family plugin — it is the foundation of the family, and the other five all depend on it.

## Install

Requires a DSH Web environment (`dsh plugin --profile web add`) running Harness `0.1.3-alpha.2` or newer.

Recommended install from the npm registry:

```sh
dsh plugin --profile web add dock-base
dsh plugin --profile web add dock-files
dsh plugin --profile web add dock-editor
dsh plugin --profile web add dock-images
dsh plugin --profile web add dock-markdown
dsh plugin --profile web add dock-git
```

Or install from GitHub (alternative):

```sh
dsh plugin --profile web add github:AKS1st/dock
dsh plugin --profile web add github:AKS1st/dock-files
dsh plugin --profile web add github:AKS1st/dock-editor
dsh plugin --profile web add github:AKS1st/dock-images
dsh plugin --profile web add github:AKS1st/dock-markdown
dsh plugin --profile web add github:AKS1st/dock-git
```

Or install locally with `link:` in your profile dependencies. `dock` provides the `ctx.workbench` service; feature plugins collaborate through it and install order does not matter (Cordis activates by dependency).

## Development

```sh
pnpm install
pnpm run build    # tsc declarations + tsdown bundle
pnpm run check    # type-check only
```

## Plugin contract

`src/client/contract.ts` is the public workbench contract (`WorkbenchService`, `ViewProps`, `EditorOpenSeed`, ...). Feature plugins import it type-only (erased at build time); all runtime collaboration happens through `ctx.workbench` method calls. Each feature plugin carries a vendored copy of this contract — keep it in sync when changing this file.

## License

MIT
