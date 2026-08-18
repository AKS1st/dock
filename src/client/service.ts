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

  // ── View instances: one open view = one instance id, hosted either in the
  //    editor-area tabs or in a floating window. ──
  let uidCounter = 0
  const uid = (): string => `vi:${++uidCounter}`

  const openView = (viewId: string, seed?: EditorOpenSeed, options?: { floating?: boolean }): string => {
    const current = store.getLayout()
    if (options?.floating === true) {
      // One floating instance per view (Phase F1; multi-instance lands later).
      const existingEntry = Object.entries(current.floatingWindows).find(([, win]) => win.viewId === viewId)
      if (existingEntry !== undefined) {
        const [instanceId, win] = existingEntry
        if (seed !== undefined) {
          store.update({ floatingWindows: { ...current.floatingWindows, [instanceId]: { ...win, seed } } })
        }
        return instanceId
      }
      const instanceId = uid()
      store.update({
        floatingWindows: {
          ...current.floatingWindows,
          [instanceId]: { instanceId, viewId, seed, x: 120, y: 80, width: 520, height: 360 },
        },
      })
      return instanceId
    }
    // Editor-area tab: focus an existing instance of the view, else open one.
    const existing = current.editorTabs.find((tab) => tab.viewId === viewId)
    if (existing !== undefined) {
      if (seed !== undefined) {
        store.update({
          activeEditorTab: existing.instanceId,
          editorTabs: current.editorTabs.map((tab) => tab.instanceId === existing.instanceId ? { ...tab, seed } : tab),
        })
      } else {
        store.update({ activeEditorTab: existing.instanceId })
      }
      return existing.instanceId
    }
    const instanceId = uid()
    store.update({
      editorTabs: [...current.editorTabs, { instanceId, viewId, seed }],
      activeEditorTab: instanceId,
    })
    return instanceId
  }

  const closeViewInstance = (instanceId: string): void => {
    const current = store.getLayout()
    const editorTabs = current.editorTabs.filter((tab) => tab.instanceId !== instanceId)
    let activeEditorTab = current.activeEditorTab
    if (activeEditorTab === instanceId) {
      activeEditorTab = editorTabs.length > 0 ? editorTabs[editorTabs.length - 1]!.instanceId : null
    }
    const floatingWindows = { ...current.floatingWindows }
    delete floatingWindows[instanceId]
    store.update({ editorTabs, activeEditorTab, floatingWindows })
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
    openView(options?.viewId ?? 'editor', { path, title: options?.title })
  }

  const moveFloatingWindow = (instanceId: string, x: number, y: number): void => {
    const current = store.getLayout()
    const win = current.floatingWindows[instanceId]
    if (win === undefined) return
    store.update({ floatingWindows: { ...current.floatingWindows, [instanceId]: { ...win, x, y } } })
  }
  const resizeFloatingWindow = (instanceId: string, width: number, height: number): void => {
    const current = store.getLayout()
    const win = current.floatingWindows[instanceId]
    if (win === undefined) return
    store.update({ floatingWindows: { ...current.floatingWindows, [instanceId]: { ...win, width, height } } })
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
    openView,
    closeViewInstance,
    moveFloatingWindow,
    resizeFloatingWindow,
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
