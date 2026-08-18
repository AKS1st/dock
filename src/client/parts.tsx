/**
 * Workbench shell components (Phase 1): activity bar / side bar / editor
 * area (tab strip) / bottom panel / status bar, rendered into a fixed
 * right-docked root. Written with React.createElement (no JSX) so the
 * client bundle needs no jsx-runtime handling.
 *
 * Rendering model: the shell reads registries and layout through
 * useSyncExternalStore (both are synchronous snapshots), so any
 * register/unregister or layout patch re-renders the affected parts.
 */
import { createElement, Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type {
  ActivityBarItemDefinition,
  DockPosition,
  IconRef,
  IconSpec,
  ViewDefinition,
  ViewProps,
  WorkbenchContext,
  WorkbenchService,
} from './contract.ts'
import type { LayoutStore } from './layout.ts'
import { reorderActivity } from './layout.ts'
import { ContextMenu, type ContextMenuItem, type ContextMenuState } from './context-menu'

/** Sort helper shared by item lists. */
function byOrder<T extends { order?: number }>(a: T, b: T): number {
  return (a.order ?? 100) - (b.order ?? 100)
}

/**
 * Render an IconRef: React nodes (emoji, custom components) render as-is;
 * IconSpec values render as an inline SVG `<path>` tinted with currentColor
 * so icons follow the active theme.
 */
function renderIcon(icon: IconRef, size = 16): ReactNode {
  if (icon === null || icon === undefined) return null
  if (typeof icon === 'object' && 'path' in icon) {
    const spec = icon as IconSpec
    return createElement(
      'svg',
      {
        width: spec.size ?? size,
        height: spec.size ?? size,
        viewBox: spec.viewBox ?? '0 0 24 24',
        fill: spec.stroke ? 'none' : 'currentColor',
        stroke: spec.stroke ? 'currentColor' : undefined,
        strokeWidth: spec.stroke ? 2 : undefined,
        strokeLinecap: spec.stroke ? 'round' : undefined,
        strokeLinejoin: spec.stroke ? 'round' : undefined,
        'aria-hidden': true,
      },
      createElement('path', { d: spec.path }),
    )
  }
  return icon as ReactNode
}

/**
 * Resolve a view component: a plain function component renders directly; a
 * zero-arg factory returning a Promise is wrapped in React.lazy (the
 * factory contract — components receive props, factories take none).
 */
function resolveViewComponent(def: ViewDefinition): ComponentType<ViewProps> {
  const component = def.component
  if (component.length === 0) {
    // Zero-arg → lazy factory returning a Promise of the component.
    const factory = component as unknown as () => Promise<ComponentType<ViewProps>>
    return lazy(() => factory().then((resolved) => ({ default: resolved })))
  }
  return component as ComponentType<ViewProps>
}

function titleOf(def: ViewDefinition): string {
  return typeof def.title === 'function' ? def.title() : def.title
}

function renderView(
  ctx: WorkbenchContext,
  def: ViewDefinition,
  viewId: string,
  sessionId: string | undefined,
  active: boolean,
): ReactNode {
  const Component = resolveViewComponent(def)
  const props: ViewProps = { ctx, viewId, sessionId, active }
  return createElement(
    Suspense,
    { fallback: createElement('div', { className: 'dsh-wb-editor-empty' }, 'Loading…') },
    createElement(Component, props),
  )
}

interface RootProps {
  ctx: WorkbenchContext
  service: WorkbenchService
  store: LayoutStore
}

/** Module-level registry version: bumped on every registry change. */
let registryVersion = 0

/** Docked size in px per edge (expanded workbench). */
const DOCK_SIZE: Record<DockPosition, number> = { left: 720, right: 720, top: 480, bottom: 480 }
/** Docked size in px per edge (collapsed to the activity strip). */
const STRIP_SIZE: Record<DockPosition, number> = { left: 48, right: 48, top: 44, bottom: 44 }
const DOCK_LABEL: Record<DockPosition, string> = { left: '左侧', right: '右侧', top: '顶部', bottom: '底部' }

/** The whole workbench shell. */
export function WorkbenchRoot(props: RootProps): ReactNode {
  const { ctx, service, store } = props
  const layout = useSyncExternalStore(store.subscribe, store.getLayout)
  const registry = useSyncExternalStore(
    (onChange) => service.subscribe(() => { registryVersion += 1; onChange() }),
    () => registryVersion,
  )
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const autoHide = layout.autoHide === 'edge'
  const [autoHidden, setAutoHidden] = useState(false)
  const hideTimer = useRef<number | null>(null)
  useEffect(() => () => { if (hideTimer.current !== null) window.clearTimeout(hideTimer.current) }, [])

  const activityItems = useMemo(() => {
    // User drag order (activityOrder) wins; items not listed keep their
    // registered `order` and are appended in declaration order.
    const all = [...service.getActivityItems()].sort(byOrder)
    const byId = new Map(all.map((item) => [item.id, item]))
    const userOrdered = layout.activityOrder.map((id) => byId.get(id)).filter((item): item is ActivityBarItemDefinition => item !== undefined)
    const rest = all.filter((item) => !layout.activityOrder.includes(item.id))
    return [...userOrdered, ...rest]
  }, [registry, service, layout.activityOrder])
  const panels = useMemo(() => [...service.getPanels()].sort(byOrder), [registry, service])
  const editorViews = useMemo(() => [...service.getEditorViews()].sort(byOrder), [registry, service])
  const statusItems = useMemo(() => [...service.getStatusItems()].sort(byOrder), [registry, service])

  const sessionId = useSessionId(ctx)
  const collapsed = layout.activity === null
  const dockMode = layout.deskMode === 'dock'

  // Layout push + dock edge: the shell sets --desk-size (the DSH app shell
  // yields it via #root margin) and mirrors the edge onto <body> so the
  // injected styles can target the right margin property. Dock mode never
  // pushes — the floating bar overlays the page like the macOS Dock. An
  // auto-hidden shell also yields nothing.
  useEffect(() => {
    const size = (dockMode || autoHidden) ? 0 : (collapsed ? STRIP_SIZE[layout.dock] : DOCK_SIZE[layout.dock])
    document.documentElement.style.setProperty('--desk-size', `${size}px`)
    document.body.setAttribute('data-desk-dock', layout.dock)
    return () => {
      document.documentElement.style.removeProperty('--desk-size')
      document.body.removeAttribute('data-desk-dock')
    }
  }, [collapsed, layout.dock, dockMode, autoHidden])

  const activeActivity = layout.activity === null ? undefined : service.getActivityItem(layout.activity)
  const activePane = activeActivity === undefined || !layout.sideBarOpen
    ? undefined
    : panels.find((panel) => panel.id === activeActivity.paneId && panel.region === 'sideBar')
  const panelView = layout.panelViewId === null ? undefined : service.getPanel(layout.panelViewId)

  const openDockMenu = (x: number, y: number): void => {
    const items: ContextMenuItem[] = [
      ...(['left', 'right', 'top', 'bottom'] as DockPosition[]).map((dock) => ({
        label: `停靠到${DOCK_LABEL[dock]}`,
        checked: layout.dock === dock,
        onClick: () => store.update({ dock }),
      })),
      { label: 'Dock 模式（macOS 风格）', kind: 'checkbox' as const, checked: dockMode, onClick: () => store.update({ deskMode: dockMode ? 'panel' : 'dock' }) },
      { label: '自动隐藏（鼠标远离收起）', kind: 'checkbox' as const, checked: autoHide, onClick: () => store.update({ autoHide: autoHide ? 'off' : 'edge' }) },
    ]
    setMenu({ x, y, items })
  }

  // Auto-hide state machine: hovering the workbench keeps it visible; after
  // the mouse leaves for 400ms it slides away; the edge hotspot revives it.
  const reveal = (): void => {
    if (hideTimer.current !== null) { window.clearTimeout(hideTimer.current); hideTimer.current = null }
    setAutoHidden(false)
  }
  const scheduleHide = (): void => {
    if (!autoHide) return
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setAutoHidden(true), 400)
  }

  const rootClass = [
    'dsh-wb-root',
    collapsed ? 'wb-collapsed' : undefined,
    autoHidden ? 'wb-autohidden' : undefined,
  ].filter(Boolean).join(' ')

  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      {
        className: rootClass,
        'data-desk-shell': '',
        'data-dock': layout.dock,
        'data-mode': dockMode ? 'dock' : 'panel',
        onMouseEnter: reveal,
        onMouseLeave: scheduleHide,
      },
    createElement(ActivityBar, {
      items: activityItems,
      activeId: layout.activity,
      dockMode,
      onActivate: (id) => {
        // Clicking the active item again collapses the side bar (VSCode toggle).
        store.update(layout.activity === id ? { activity: null } : { activity: id, sideBarOpen: true })
      },
      onContextMenu: (x, y) => openDockMenu(x, y),
      onReorder: (draggedId, targetId) => {
        // Reorder by the current visible order and persist the full user
        // order into activityOrder (newly registered items append later).
        const next = reorderActivity(activityItems.map((item) => item.id), draggedId, targetId)
        store.update({ activityOrder: next })
      },
    }),
    createElement('div', { className: 'dsh-wb-body' },
      activePane !== undefined && !collapsed
        ? createElement('div', { className: 'dsh-wb-sidebar' },
          createElement('div', { className: 'dsh-wb-sidebar-header' }, titleOf(activePane)),
          renderView(ctx, activePane, activePane.id, sessionId, layout.activity === activeActivity?.id),
        )
        : null,
      createElement('div', { className: 'dsh-wb-main' },
        createElement(EditorArea, {
          ctx,
          service,
          store,
          tabs: layout.editorTabs,
          activeTab: layout.activeEditorTab,
          views: editorViews,
          sessionId,
        }),
        layout.panelOpen && panelView !== undefined
          ? createElement('div', { className: 'dsh-wb-panel' },
            renderView(ctx, panelView, panelView.id, sessionId, layout.panelOpen),
          )
          : null,
        createElement(StatusBar, { items: statusItems, ctx }),
      ),
    ),
    createElement(ContextMenu, { menu, onClose: () => setMenu(null) }),
    ),
    // Edge hotspot: a 4px strip on the docked edge (outside the shell, which
    // may be slid off-screen) that revives the workbench on hover.
    autoHide
      ? createElement('div', {
        className: 'dsh-wb-autohide-hotspot',
        'data-dock': layout.dock,
        onMouseEnter: reveal,
      })
      : null,
  )
}

