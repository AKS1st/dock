/** Extensible, validated client settings persisted independently from layout. */
import { createElement, type ComponentType } from 'react'
import { autoHideLabel, getDockLocale, positionLabel, settingsLabels, type DockLocale } from './internal/localization.ts'

/** The deliberately small props surface supplied to a setting editor. */
export interface SettingComponentProps<T = unknown> {
  value: T
  onChange(value: T): void
  /** Active dock/DSH locale, so a feature editor can localize its own labels. */
  locale?: DockLocale
}

export type SettingComponent<T = unknown> = ComponentType<SettingComponentProps<T>>

/** Display text: a plain string, or a locale-aware factory evaluated per render. */
export type SettingText = string | ((locale: DockLocale) => string)

export interface SettingDefinition<T = unknown> {
  /** Owning plugin; omitted for legacy/unscoped settings. */
  pluginId?: string
  id: string
  title: SettingText
  description?: SettingText
  /** Sort order used by the settings window; lower values appear first. */
  order?: number
  defaultValue: T
  /** The editor receives only its value and a write callback, never ctx/service. */
  component: SettingComponent<T>
  /** Return true only for values accepted by the setting. */
  validate(value: unknown): value is T
}

export interface SettingsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface SettingsStore {
  register<T>(definition: SettingDefinition<T>): () => void
  get<T = unknown>(id: string): T | undefined
  getDefinitions(pluginId?: string): readonly SettingDefinition<unknown>[]
  set<T = unknown>(id: string, value: T): void
  subscribe(listener: () => void): () => void
}

export const SETTINGS_STORAGE_KEY = 'dock:settings'
export const DOCK_BASE_PLUGIN_ID = 'dock-base'
export const DOCK_POSITION_SETTING_ID = 'dock-base:position'
export const DOCK_AUTO_HIDE_SETTING_ID = 'dock-base:auto-hide'
export const DOCK_RESERVE_SETTING_ID = 'dock-base:reserve-space'
export const HIDDEN_PLUGINS_SETTING_ID = 'dock-base:hidden-plugins'

/** Generic fallback icon owned by dock-base (internal shell detail). */
export const GENERIC_PLUGIN_ICON = { path: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', stroke: true } as const

export const DOCK_POSITIONS = ['left', 'right', 'top', 'bottom'] as const
export type DockPositionSettingValue = typeof DOCK_POSITIONS[number]

const PositionSetting: SettingComponent<DockPositionSettingValue> = ({ value, onChange, locale: activeLocale }) => {
  const locale = activeLocale ?? getDockLocale()
  return createElement('div', {
    className: 'dsh-wb-setting-choices dsh-wb-position-switch',
    role: 'radiogroup',
    'aria-label': settingsLabels(locale).dockPosition,
  },
  ...DOCK_POSITIONS.map((item) => createElement('button', {
    key: item,
    type: 'button',
    role: 'radio',
    'aria-checked': value === item,
    className: `dsh-wb-setting-choice dsh-wb-position-option${value === item ? ' active' : ''}`,
    onClick: () => onChange(item),
  }, positionLabel(item, locale))),
  )
}
const AutoHideSetting: SettingComponent<'off' | 'edge'> = ({ value, onChange, locale: activeLocale }) => {
  const locale = activeLocale ?? getDockLocale()
  return createElement('label', { className: 'dsh-wb-setting-checkbox' },
    createElement('input', { type: 'checkbox', checked: value === 'edge', onChange: (event: { target: { checked: boolean } }) => onChange(event.target.checked ? 'edge' : 'off') }),
    autoHideLabel(value === 'edge', locale),
  )
}
const ReserveSpaceSetting: SettingComponent<boolean> = ({ value, onChange, locale: activeLocale }) => {
  const locale = activeLocale ?? getDockLocale()
  return createElement('button', {
    type: 'button',
    role: 'switch',
    'aria-checked': value,
    'aria-label': settingsLabels(locale).reserveSpace,
    className: `dsh-wb-setting-switch${value ? ' on' : ''}`,
    onClick: () => onChange(!value),
  }, createElement('span'))
}
const noopComponent = (() => null) as SettingComponent<unknown>
export const DOCK_POSITION_SETTING: SettingDefinition<'left' | 'right' | 'top' | 'bottom'> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: DOCK_POSITION_SETTING_ID,
  title: (locale) => settingsLabels(locale).dockPosition, order: 0,
  defaultValue: 'right', component: PositionSetting, validate: (value): value is 'left' | 'right' | 'top' | 'bottom' => value === 'left' || value === 'right' || value === 'top' || value === 'bottom',
}
export const DOCK_AUTO_HIDE_SETTING: SettingDefinition<'off' | 'edge'> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: DOCK_AUTO_HIDE_SETTING_ID,
  title: (locale) => settingsLabels(locale).autoHide, order: 1,
  defaultValue: 'off', component: AutoHideSetting, validate: (value): value is 'off' | 'edge' => value === 'off' || value === 'edge',
}
export const DOCK_RESERVE_SETTING: SettingDefinition<boolean> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: DOCK_RESERVE_SETTING_ID,
  title: (locale) => settingsLabels(locale).reserveSpace,
  description: (locale) => settingsLabels(locale).reserveSpaceHint, order: 2,
  defaultValue: true, component: ReserveSpaceSetting, validate: (value): value is boolean => typeof value === 'boolean',
}
export const HIDDEN_PLUGINS_SETTING: SettingDefinition<string[]> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: HIDDEN_PLUGINS_SETTING_ID, title: 'Hidden plugins', order: 3,
  defaultValue: [], component: noopComponent as SettingComponent<string[]>, validate: (value): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string'),
}

