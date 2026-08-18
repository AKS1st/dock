/**
 * Workbench layout state: a small synchronous store (getLayout/update/
 * subscribe) persisted to localStorage, mirroring the pattern the sidebar
 * plugin uses for its per-session state but scoped to the workbench shell.
 * Phase 1 models one editor area with an ordered tab list; recursive
 * splits arrive in Phase 2.
 */
import type { DockPosition, EditorOpenSeed, EditorTab, FloatingWindow, WorkbenchLayout } from './contract.ts'

export const DEFAULT_LAYOUT: WorkbenchLayout = {
  activity: null,
  sideBarOpen: true,
  editorTabs: [],
  activeEditorTab: null,
  panelOpen: false,
  panelViewId: null,
  dock: 'right',
  deskMode: 'panel',
  autoHide: 'off',
  activityOrder: [],
  absorbNative: false,
  floatingWindows: {},
}

const STORAGE_KEY = 'desk:layout'

export interface LayoutStore {
  getLayout(): WorkbenchLayout
  update(patch: Partial<WorkbenchLayout>): void
  subscribe(listener: () => void): () => void
}

/** Minimal storage face (injectable so tests run without a browser). */
export interface LayoutStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const DOCKS: readonly DockPosition[] = ['left', 'right', 'top', 'bottom']

/**
 * Reorder an id list by moving `draggedId` to `targetId`'s position
 * (insert-before-target semantics). Pure and side-effect free so the drag
 * ordering logic is unit-testable. Unknown ids are left untouched.
 */
export function reorderActivity(ids: readonly string[], draggedId: string, targetId: string): string[] {
  const from = ids.indexOf(draggedId)
  const to = ids.indexOf(targetId)
  if (from === -1 || to === -1) return [...ids]
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, draggedId)
  return next
}

function loadPersisted(storage: LayoutStorage): WorkbenchLayout | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as Partial<WorkbenchLayout>
    return {
      ...DEFAULT_LAYOUT,
      ...(typeof parsed.activity === 'string' || parsed.activity === null ? { activity: parsed.activity } : {}),
      ...(typeof parsed.sideBarOpen === 'boolean' ? { sideBarOpen: parsed.sideBarOpen } : {}),
      ...(Array.isArray(parsed.editorTabs)
        ? (() => {
          const tabs = migrateEditorTabs(parsed.editorTabs, (parsed as Record<string, unknown>).editorSeeds as Record<string, EditorOpenSeed | undefined> | undefined)
          let active = typeof parsed.activeEditorTab === 'string' ? parsed.activeEditorTab : null
          // Legacy activeEditorTab was a viewId; map it to the migrated instance.
          if (typeof active === 'string' && !active.startsWith('vi:')) {
            const match = tabs.find((tab) => tab.viewId === active)
            active = match?.instanceId ?? null
          }
          return { editorTabs: tabs, activeEditorTab: active }
        })()
        : {}),
      ...(typeof parsed.panelOpen === 'boolean' ? { panelOpen: parsed.panelOpen } : {}),
      ...(typeof parsed.panelViewId === 'string' || parsed.panelViewId === null ? { panelViewId: parsed.panelViewId } : {}),
      ...(typeof parsed.dock === 'string' && DOCKS.includes(parsed.dock as DockPosition) ? { dock: parsed.dock as DockPosition } : {}),
      ...(parsed.deskMode === 'dock' ? { deskMode: 'dock' as const } : {}),
      ...(parsed.autoHide === 'edge' ? { autoHide: 'edge' as const } : {}),
      ...(Array.isArray(parsed.activityOrder) ? { activityOrder: parsed.activityOrder.filter((v): v is string => typeof v === 'string') } : {}),
      ...(parsed.absorbNative === true ? { absorbNative: true as const } : {}),
      ...(parsed.floatingWindows !== undefined && parsed.floatingWindows !== null && typeof parsed.floatingWindows === 'object'
        ? { floatingWindows: migrateFloatingWindows(parsed.floatingWindows) } : {}),
    }
  } catch {
    return null
  }
}


/** Migrate persisted editorTabs to the instance model: legacy string[]
 * (view ids) with a separate editorSeeds map becomes EditorTab[] with
 * generated instance ids. */
function migrateEditorTabs(raw: unknown, seeds: Record<string, EditorOpenSeed | undefined> | undefined): EditorTab[] {
  if (!Array.isArray(raw)) return []
  if (raw.every((t): t is string => typeof t === 'string')) {
    return raw.map((viewId, index) => ({
      instanceId: `vi:legacy:${index + 1}`,
      viewId,
      seed: seeds?.[viewId],
    }))
  }
  return raw.filter((t): t is EditorTab => typeof t === 'object' && t !== null && typeof (t as EditorTab).viewId === 'string')
}


/** Migrate persisted floating windows to the instance model: legacy data was
 * keyed by viewId with no instanceId field — the new model keys by instanceId
 * and requires that field (close/move/resize all address windows by it).
 * Unknown or malformed entries are dropped. */
function migrateFloatingWindows(raw: unknown): Record<string, FloatingWindow> {
  const result: Record<string, FloatingWindow> = {}
  if (raw === null || typeof raw !== 'object') return result
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object') continue
    const win = value as Record<string, unknown>
    if (typeof win.viewId !== 'string') continue
    const instanceId = typeof win.instanceId === 'string' ? win.instanceId : win.viewId
    result[instanceId] = {
      instanceId,
      viewId: win.viewId,
      seed: win.seed as EditorOpenSeed | undefined,
      x: typeof win.x === 'number' ? win.x : 120,
      y: typeof win.y === 'number' ? win.y : 80,
      width: typeof win.width === 'number' ? win.width : 520,
      height: typeof win.height === 'number' ? win.height : 360,
    }
  }
  return result
}

export function createLayoutStore(storage?: LayoutStorage): LayoutStore {
  const backing: LayoutStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : memoryStorage())
  const loaded = loadPersisted(backing)
  if (loaded !== null) {
    // Persist the normalized (migrated) form so legacy data upgrades once.
    try { backing.setItem(STORAGE_KEY, JSON.stringify(loaded)) } catch { /* storage unavailable */ }
  }
  let layout: WorkbenchLayout = loaded ?? DEFAULT_LAYOUT
  const listeners = new Set<() => void>()

  return {
    getLayout: () => layout,
    update(patch) {
      layout = { ...layout, ...patch }
      try {
        backing.setItem(STORAGE_KEY, JSON.stringify(layout))
      } catch {
        // Storage full / unavailable: the layout still applies for this session.
      }
      for (const listener of [...listeners]) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

/** Non-browser fallback so the store never throws outside a page. */
function memoryStorage(): LayoutStorage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
  }
}
