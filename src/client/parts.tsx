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
import { createElement, lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type {
  ActivityBarItemDefinition,
  ViewDefinition,
  ViewProps,
  WorkbenchContext,
  WorkbenchService,
} from './contract.ts'
import type { LayoutStore } from './layout.ts'

/** Sort helper shared by item lists. */
function byOrder<T extends { order?: number }>(a: T, b: T): number {
  return (a.order ?? 100) - (b.order ?? 100)
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

/** The whole workbench shell. */
export function WorkbenchRoot(props: RootProps): ReactNode {
  const { ctx, service, store } = props
  const layout = useSyncExternalStore(store.subscribe, store.getLayout)
  const registry = useSyncExternalStore(
    (onChange) => service.subscribe(() => { registryVersion += 1; onChange() }),
    () => registryVersion,
  )

  const activityItems = useMemo(() => [...service.getActivityItems()].sort(byOrder), [registry, service])
  const panels = useMemo(() => [...service.getPanels()].sort(byOrder), [registry, service])
  const editorViews = useMemo(() => [...service.getEditorViews()].sort(byOrder), [registry, service])
  const statusItems = useMemo(() => [...service.getStatusItems()].sort(byOrder), [registry, service])

  const sessionId = useSessionId(ctx)
  const collapsed = layout.activity === null

  // Layout push: the DSH app shell gives up the docked width.
  useEffect(() => {
    const width = collapsed ? '48px' : '720px'
    document.documentElement.style.setProperty('--desk-width', width)
    return () => {
      document.documentElement.style.removeProperty('--desk-width')
    }
  }, [collapsed])

  const activeActivity = layout.activity === null ? undefined : service.getActivityItem(layout.activity)
  const activePane = activeActivity === undefined || !layout.sideBarOpen
    ? undefined
    : panels.find((panel) => panel.id === activeActivity.paneId && panel.region === 'sideBar')
  const panelView = layout.panelViewId === null ? undefined : service.getPanel(layout.panelViewId)

  return createElement(
    'div',
    { className: `dsh-wb-root${collapsed ? ' wb-collapsed' : ''}`, 'data-desk-shell': '' },
    createElement(ActivityBar, {
      items: activityItems,
      activeId: layout.activity,
      onActivate: (id) => {
        // Clicking the active item again collapses the side bar (VSCode toggle).
        store.update(layout.activity === id ? { activity: null } : { activity: id, sideBarOpen: true })
      },
    }),
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
    ),
    createElement(StatusBar, { items: statusItems, ctx }),
  )
}

function ActivityBar(props: {
  items: ActivityBarItemDefinition[]
  activeId: string | null
  onActivate: (id: string) => void
}): ReactNode {
  const { items, activeId, onActivate } = props
  return createElement('div', { className: 'dsh-wb-activity' },
    items.map((item) => createElement('button', {
      key: item.id,
      className: activeId === item.id ? 'active' : undefined,
      title: item.title,
      onClick: () => onActivate(item.id),
    }, item.icon)),
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
          view.icon ?? null,
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
