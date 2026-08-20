/**
 * Public contract of the dock base (client side).
 *
 * Feature plugins consume this contract via type-only import
 * (`import type {} from 'dock/client/contract'`), which also pulls
 * in the `Context.workbench` augmentation below — the single restatement
 * point, so plugins never re-declare the service on their own (purity gate
 * friendly: type-only imports are erased at build time).
 *
 * Runtime collaboration happens exclusively through `ctx.workbench` method
 * calls; value-importing another plugin's bundle is forbidden by the
 * client-bundle purity convention.
 */
import type { ComponentType, ReactNode } from 'react'
// Loads the cordis module so the augmentation below is validated against it
// (TS requires the augmented module to be part of the program).
import type {} from 'cordis'

/** The cordis context face the workbench hands to view components
 *  (structural subset; feature plugins may extend it locally). */
export interface WorkbenchContext {
  effect(fn: () => void | (() => void), label?: string): void
  get<T = unknown>(name: string): T | undefined
  on(event: string, listener: (...args: unknown[]) => void): () => void
  provide<T>(name: string, value: T): void
  [name: string]: unknown
}

/** Props every registered view component receives. */
export interface ViewProps {
  ctx: WorkbenchContext
  /** The view's registered id (`'files'`, `'my-plugin:db'`). */
  viewId: string
  /** The active DSH conversation id when one is known. */
  sessionId?: string
  /** Whether this view is the one on screen (inactive views may pause polling). */
  active: boolean
  /** The open seed this tab was opened with (file path, title, meta). */
  seed?: unknown
}

/** A view component, or a lazy factory resolving to one on first use. */
export type ViewComponent = ComponentType<ViewProps> | (() => Promise<ComponentType<ViewProps>>)

/**
 * An SVG icon spec, rendered by the dock shell with `currentColor` so it
 * follows the theme. `path` is a single SVG path `d` (fill style by
 * default; `stroke: true` switches to lucide-style stroke rendering).
 */
export interface IconSpec {
  /** SVG path `d` data (24×24 viewBox by default). */
  path: string
  /** Rendered size in px; default 16. */
  size?: number
  /** Override the viewBox (default '0 0 24 24'). */
  viewBox?: string
  /** Stroke style instead of fill: stroke=currentColor, stroke-width 2, round caps/joins. */
  stroke?: boolean
}

/**
 * What a registration may pass as an icon: any React node (emoji, custom
 * component) or an SVG spec (`{ path: 'M...' }`), rendered by the shell.
 */
export type IconRef = ReactNode | IconSpec

/** Input handed to a view's `beforeClose` hook when one of its instances is about to close. */
export interface CloseRequest {
  /** The view's registered id. */
  viewId: string
  /** The instance being closed (shared vocabulary with editorTabs / floatingWindows). */
  instanceId: string
  /** The instance's open seed — views read instance-level state (e.g. `seed.meta?.dirty`) here. */
  seed?: EditorOpenSeed
}

/** One view registered into a workbench region (side bar pane / editor area tab). */
export interface ViewDefinition {
  /** Unique id; also the `viewId` handed to the component. */
  id: string
  /** Title (i18n friendly: string or () => string). */
  title: string | (() => string)
  /** Icon shown in the activity bar / tab strip. */
  icon?: IconRef
  /** Sort order (ascending); default 100. */
  order?: number
  /** The component (or lazy factory). */
  component: ViewComponent
  /**
   * Close gate: called with the instance's `{ viewId, instanceId, seed }`
   * before the shell removes its tab / floating window. Return `false` (or a
   * promise resolving to `false`) to cancel the close; any other value lets
   * it proceed. Views use this to confirm unsaved changes — typically read
   * `seed.meta?.dirty` and `window.confirm(...)` themselves. The hook is
   * definition-level (registered once with the view); per-instance state
   * lives on the seed (see `updateViewSeed`).
   */
  beforeClose?(instance: CloseRequest): boolean | Promise<boolean>
}

