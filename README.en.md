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
- **Open registry**: `registerActivityBarItem` / `registerPanel` / `registerEditorView` / `registerStatusBarItem` / `registerCommand` — each returns a disposer, so wrapping it in `ctx.effect` cleans up automatically when the plugin is disabled.

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

## Dependencies

| Dependency | Type | Notes |
| --- | --- | --- |
| DSH Web environment | runtime | required. Client platform is Web; installed via `dsh plugin --profile web add` |
| `cordis` ^4.0.0-rc.7 | peer | plugin framework (ships with DSH) |
| `react` / `react-dom` ^18.2.0 | peer (optional) | needed for client rendering; without them the workbench UI does not activate |

dock itself depends on no other dock-family plugin — it is the foundation of the family, and the other five all depend on it.

## Install

Requires a DSH Web environment (`dsh plugin --profile web add`).

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
