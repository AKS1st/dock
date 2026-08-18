/**
 * Public contract of the desk base (client side).
 *
 * Feature plugins consume this contract via type-only import
 * (`import type {} from 'desk/client/contract'`), which also pulls
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
 * An SVG icon spec, rendered by the desk shell with `currentColor` so it
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

/** One view registered into a workbench region (side bar pane / editor area tab / panel). */
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

/**
 * The workbench layout snapshot: which activity is active, whether the side
 * bar is open, which editor views are open (tab strip), the bottom panel
 * state, and the dock configuration (edge / presentation mode / auto-hide —
 * the latter two land in later phases and default to 'panel' / 'off').
 */
export interface WorkbenchLayout {
  /** Active activity-bar item id; null collapses the workbench to the strip. */
  activity: string | null
  sideBarOpen: boolean
  /** Open editor view instances in the editor area (tab order). */
  editorTabs: EditorTab[]
  /** The focused editor instance id. */
  activeEditorTab: string | null
  panelOpen: boolean
  /** The panel's current view id. */
  panelViewId: string | null
  /** The screen edge this workbench docks to. */
  dock: DockPosition
  /** Presentation mode: 'panel' (embedded) or 'dock' (macOS-like floating). */
  deskMode: 'panel' | 'dock'
  /** Auto-hide behavior: 'off' (always visible) or 'edge' (hide when the mouse leaves). */
  autoHide: 'off' | 'edge'
  /** User-ordered activity items (drag-sorted; items not listed keep their registered order). */
  activityOrder: string[]
  /**
   * Absorb the DSH native UI: when true the workbench takes over the whole
   * viewport (fixed layout: activity | sideBar | editor area) and the app
   * shell (#root — session list, chat, input bar, settings) is moved into
   * the editor area as the base's default view. False keeps the DSH app
   * shell in place with the workbench docked alongside.
   */
  absorbNative: boolean
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
  registerPanel(def: ViewDefinition & { region: 'sideBar' | 'panel' }): () => void
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
   */
  openView(viewId: string, seed?: EditorOpenSeed, options?: { floating?: boolean }): string
  /** Close a view instance wherever it lives (tab or floating); unknown ids are a no-op. */
  closeViewInstance(instanceId: string): void
  /** Move a floating window (persisted); instanceId-keyed. */
  moveFloatingWindow(instanceId: string, x: number, y: number): void
  /** Resize a floating window (persisted); instanceId-keyed. */
  resizeFloatingWindow(instanceId: string, width: number, height: number): void

  /**
   * Unified file-path entry: system interception (chat links, produced
   * files) and third-party plugins route here; the registered open-path
   * handler (the file domain host, e.g. desk-files) owns the path.
   */
  openPath(path: string, options?: OpenPathOptions): void
  /** The file-domain host declares it can open file paths. Returns the disposer. */
  registerOpenPathHandler(handler: (path: string, options?: OpenPathOptions) => void): () => void

  /** Registry lookups (undefined when not registered). */
  getPanel(id: string): (ViewDefinition & { region: 'sideBar' | 'panel' }) | undefined
  getEditorView(id: string): ViewDefinition | undefined
  getActivityItem(id: string): ActivityBarItemDefinition | undefined
  /** Snapshot of all registered items (for the shell render). */
  getPanels(): readonly (ViewDefinition & { region: 'sideBar' | 'panel' })[]
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
