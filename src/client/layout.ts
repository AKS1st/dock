/**
 * Workbench layout state: a small synchronous store (getLayout/update/
 * subscribe) persisted to localStorage, mirroring the pattern the sidebar
 * plugin uses for its per-session state but scoped to the workbench shell.
 * Phase 1 models one editor area with an ordered tab list; recursive
 * splits arrive in Phase 2.
 */
import type { DockPosition, WorkbenchLayout } from './contract.ts'

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
      ...(Array.isArray(parsed.editorTabs) ? { editorTabs: parsed.editorTabs.filter((t): t is string => typeof t === 'string') } : {}),
      ...(typeof parsed.activeEditorTab === 'string' || parsed.activeEditorTab === null ? { activeEditorTab: parsed.activeEditorTab } : {}),
      ...(typeof parsed.panelOpen === 'boolean' ? { panelOpen: parsed.panelOpen } : {}),
      ...(typeof parsed.panelViewId === 'string' || parsed.panelViewId === null ? { panelViewId: parsed.panelViewId } : {}),
      ...(typeof parsed.dock === 'string' && DOCKS.includes(parsed.dock as DockPosition) ? { dock: parsed.dock as DockPosition } : {}),
      ...(parsed.deskMode === 'dock' ? { deskMode: 'dock' as const } : {}),
      ...(parsed.autoHide === 'edge' ? { autoHide: 'edge' as const } : {}),
      ...(Array.isArray(parsed.activityOrder) ? { activityOrder: parsed.activityOrder.filter((v): v is string => typeof v === 'string') } : {}),
      ...(parsed.absorbNative === true ? { absorbNative: true as const } : {}),
    }
  } catch {
    return null
  }
}

export function createLayoutStore(storage?: LayoutStorage): LayoutStore {
  const backing: LayoutStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : memoryStorage())
  let layout: WorkbenchLayout = loadPersisted(backing) ?? DEFAULT_LAYOUT
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
