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
  CloseRequest,
  CommandDefinition,
  EditorOpenSeed,
  OpenPathOptions,
  StatusBarItemDefinition,
  ViewDefinition,
  WorkbenchLayout,
  WorkbenchService,
} from './contract.ts'
import type { LayoutStore } from './layout.ts'

/**
 * Merge a seed patch onto an existing seed. `patch.meta` is shallow-merged
 * into the current meta when both are plain objects (an editor writes its
 * dirty flag as `{ meta: { dirty: true } }` without knowing the rest of the
 * meta); every other patch field replaces its seed counterpart wholesale.
 */
function mergeSeed(seed: EditorOpenSeed | undefined, patch: Partial<EditorOpenSeed>): EditorOpenSeed {
  const base = seed ?? {}
  const meta = patch.meta === undefined
    ? base.meta
    : (typeof patch.meta === 'object' && patch.meta !== null
        && typeof base.meta === 'object' && base.meta !== null
      ? { ...(base.meta as Record<string, unknown>), ...(patch.meta as Record<string, unknown>) }
      : patch.meta)
  return { ...base, ...patch, meta }
}

export function createWorkbenchService(store: LayoutStore): WorkbenchService {
  const activityItems = new Map<string, ActivityBarItemDefinition>()
  const panels = new Map<string, ViewDefinition & { region: 'sideBar' }>()
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
    if (activityItems.has(def.id)) throw new Error(`[dock] activity item "${def.id}" already registered`)
    activityItems.set(def.id, def)
    notify()
    return () => { if (activityItems.get(def.id) === def) { activityItems.delete(def.id); notify() } }
  }

  const registerPanel = (def: ViewDefinition & { region: 'sideBar' }): (() => void) => {
    if (panels.has(def.id)) throw new Error(`[dock] panel "${def.id}" already registered`)
    panels.set(def.id, def)
    notify()
    return () => { if (panels.get(def.id) === def) { panels.delete(def.id); notify() } }
  }

  const registerEditorView = (def: ViewDefinition): (() => void) => {
    if (editorViews.has(def.id)) throw new Error(`[dock] editor view "${def.id}" already registered`)
    editorViews.set(def.id, def)
    notify()
    return () => { if (editorViews.get(def.id) === def) { editorViews.delete(def.id); notify() } }
  }

  const registerStatusBarItem = (def: StatusBarItemDefinition): (() => void) => {
    if (statusItems.has(def.id)) throw new Error(`[dock] status item "${def.id}" already registered`)
    statusItems.set(def.id, def)
    notify()
    return () => { if (statusItems.get(def.id) === def) { statusItems.delete(def.id); notify() } }
  }

  const registerCommand = (def: CommandDefinition): (() => void) => {
    if (commands.has(def.id)) throw new Error(`[dock] command "${def.id}" already registered`)
    commands.set(def.id, def)
    notify()
    return () => { if (commands.get(def.id) === def) { commands.delete(def.id); notify() } }
  }

  const executeCommand = async (id: string, ...args: unknown[]): Promise<unknown> => {
    const command = commands.get(id)
    if (command === undefined) {
      console.warn(`[dock] unknown command "${id}"`)
      return undefined
    }
    return command.run(...args)
  }

  // ── View instances: one open view = one instance id, hosted either in the
  //    editor-area tabs or in a floating window. ──
  let uidCounter = 0
  const uid = (): string => `vi:${++uidCounter}`

  /** Outcome of a view's `beforeClose` gate: synchronously allowed or
   *  cancelled, or pending while an async hook runs (the caller decides what
   *  happens on resolution). */
  type BeforeCloseResult =
    | { kind: 'allowed' }
    | { kind: 'cancelled' }
    | { kind: 'pending'; then(onAllow: () => void): void }

  /**
   * Evaluate the instance's view-defined `beforeClose` gate. No hook → the
   * gate is trivially allowed; a synchronous `false` cancels; a synchronous
   * `true`/`undefined` allows; a promise defers the decision to its
   * resolution (any non-`false` value allows). Shared by `closeViewInstance`
   * and `openView` so replacing an instance's content (switching files) is
   * gated exactly like closing it — a dirty editor must confirm before its
   * content is discarded.
   */
  const evaluateBeforeClose = (entry: CloseRequest): BeforeCloseResult => {
    const beforeClose = editorViews.get(entry.viewId)?.beforeClose
    if (beforeClose === undefined) return { kind: 'allowed' }
    const verdict = beforeClose(entry)
    if (typeof verdict === 'object' && verdict !== null && typeof (verdict as Promise<boolean>).then === 'function') {
      return {
        kind: 'pending',
        then(onAllow) {
          void (verdict as Promise<boolean>).then((allow) => { if (allow !== false) onAllow() })
        },
      }
    }
    return verdict === false ? { kind: 'cancelled' } : { kind: 'allowed' }
  }

  const openView = (viewId: string, seed?: EditorOpenSeed, options?: { floating?: boolean }): string => {
    const current = store.getLayout()
    if (options?.floating === true) {
      // One floating instance per view (Phase F1; multi-instance lands later).
      const existingEntry = Object.entries(current.floatingWindows).find(([, win]) => win.viewId === viewId)
      if (existingEntry !== undefined) {
        const [instanceId, win] = existingEntry
        if (seed !== undefined) {
          // Reusing the window replaces the old content: switching files is
          // like closing the old one, so a dirty instance must confirm first
          // (the view's beforeClose gate). A cancelled gate keeps the old
          // seed — no silent discard — and the open resolves to the existing
          // window either way.
          const gate = evaluateBeforeClose(win)
          if (gate.kind === 'cancelled') return instanceId
          if (gate.kind === 'pending') {
            gate.then(() => replaceFloatingSeed(instanceId, seed))
            return instanceId
          }
          replaceFloatingSeed(instanceId, seed)
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
        // Same gate as the floating reuse: replacing the tab's seed discards
        // the old content, so a dirty instance must confirm first. A
        // cancelled gate aborts the open without touching the tab.
        const gate = evaluateBeforeClose(existing)
        if (gate.kind === 'cancelled') return existing.instanceId
        if (gate.kind === 'pending') {
          gate.then(() => replaceTabSeed(existing.instanceId, seed))
          return existing.instanceId
        }
        replaceTabSeed(existing.instanceId, seed)
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

  /** Replace a floating window's seed. Re-reads the layout so a deferred
   *  (async gate) application is safe; unknown ids are a no-op. */
  const replaceFloatingSeed = (instanceId: string, seed: EditorOpenSeed): void => {
    const current = store.getLayout()
    const win = current.floatingWindows[instanceId]
    if (win === undefined) return
    store.update({ floatingWindows: { ...current.floatingWindows, [instanceId]: { ...win, seed } } })
  }

  /** Replace an editor tab's seed and activate it. Re-reads the layout so a
   *  deferred (async gate) application is safe; unknown ids are a no-op. */
  const replaceTabSeed = (instanceId: string, seed: EditorOpenSeed): void => {
    const current = store.getLayout()
    const tabs = current.editorTabs.map((tab) => tab.instanceId === instanceId ? { ...tab, seed } : tab)
    if (tabs.every((tab, index) => tab === current.editorTabs[index])) return
    store.update({ editorTabs: tabs, activeEditorTab: instanceId })
  }

  /**
   * Close one view instance (tab or floating window). Before touching the
   * layout the instance's view definition is consulted: a registered
   * `beforeClose` hook receives `{ viewId, instanceId, seed }` and may
   * cancel the close by returning `false` (or a promise resolving to
   * `false`). The call is fire-and-forget — with an async hook the layout
   * stays open until the verdict resolves, then the close is performed on
   * approval. Unknown instance ids are a no-op.
   */
  const closeViewInstance = (instanceId: string): void => {
    const current = store.getLayout()
    // Resolve the instance (tab or floating window) and its view definition.
    const tab = current.editorTabs.find((entry) => entry.instanceId === instanceId)
    const win = current.floatingWindows[instanceId]
    const entry = tab ?? win
    if (entry === undefined) return
    const gate = evaluateBeforeClose(entry)
    if (gate.kind === 'cancelled') return
    if (gate.kind === 'pending') { gate.then(() => performClose(instanceId)); return }
    performClose(instanceId)
  }

  const performClose = (instanceId: string): void => {
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

  /**
   * Patch one open instance's seed in place (editor tab or floating window;
   * unknown ids are a no-op). `patch.meta` is shallow-merged into the
   * instance's current meta when both are plain objects; other patch fields
   * replace their seed counterparts wholesale. Persisted with the layout, so
   * instance-level state (e.g. an editor's dirty flag) survives reloads.
   */
  const updateViewSeed = (instanceId: string, patch: Partial<EditorOpenSeed>): void => {
    const current = store.getLayout()
    const tab = current.editorTabs.find((entry) => entry.instanceId === instanceId)
    if (tab !== undefined) {
      store.update({
        editorTabs: current.editorTabs.map((entry) => (
          entry.instanceId === instanceId ? { ...entry, seed: mergeSeed(entry.seed, patch) } : entry
        )),
      })
      return
    }
    const win = current.floatingWindows[instanceId]
    if (win !== undefined) {
      store.update({
        floatingWindows: { ...current.floatingWindows, [instanceId]: { ...win, seed: mergeSeed(win.seed, patch) } },
      })
    }
  }

  // Open-path routing: the file-domain host (dock-files) registers a handler
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
    updateViewSeed,
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
