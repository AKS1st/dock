/**
 * The WorkbenchService implementation: one registry per extension surface
 * (activity items / panels / editor views / status items / commands) plus
 * layout read/write proxying to the layout store. One instance per client
 * activation; published as `ctx.workbench` in the client apply().
 *
 * Design notes (Phase 1):
 * - Synchronous snapshot registries (Map + listener set) so React reads them
 *   through useSyncExternalStore without tearing.
 * - Every register* returns a disposer; consumers wrap it in ctx.effect()
 *   so fiber disposal (HMR / disable) unregisters cleanly.
 * - Duplicate ids throw, like the sidebar registry (package-prefix ids
 *   recommended: 'files', 'my-plugin:db').
 */
import type {
  ActivityBarItemDefinition,
  CommandDefinition,
  EditorOpenSeed,
  OpenPathOptions,
  StatusBarItemDefinition,
  ViewDefinition,
  WorkbenchLayout,
  WorkbenchService,
} from './contract.ts'
import type { LayoutStore } from './layout.ts'

export function createWorkbenchService(store: LayoutStore): WorkbenchService {
  const activityItems = new Map<string, ActivityBarItemDefinition>()
  const panels = new Map<string, ViewDefinition & { region: 'sideBar' | 'panel' }>()
  const editorViews = new Map<string, ViewDefinition>()
  const statusItems = new Map<string, StatusBarItemDefinition>()
  const commands = new Map<string, CommandDefinition>()
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  const registerActivityBarItem = (def: ActivityBarItemDefinition): (() => void) => {
    if (activityItems.has(def.id)) throw new Error(`[desk] activity item "${def.id}" already registered`)
    activityItems.set(def.id, def)
    notify()
    return () => { if (activityItems.get(def.id) === def) { activityItems.delete(def.id); notify() } }
  }

  const registerPanel = (def: ViewDefinition & { region: 'sideBar' | 'panel' }): (() => void) => {
    if (panels.has(def.id)) throw new Error(`[desk] panel "${def.id}" already registered`)
    panels.set(def.id, def)
    notify()
    return () => { if (panels.get(def.id) === def) { panels.delete(def.id); notify() } }
  }

  const registerEditorView = (def: ViewDefinition): (() => void) => {
    if (editorViews.has(def.id)) throw new Error(`[desk] editor view "${def.id}" already registered`)
    editorViews.set(def.id, def)
    notify()
    return () => { if (editorViews.get(def.id) === def) { editorViews.delete(def.id); notify() } }
  }

  const registerStatusBarItem = (def: StatusBarItemDefinition): (() => void) => {
    if (statusItems.has(def.id)) throw new Error(`[desk] status item "${def.id}" already registered`)
    statusItems.set(def.id, def)
    notify()
    return () => { if (statusItems.get(def.id) === def) { statusItems.delete(def.id); notify() } }
  }

  const registerCommand = (def: CommandDefinition): (() => void) => {
    if (commands.has(def.id)) throw new Error(`[desk] command "${def.id}" already registered`)
    commands.set(def.id, def)
    notify()
    return () => { if (commands.get(def.id) === def) { commands.delete(def.id); notify() } }
  }

  const executeCommand = async (id: string, ...args: unknown[]): Promise<unknown> => {
    const command = commands.get(id)
    if (command === undefined) {
      console.warn(`[desk] unknown command "${id}"`)
      return undefined
    }
    return command.run(...args)
  }

  const openEditorView = (viewId: string, seed?: EditorOpenSeed): void => {
    const current = store.getLayout()
    const editorSeeds = { ...current.editorSeeds }
    if (seed !== undefined) editorSeeds[viewId] = seed
    if (current.editorTabs.includes(viewId)) {
      store.update({ activeEditorTab: viewId, editorSeeds })
      return
    }
    store.update({ editorTabs: [...current.editorTabs, viewId], activeEditorTab: viewId, editorSeeds })
  }

  const closeEditorView = (viewId: string): void => {
    const current = store.getLayout()
    if (!current.editorTabs.includes(viewId)) return
    const editorTabs = current.editorTabs.filter((tab) => tab !== viewId)
    let activeEditorTab = current.activeEditorTab
    if (activeEditorTab === viewId) {
      activeEditorTab = editorTabs.length > 0 ? editorTabs[editorTabs.length - 1]! : null
    }
    const editorSeeds = { ...current.editorSeeds }
    delete editorSeeds[viewId]
    store.update({ editorTabs, activeEditorTab, editorSeeds })
  }

  // Open-path routing: the file-domain host (desk-files) registers a handler
  // through registerOpenPathHandler; openPath dispatches to it (defaulting to
  // the 'editor' view when no handler exists).
  let openPathHandler: ((path: string, options?: OpenPathOptions) => void) | undefined
  const registerOpenPathHandler = (handler: (path: string, options?: OpenPathOptions) => void): (() => void) => {
    openPathHandler = handler
    return () => { if (openPathHandler === handler) openPathHandler = undefined }
  }
  const openPath = (path: string, options?: OpenPathOptions): void => {
    if (openPathHandler !== undefined) {
      openPathHandler(path, options)
      return
    }
    // No file-domain host: fall back to opening the default file view directly.
    openEditorView(options?.viewId ?? 'editor', { path, title: options?.title })
  }

  return {
    registerActivityBarItem,
    registerPanel,
    registerEditorView,
    registerStatusBarItem,
    registerCommand,
    executeCommand,
    getLayout: () => store.getLayout(),
    updateLayout: (patch: Partial<WorkbenchLayout>) => store.update(patch),
    onDidChangeLayout: (listener: () => void) => store.subscribe(listener),
    openEditorView,
    closeEditorView,
    openPath,
    registerOpenPathHandler,
    getPanel: (id) => panels.get(id),
    getEditorView: (id) => editorViews.get(id),
    getActivityItem: (id) => activityItems.get(id),
    getPanels: () => Array.from(panels.values()),
    getEditorViews: () => Array.from(editorViews.values()),
    getActivityItems: () => Array.from(activityItems.values()),
    getStatusItems: () => Array.from(statusItems.values()),
    getCommands: () => Array.from(commands.values()),
    subscribe,
  }
}