function memoryStorage(): SettingsStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

function resolveStorage(storage?: SettingsStorage): SettingsStorage {
  if (storage !== undefined) return storage
  try {
    if (typeof window !== 'undefined' && window.localStorage !== undefined) return window.localStorage
  } catch { /* localStorage may be blocked by browser policy */ }
  return memoryStorage()
}

export function createSettingsStore(storage?: SettingsStorage): SettingsStore {
  const backing = resolveStorage(storage)
  let persisted: Record<string, unknown> = {}
  try {
    const raw = backing.getItem(SETTINGS_STORAGE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) persisted = parsed as Record<string, unknown>
    }
  } catch { /* unavailable or corrupt storage: use defaults in memory */ }

  const definitions = new Map<string, SettingDefinition<unknown>>()
  const values = new Map<string, unknown>()
  const listeners = new Set<() => void>()

  const persist = (): void => {
    // Keep values for currently unregistered plugins so HMR/reinstallation can
    // restore them, while registered values are always written from memory.
    const snapshot: Record<string, unknown> = { ...persisted }
    for (const [id, value] of values) snapshot[id] = value
    const serialized = JSON.stringify(snapshot)
    if (serialized === undefined) throw new Error('[dock] settings value is not JSON-safe')
    persisted = snapshot
    try { backing.setItem(SETTINGS_STORAGE_KEY, serialized) } catch { /* storage unavailable/full: memory remains authoritative */ }
  }
  const assertJsonSafe = (value: unknown): void => {
    const visiting = new WeakSet<object>()
    const visit = (candidate: unknown): void => {
      if (candidate === null || typeof candidate === 'boolean' || typeof candidate === 'string') return
      if (typeof candidate === 'number') {
        // JSON.stringify(-0) becomes 0, so it cannot round-trip losslessly.
        if (Number.isFinite(candidate) && !Object.is(candidate, -0)) return
        throw new TypeError()
      }
      if (typeof candidate !== 'object') throw new TypeError()
      if (visiting.has(candidate)) throw new TypeError()

      const isArray = Array.isArray(candidate)
      const prototype = Object.getPrototypeOf(candidate)
      if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new TypeError()

      visiting.add(candidate)
      const keys = Reflect.ownKeys(candidate)
      if (isArray) {
        // JSON only serializes dense, indexed arrays. Reject extra properties,
        // holes, symbols, and accessors whose values cannot round-trip.
        const array = candidate as unknown[]
        if (keys.length !== array.length + 1 || !Object.prototype.hasOwnProperty.call(candidate, 'length')) throw new TypeError()
        for (let index = 0; index < array.length; index++) {
          if (!Object.prototype.hasOwnProperty.call(candidate, String(index))) throw new TypeError()
        }
      }
      for (const key of keys) {
        if (typeof key === 'symbol') throw new TypeError()
        if (isArray && key === 'length') continue
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key)
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) throw new TypeError()
        visit(descriptor.value)
      }
      visiting.delete(candidate)
    }
    try {
      visit(value)
      // Keep this final check as a contract guard for future changes to the
      // recursive validator: accepted settings must round-trip as JSON.
      const serialized = JSON.stringify(value)
      if (serialized === undefined || JSON.parse(serialized) === undefined) throw new TypeError()
    } catch {
      throw new TypeError('[dock] setting value must be JSON-safe')
    }
  }
  const cloneJsonSafe = <T>(value: T): T => {
    assertJsonSafe(value)
    return JSON.parse(JSON.stringify(value)) as T
  }
  const notify = (): void => { for (const listener of [...listeners]) listener() }

  return {
    register<T>(definition: SettingDefinition<T>): () => void {
      if (definitions.has(definition.id)) throw new Error(`[dock] setting "${definition.id}" already registered`)
      const defaultValue = cloneJsonSafe(definition.defaultValue)
      if (!definition.validate(defaultValue)) throw new Error(`[dock] invalid default value for setting "${definition.id}"`)
      const typed = definition as SettingDefinition<unknown>
      definitions.set(definition.id, typed)
      const candidate = persisted[definition.id]
      const safeCandidate = candidate === undefined ? undefined : cloneJsonSafe(candidate)
      const value = safeCandidate !== undefined && definition.validate(safeCandidate)
        ? safeCandidate
        : cloneJsonSafe(defaultValue)
      values.set(definition.id, value)
      persisted[definition.id] = cloneJsonSafe(value)
      persist()
      notify()
      return () => {
        if (definitions.get(definition.id) !== typed) return
        definitions.delete(definition.id)
        // Keep the in-memory and persisted value so re-registration (including
        // HMR) restores the user's choice instead of silently resetting it.
        notify()
      }
    },
    get<T = unknown>(id: string): T | undefined {
      const definition = definitions.get(id)
      if (definition === undefined) return undefined
      const value = values.get(id)
      const safeValue = value === undefined ? undefined : cloneJsonSafe(value)
      return (safeValue !== undefined && definition.validate(safeValue)
        ? safeValue
        : cloneJsonSafe(definition.defaultValue)) as T
    },
    getDefinitions(pluginId?: string): readonly SettingDefinition<unknown>[] {
      // Settings are ordered by `order`, then by id for a deterministic tie-break.
      return [...definitions.values()].filter((definition) => pluginId === undefined || definition.pluginId === pluginId).sort((left, right) => {
        const orderDifference = (left.order ?? 100) - (right.order ?? 100)
        return orderDifference !== 0 ? orderDifference : left.id < right.id ? -1 : left.id > right.id ? 1 : 0
      })
    },
    set<T = unknown>(id: string, value: T): void {
      const definition = definitions.get(id)
      if (definition === undefined) throw new Error(`[dock] unknown setting "${id}"`)
      const safeValue = cloneJsonSafe(value)
       const valid = definition.validate(safeValue)
      
      const next = valid ? safeValue : cloneJsonSafe(definition.defaultValue)
      if (Object.is(values.get(id), next)) {
        if (!valid) {
          persisted[id] = next
          persist()
        }
        return
      }
      values.set(id, next)
      persisted[id] = next
      persist()
      notify()
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
