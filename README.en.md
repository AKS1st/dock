# dock

[中文](README.md)

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

## Install

Requires a DSH Web environment (`dsh plugin add`). Install together with the rest of the dock family:

```sh
dsh plugin add github:AKS1st/dock
dsh plugin add github:AKS1st/dock-files
dsh plugin add github:AKS1st/dock-editor
dsh plugin add github:AKS1st/dock-images
dsh plugin add github:AKS1st/dock-markdown
dsh plugin add github:AKS1st/dock-git
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
