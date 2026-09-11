import { createElement, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { IconRef, IconSpec, PluginDefinition, SettingDefinition, WorkbenchService } from './contract.ts'
import { canOpenPluginSettings, getGeneralSettings, getPluginSettings, hasPluginVisibilitySwitch, openPluginEntry, pluginEntryItem, pluginIcon, pluginsForTab, settingsPageClassName, settingsTabClassName, stopPluginSwitchKeydown, type SettingsTab } from './internal/settings-window.ts'
import { getDockLocale, resolveSettingText, settingsLabels, type DockLocale, type SettingsLabels } from './internal/localization.ts'
import { focusTrapTarget } from './ui-helpers.ts'

interface SettingsWindowProps {
  service: WorkbenchService
  open: boolean
  onClose: () => void
  restoreFocusRef?: { current: HTMLElement | null }
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** A definition after its locale-aware text has been resolved to plain strings. */
type ResolvedSetting = Omit<SettingDefinition<unknown>, 'title' | 'description'> & { title: string; description?: string }

/** Standalone settings dialog, rendered beside (not inside) the auto-hide root. */
export function SettingsWindow(props: SettingsWindowProps): ReactNode {
  const { service, open, onClose, restoreFocusRef } = props
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  const [detailPluginId, setDetailPluginId] = useState<string | null>(null)
  const [tab, setTab] = useState<'entry' | 'other'>('entry')
  const settingsSnapshot = useSettingsSnapshot(service)
  const plugins = usePluginsSnapshot(service)
  const locale = useLocaleSnapshot()
  const labels = useMemo(() => settingsLabels(locale), [locale])
  const localize = useCallback((definition: SettingDefinition<unknown>): ResolvedSetting => {
    const title = resolveSettingText(definition.title, locale)
    const description = resolveSettingText(definition.description, locale)
    return { ...definition, title: title ?? definition.id, description }
  }, [locale])

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) restoreFocusRef?.current?.focus()
      wasOpenRef.current = false
      return
    }
    wasOpenRef.current = true
    closeButtonRef.current?.focus()
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target
      if (target instanceof Node && !dialogRef.current?.contains(target)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (detailPluginId !== null) setDetailPluginId(null)
        else onClose()
        return
      }
      if (event.key !== 'Tab' || dialogRef.current === null) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
      if (focusable.length === 0) return
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement)
      const nextIndex = focusTrapTarget(event.key, event.shiftKey, activeIndex, focusable.length)
      if (nextIndex !== null) { event.preventDefault(); if (nextIndex >= 0) focusable[nextIndex]?.focus() }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKeyDown) }
  }, [open, onClose, restoreFocusRef, detailPluginId])

  if (!open) return null
  const selected = detailPluginId === null ? undefined : plugins.find((plugin) => plugin.id === detailPluginId)
  const selectedSettings = selected === undefined ? [] : getPluginSettings(service, selected.id)

  return createElement('div', { className: 'dsh-wb-settings-overlay' },
    createElement('div', {
      ref: dialogRef, className: `dsh-wb-settings${selected !== undefined ? ' dsh-wb-settings-detail' : ''}`,
      role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dsh-wb-settings-title',
    },
    createElement('div', { className: 'dsh-wb-settings-head' },
      selected !== undefined
        ? createElement('button', { type: 'button', className: 'dsh-wb-settings-back', onClick: () => setDetailPluginId(null), 'aria-label': labels.back }, '‹')
        : null,
      createElement('h2', { id: 'dsh-wb-settings-title' }, selected?.title ?? labels.settings),
      createElement('button', { ref: closeButtonRef, type: 'button', className: 'dsh-wb-settings-close', 'aria-label': labels.close, title: labels.close, onClick: onClose }, '×'),
    ),
    selected !== undefined
      ? createElement('div', { className: settingsPageClassName(true) },
        selectedSettings.length === 0 ? createElement('div', { className: 'dsh-wb-settings-empty' }, labels.empty) : selectedSettings.map((definition) => createSettingRow(service, localize(definition), locale)),
      )
      : createElement('div', { className: settingsPageClassName(false) },
        createElement('div', { className: 'dsh-wb-settings-general' },
          createElement('h3', null, labels.general),
          getGeneralSettings(settingsSnapshot).map((definition) => createSettingRow(service, localize(definition), locale)),
        ),
        createElement('section', { className: 'dsh-wb-settings-plugins' },
          createElement('h3', null, labels.plugins),
          createElement('div', { className: 'dsh-wb-settings-tabs', role: 'tablist' },
            createTab('entry', labels.entry, tab, setTab), createTab('other', labels.other, tab, setTab),
          ),
          createElement('div', { className: 'dsh-wb-plugin-list' },
            pluginsForTab(plugins, tab).map((plugin) => createPluginCard(service, plugin, labels, () => {
              if (canOpenPluginSettings(getPluginSettings(service, plugin.id))) setDetailPluginId(plugin.id)
            }, () => { if (openPluginEntry(service, plugin.id)) onClose() })),
          ),
        ),
      ),
    ),
  )
}

function createTab(id: SettingsTab, label: string, active: SettingsTab, onSelect: (id: SettingsTab) => void): ReactNode {
  return createElement('button', { type: 'button', role: 'tab', 'aria-selected': active === id, className: settingsTabClassName(id, active), onClick: () => onSelect(id) }, label)
}