function ActivityBar(props: {
  items: ActivityBarItemDefinition[]
  activeId: string | null
  dockMode: boolean
  onActivate: (id: string) => void
  onContextMenu: (x: number, y: number) => void
  onReorder: (draggedId: string, targetId: string) => void
}): ReactNode {
  const { items, activeId, dockMode, onActivate, onContextMenu, onReorder } = props
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  return createElement('div', {
    className: 'dsh-wb-activity',
    // Right-click anywhere on the activity bar (icons or blank space)
    // opens the dock position menu.
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault()
      onContextMenu(event.clientX, event.clientY)
    },
  },
  items.map((item, index) => createElement('button', {
    key: item.id,
    className: [
      activeId === item.id ? 'active' : undefined,
      draggingId === item.id ? 'dragging' : undefined,
      overId === item.id ? 'drag-over' : undefined,
      // Fisheye magnification in dock mode: hovered item grows, neighbours nudge.
      dockMode && hoverIndex === index ? 'dock-hover' : undefined,
      dockMode && hoverIndex !== null && Math.abs(hoverIndex - index) === 1 ? 'dock-near' : undefined,
    ].filter(Boolean).join(' ') || undefined,
    title: item.title,
    draggable: true,
    onClick: () => onActivate(item.id),
    onMouseEnter: () => { if (dockMode) setHoverIndex(index) },
    onMouseLeave: () => { if (dockMode) setHoverIndex(null) },
    onDragStart: (event: DragEvent) => {
      setDraggingId(item.id)
      event.dataTransfer?.setData('text/plain', item.id)
      event.dataTransfer!.effectAllowed = 'move'
    },
    onDragEnd: () => { setDraggingId(null); setOverId(null) },
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      if (draggingId !== null && draggingId !== item.id) setOverId(item.id)
    },
    onDragLeave: () => { if (overId === item.id) setOverId(null) },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      const dragged = draggingId ?? event.dataTransfer?.getData('text/plain')
      if (dragged !== undefined && dragged !== item.id) onReorder(dragged, item.id)
      setDraggingId(null)
      setOverId(null)
    },
  }, renderIcon(item.icon, 18))),
  )
}