/** One activity-bar item (the left vertical strip, VSCode style). */
export interface ActivityBarItemDefinition {
  id: string
  title: string
  icon: IconRef
  /** Sort order (ascending); default 100. */
  order?: number
  /** The side bar pane to reveal when this item is activated. */
  paneId: string
}

/** One status-bar item (bottom strip, left/right groups in Phase 2). */
export interface StatusBarItemDefinition {
  id: string
  /** Sort order (ascending); default 100. */
  order?: number
  component: ComponentType<{ ctx: WorkbenchContext }>
}

/** One command, invocable through `executeCommand` (keybindings in Phase 2). */
export interface CommandDefinition {
  id: string
  title: string
  run: (...args: unknown[]) => unknown | Promise<unknown>
}

/** The screen edge the workbench docks to. */
export type DockPosition = 'left' | 'right' | 'top' | 'bottom'

/** Minimum floating-window width in px (enforced by drag math and CSS). */
export const FLOATING_MIN_WIDTH = 240
/** Minimum floating-window height in px (enforced by drag math and CSS). */
export const FLOATING_MIN_HEIGHT = 160
/** Floating-window title bar height in px (`.dsh-wb-floating-head`); the
 *  viewport clamp keeps at least this strip reachable on screen. */
export const FLOATING_HEAD_HEIGHT = 34

/**
 * The workbench layout snapshot: which activity is active, whether the side
 * bar is open, which editor views are open (tab strip), the dock
 * configuration (edge / auto-hide), and the independent floating windows.
 * The workbench always runs in dock mode (macOS-like floating bar); the
 * embedded panel presentation was removed.
 */
export interface WorkbenchLayout {
  /** Active activity-bar item id; null collapses the workbench to the strip. */
  activity: string | null
  sideBarOpen: boolean
  /** Open editor view instances in the editor area (tab order). */
  editorTabs: EditorTab[]
  /** The focused editor instance id. */
  activeEditorTab: string | null
  /** The screen edge this workbench docks to. */
  dock: DockPosition
  /** Auto-hide behavior: 'off' (always visible) or 'edge' (hide when the mouse leaves). */
  autoHide: 'off' | 'edge'
  /** User-ordered activity items (drag-sorted; items not listed keep their registered order). */
  activityOrder: string[]
  /** Independent floating windows (viewId -> window). */
  floatingWindows: Record<string, FloatingWindow>
}

/** Payload an editor view carries to the component (file path, title, custom state). */
export interface EditorOpenSeed {
  /** A file path the view loads (editor reads fs through its own route). */
  path?: string
  /** Overrides the descriptor title (the editor tab shows the file name). */
  title?: string
  /** JSON-serializable custom state carried on the tab (persisted across reloads). */
  meta?: unknown
}

/** One independent floating window (an open instance + geometry, persisted). */
export interface FloatingWindow {
  /** The open instance id (shared vocabulary with editorTabs). */
  instanceId: string
  viewId: string
  seed?: EditorOpenSeed
  x: number
  y: number
  width: number
  height: number
}

/** One open editor instance (a view + its seed) hosted in the editor area. */
export interface EditorTab {
  /** Unique instance id (stable across container moves, survives reloads). */
  instanceId: string
  viewId: string
  seed?: EditorOpenSeed
}

/** Options for opening a file path through the workbench (system entry). */
export interface OpenPathOptions {
  /** Explicit title (defaults to the file name). */
  title?: string
  /** Target editor view id (defaults to the registered default file view). */
  viewId?: string
}

/**
 * The registry service published as `ctx.workbench` by the workbench base.
 * Every `register*` call returns a disposer that unregisters the item; the
 * consuming plugin wraps it in `ctx.effect(...)` so Cordis fiber disposal
 * (HMR / disable) reverts the registration.
 */
export interface WorkbenchService {
  registerActivityBarItem(def: ActivityBarItemDefinition): () => void
  registerPanel(def: ViewDefinition & { region: 'sideBar' }): () => void
  registerEditorView(def: ViewDefinition): () => void
  registerStatusBarItem(def: StatusBarItemDefinition): () => void
  registerCommand(def: CommandDefinition): () => void
  executeCommand(id: string, ...args: unknown[]): Promise<unknown>

