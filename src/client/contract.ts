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
}

/** A view component, or a lazy factory resolving to one on first use. */
export type ViewComponent = ComponentType<ViewProps> | (() => Promise<ComponentType<ViewProps>>)

/** One view registered into a workbench region (side bar pane / editor area tab / panel). */
export interface ViewDefinition {
  /** Unique id; also the `viewId` handed to the component. */
  id: string
  /** Title (i18n friendly: string or () => string). */
  title: string | (() => string)
  /** Icon shown in the activity bar / tab strip. */
  icon?: ReactNode
  /** Sort order (ascending); default 100. */
  order?: number
  /** The component (or lazy factory). */
  component: ViewComponent
}

/** One activity-bar item (the left vertical strip, VSCode style). */
export interface ActivityBarItemDefinition {
  id: string
  title: string
  icon: ReactNode
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

/**
 * The workbench layout snapshot: which activity is active, whether the side
 * bar is open, which editor views are open (tab strip), and the bottom
 * panel state. Phase 1 keeps a single editor area (no recursive splits —
 * that is Phase 2 work).
 */
export interface WorkbenchLayout {
  /** Active activity-bar item id; null collapses the workbench to the strip. */
  activity: string | null
  sideBarOpen: boolean
  /** Open editor views in the editor area (tab order). */
  editorTabs: string[]
  /** The focused editor view id. */
  activeEditorTab: string | null
  panelOpen: boolean
  /** The panel's current view id. */
  panelViewId: string | null
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

  /** Open (or focus) an editor view in the editor area. */
  openEditorView(viewId: string): void
  /** Close an editor view; unknown ids are a no-op. */
  closeEditorView(viewId: string): void

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