function EditorArea(props: {
  ctx: WorkbenchContext
  service: WorkbenchService
  store: LayoutStore
  tabs: string[]
  activeTab: string | null
  views: ViewDefinition[]
  sessionId: string | undefined
}): ReactNode {
  const { ctx, service, store, tabs, activeTab, views, sessionId } = props
  const viewById = useMemo(() => new Map(views.map((view) => [view.id, view])), [views])
  const activeView = activeTab === null ? undefined : viewById.get(activeTab)
  return createElement('div', { className: 'dsh-wb-editor' },
    tabs.length > 0
      ? createElement('div', { className: 'dsh-wb-tabs' },
        tabs.map((tabId) => {
          const view = viewById.get(tabId)
          if (view === undefined) return null
          return createElement('div', {
            key: tabId,
            className: `dsh-wb-tab${activeTab === tabId ? ' active' : ''}`,
            onClick: () => service.openEditorView(tabId),
          },
          view.icon !== undefined ? renderIcon(view.icon, 14) : null,
          titleOf(view),
          createElement('button', {
            className: 'dsh-wb-tab-close',
            title: 'Close',
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              service.closeEditorView(tabId)
            },
          }, '×'),
          )
        }),
      )
      : null,
    activeView !== undefined
      ? renderView(ctx, activeView, activeView.id, sessionId, true)
      : createElement('div', { className: 'dsh-wb-editor-empty' }, 'Open a view from the activity bar or a plugin command.'),
  )
}

function StatusBar(props: { items: ReturnType<WorkbenchService['getStatusItems']>; ctx: WorkbenchContext }): ReactNode {
  const { items, ctx } = props
  return createElement('div', { className: 'dsh-wb-statusbar' },
    items.map((item) => createElement('span', { key: item.id }, createElement(item.component, { ctx }))),
  )
}

/**
 * Best-effort active session id: read the sessions service if the runtime
 * provides it (mirrors the sidebar plugin's `sessions.list.getSnapshot()
 * .current`). Phase 1 reads once per mount; live session switching lands in
 * Phase 2. Returns undefined when the service is absent.
 */
function useSessionId(ctx: WorkbenchContext): string | undefined {
  const [sessionId] = useState<string | undefined>(() => {
    const sessions = ctx.get<{ list?: { getSnapshot(): { current?: string } } }>('sessions')
    return sessions?.list?.getSnapshot().current
  })
  return sessionId
}