function createPluginCard(
  service: WorkbenchService,
  plugin: PluginDefinition,
  labels: SettingsLabels,
  onOpenSettings: () => void,
  onOpenEntry: () => void,
): ReactNode {
  const definitions = getPluginSettings(service, plugin.id)
  const canOpen = canOpenPluginSettings(definitions)
  const hidden = service.getHiddenPluginIds().includes(plugin.id)
  const entry = pluginEntryItem(service, plugin.id)
  return createElement('div', {
    key: plugin.id,
    className: `dsh-wb-plugin-card${canOpen ? ' is-clickable' : ''}`,
    role: canOpen ? 'button' : undefined,
    tabIndex: canOpen ? 0 : undefined,
    onClick: canOpen ? onOpenSettings : undefined,
    onKeyDown: canOpen ? (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenSettings() } } : undefined,
  },
    createElement('span', { className: 'dsh-wb-plugin-icon' }, renderIcon(pluginIcon(plugin.icon))),
    createElement('span', { className: 'dsh-wb-plugin-copy' },
      createElement('span', { className: 'dsh-wb-plugin-title' }, plugin.title),
      plugin.description ? createElement('small', null, plugin.description) : null,
    ),
    createElement('span', { className: 'dsh-wb-plugin-actions' },
      entry !== undefined
        ? createElement('button', {
          type: 'button', className: 'dsh-wb-plugin-open',
          title: `${labels.openPlugin} ${plugin.title}`, 'aria-label': `${labels.openPlugin} ${plugin.title}`,
          onClick: (event: MouseEvent) => { event.stopPropagation(); onOpenEntry() },
          onKeyDown: stopPluginSwitchKeydown,
        }, labels.openPlugin)
        : null,
      hasPluginVisibilitySwitch(plugin)
        ? createElement('button', {
          type: 'button', role: 'switch', 'aria-checked': !hidden,
          className: `dsh-wb-plugin-switch${hidden ? '' : ' on'}`,
          onClick: (event: MouseEvent) => { event.stopPropagation(); service.setPluginHidden(plugin.id, !hidden) },
          onKeyDown: stopPluginSwitchKeydown,
          'aria-label': `${labels.showPlugin} ${plugin.title}`,
        }, createElement('span'))
        : null,
      // Always rendered so the trailing controls line up across cards.
      createElement('span', { className: 'dsh-wb-plugin-chevron', 'aria-hidden': true }, canOpen ? '›' : '\u00a0'),
    ),
  )
}

function renderIcon(icon: IconRef, size = 22): ReactNode {
  if (icon === null || icon === undefined) return null
  if (typeof icon === 'object' && 'path' in icon) {
    const spec = icon as IconSpec
    return createElement('svg', { width: spec.size ?? size, height: spec.size ?? size, viewBox: spec.viewBox ?? '0 0 24 24', fill: spec.stroke ? 'none' : 'currentColor', stroke: spec.stroke ? 'currentColor' : undefined, strokeWidth: spec.stroke ? 2 : undefined, strokeLinecap: spec.stroke ? 'round' : undefined, strokeLinejoin: spec.stroke ? 'round' : undefined, 'aria-hidden': true }, createElement('path', { d: spec.path }))
  }
  return icon as ReactNode
}

function createSettingRow(service: WorkbenchService, definition: ResolvedSetting, locale: DockLocale): ReactNode {
  const Component = definition.component
  return createElement('section', { key: definition.id, className: 'dsh-wb-setting-row' },
    createElement('div', { className: 'dsh-wb-setting-copy' }, createElement('div', { className: 'dsh-wb-setting-title' }, definition.title), definition.description !== undefined ? createElement('div', { className: 'dsh-wb-setting-description' }, definition.description) : null),
    createElement('div', { className: 'dsh-wb-setting-control' }, createElement(Component, { value: service.getSetting(definition.id), onChange: (next: unknown) => service.setSetting(definition.id, next), locale })),
  )
}

function usePluginsSnapshot(service: WorkbenchService): readonly PluginDefinition[] {
  const ref = useRef<{ service: WorkbenchService; version: number; value: readonly PluginDefinition[] }>()
  const version = useRef(0)
  const subscribe = useCallback((listener: () => void) => service.onDidChangePlugins(() => { version.current += 1; ref.current = undefined; listener() }), [service])
  const get = useCallback(() => { if (ref.current?.service !== service) { version.current = 0; ref.current = undefined }; if (!ref.current) ref.current = { service, version: version.current, value: service.getPlugins() }; return ref.current.value }, [service])
  return useSyncExternalStore(subscribe, get, get)
}

function useLocaleSnapshot(): 'zh' | 'en' {
  const subscribe = useCallback((listener: () => void) => {
    if (typeof window === 'undefined') return () => {}
    window.addEventListener('languagechange', listener)
    const root = typeof document !== 'undefined' ? document.documentElement : null
    const observer = root !== null && typeof MutationObserver !== 'undefined' ? new MutationObserver(listener) : null
    observer?.observe(root!, { attributes: true, attributeFilter: ['lang'] })
    return () => { window.removeEventListener('languagechange', listener); observer?.disconnect() }
  }, [])
  const get = useCallback(() => {
    const documentLanguage = typeof document !== 'undefined' ? document.documentElement.lang : ''
    const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : ''
    return getDockLocale(documentLanguage || browserLanguage)
  }, [])
  return useSyncExternalStore(subscribe, get, get)
}

function useSettingsSnapshot(service: WorkbenchService): readonly SettingDefinition<unknown>[] {
  const ref = useRef<{ service: WorkbenchService; value: readonly SettingDefinition<unknown>[] }>()
  const subscribe = useCallback((listener: () => void) => service.onDidChangeSetting(() => { ref.current = undefined; listener() }), [service])
  const get = useCallback(() => { if (ref.current?.service !== service) ref.current = undefined; if (!ref.current) ref.current = { service, value: service.getSettings() }; return ref.current.value }, [service])
  return useSyncExternalStore(subscribe, get, get)
}