  /** Read the current layout (synchronous snapshot). */
  getLayout(): WorkbenchLayout
  /** Patch the layout (persisted to localStorage). */
  updateLayout(patch: Partial<WorkbenchLayout>): void
  /** Subscribe to layout changes; returns the disposer. */
  onDidChangeLayout(listener: () => void): () => void

  /**
   * Open (or focus) one view instance. Defaults to the editor area (tab);
   * options.floating hosts it in an independent floating window. Returns
   * the instance id (a matching open focuses the existing instance).
   * Replacing an existing instance's seed — opening a new file into an
   * already-open window/tab — is gated by the view's `beforeClose` hook
   * exactly like closing it: a `false` verdict aborts the open and keeps the
   * old seed, so a dirty editor's content is never silently discarded.
   */
  openView(viewId: string, seed?: EditorOpenSeed, options?: { floating?: boolean }): string
  /**
   * Close a view instance wherever it lives (tab or floating); unknown ids
   * are a no-op. Before removing the instance the shell consults the
   * instance's view definition: when the view registered a `beforeClose`
   * hook it is called with `{ viewId, instanceId, seed }`; returning `false`
   * (or a promise resolving to `false`) cancels the close. The call is
   * fire-and-forget — with an async hook the confirm dialog shows while the
   * layout stays untouched, and the removal happens on approval.
   */
  closeViewInstance(instanceId: string): void
  /**
   * Patch one open instance's seed in place (editor tab or floating window;
   * unknown ids are a no-op). `patch.meta` is shallow-merged into the
   * instance's current meta when both are plain objects, so an editor writes
   * its dirty flag as `updateViewSeed(id, { meta: { dirty: true } })`; all
   * other patch fields replace the seed's field wholesale.
   */
  updateViewSeed(instanceId: string, patch: Partial<EditorOpenSeed>): void
  /** Move a floating window (persisted); the resulting rect is clamped so
   *  the title bar stays on-screen. */
  moveFloatingWindow(instanceId: string, x: number, y: number): void
  /** Resize a floating window from any edge/corner (persisted): the full
   *  rect is passed because dragging a west/north edge also moves the
   *  window. The resulting rect is clamped so the title bar stays on-screen. */
  resizeFloatingWindow(instanceId: string, x: number, y: number, width: number, height: number): void
  /** Pull every open floating window back so its title bar is on-screen
   *  (viewports shrink, or geometry remembered on a larger screen). Drags
   *  already clamp live; this covers resize/mount recovery. */
  clampFloatingWindowsIntoView(): void

  /**
   * Unified file-path entry: system interception (chat links, produced
   * files) and third-party plugins route here; the registered open-path
   * handler (the file domain host, e.g. dock-files) owns the path.
   */
  openPath(path: string, options?: OpenPathOptions): void
  /** The file-domain host declares it can open file paths. Returns the disposer. */
  registerOpenPathHandler(handler: (path: string, options?: OpenPathOptions) => void): () => void

  /** Registry lookups (undefined when not registered). */
  getPanel(id: string): (ViewDefinition & { region: 'sideBar' }) | undefined
  getEditorView(id: string): ViewDefinition | undefined
  getActivityItem(id: string): ActivityBarItemDefinition | undefined
  /** Snapshot of all registered items (for the shell render). */
  getPanels(): readonly (ViewDefinition & { region: 'sideBar' })[]
  getEditorViews(): readonly ViewDefinition[]
  getActivityItems(): readonly ActivityBarItemDefinition[]
  getStatusItems(): readonly StatusBarItemDefinition[]
  getCommands(): readonly CommandDefinition[]
  /** Subscribe to registry changes; returns the disposer. */
  subscribe(listener: () => void): () => void
}

declare module 'cordis' {
  interface Context {
    workbench: WorkbenchService
  }
}

// DSH runtime additionally ships the vendored `@deepseek-ai/cordis` scope;
// the same augmentation is added there at integration time (see
// context-types.ts of the community sidebar plugin). It is intentionally not
// declared here so this package builds standalone without that scope.
