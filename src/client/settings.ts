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
export const DOCK_HOVER_SCALE_SETTING_ID = 'dock-base:hover-scale'
export const DOCK_NEAR_SCALE_SETTING_ID = 'dock-base:near-scale'

/** Magnification applied to the icon under the cursor in dock mode. */
export const DOCK_HOVER_SCALE_DEFAULT = 1.6
/** Magnification applied to the two items flanking it. */
export const DOCK_NEAR_SCALE_DEFAULT = 1.2

/**
 * User-adjustable slider bounds for the dock's fisheye. The lower bound is 1
 * (hover never shrinks an icon) and the upper bounds stay below the point
 * where a magnified icon would swallow its neighbours. The stylesheet keeps
 * the same defaults as fallbacks, so it stays self-sufficient.
 */
export const DOCK_HOVER_SCALE_RANGE: DockScaleRange = { min: 1, max: 2.5, step: 0.05 }
export const DOCK_NEAR_SCALE_RANGE: DockScaleRange = { min: 1, max: 2, step: 0.05 }

/**
 * Dock-owned activity entry: it opens the settings window instead of a
 * side-bar pane (the dock cannot open itself *in* the dock), so it carries an
 * empty `paneId`.
 */
export const DOCK_SETTINGS_ACTIVITY_ID = 'dock-base:settings'

/** Tail order: the dock's own entry sits after every feature entry. */
export const DOCK_SETTINGS_ACTIVITY_ORDER = 900

/** Generic fallback icon owned by dock-base (internal shell detail). */
export const GENERIC_PLUGIN_ICON = { path: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', stroke: true } as const

/**
 * Dock's own icon: three entries resting on the dock bar. Distinct from the
 * generic 2×2 fallback so the dock reads as itself both in the activity bar
 * and in its own settings card.
 */
export const DOCK_BASE_ICON = { path: 'M5 8h4v4H5zM10 8h4v4h-4zM15 8h4v4h-4zM3 16h18', stroke: true } as const

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

/** A bounded numeric range rendered as a slider (min/max/step are the contract). */
export interface DockScaleRange {
  min: number
  max: number
  step: number
}

/** True only for a finite number inside the range (the setting's own guard). */
export function inScaleRange(value: unknown, range: DockScaleRange): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max
}

/**
 * Slider editor for one magnification factor. The knob never leaves the
 * declared range, the step is the persisted precision (so 0.05 steps cannot
 * accumulate float noise into the layout), and the live factor is printed
 * beside it because a bare slider gives no readout.
 */
function scaleSlider(range: DockScaleRange, label: (locale: DockLocale) => string): SettingComponent<number> {
  return ({ value, onChange, locale: activeLocale }) => {
    const locale = activeLocale ?? getDockLocale()
    const safe = inScaleRange(value, range) ? value : range.min
    return createElement('div', { className: 'dsh-wb-setting-slider' },
      createElement('input', {
        type: 'range',
        className: 'dsh-wb-setting-range',
        min: range.min,
        max: range.max,
        step: range.step,
        value: safe,
        'aria-label': label(locale),
        onChange: (event: { target: { value: string } }) => {
          const next = Number.parseFloat(event.target.value)
          // Snap to the step's precision so the persisted value stays exact.
          onChange(Number.isFinite(next) ? Math.round(next * 100) / 100 : range.min)
        },
      }),
      createElement('span', { className: 'dsh-wb-setting-scale' }, `${Number(safe.toFixed(2))}×`),
    )
  }
}

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
const hoverScaleSlider = scaleSlider(DOCK_HOVER_SCALE_RANGE, (locale) => settingsLabels(locale).hoverScale)
const nearScaleSlider = scaleSlider(DOCK_NEAR_SCALE_RANGE, (locale) => settingsLabels(locale).nearScale)
export const DOCK_HOVER_SCALE_SETTING: SettingDefinition<number> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: DOCK_HOVER_SCALE_SETTING_ID,
  title: (locale) => settingsLabels(locale).hoverScale,
  description: (locale) => settingsLabels(locale).hoverScaleHint, order: 3,
  defaultValue: DOCK_HOVER_SCALE_DEFAULT, component: hoverScaleSlider,
  validate: (value): value is number => inScaleRange(value, DOCK_HOVER_SCALE_RANGE),
}
export const DOCK_NEAR_SCALE_SETTING: SettingDefinition<number> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: DOCK_NEAR_SCALE_SETTING_ID,
  title: (locale) => settingsLabels(locale).nearScale,
  description: (locale) => settingsLabels(locale).nearScaleHint, order: 4,
  defaultValue: DOCK_NEAR_SCALE_DEFAULT, component: nearScaleSlider,
  validate: (value): value is number => inScaleRange(value, DOCK_NEAR_SCALE_RANGE),
}
/** Internal bookkeeping row: never rendered (see getVisibleSettings), so it sorts last. */
export const HIDDEN_PLUGINS_SETTING: SettingDefinition<string[]> = {
  pluginId: DOCK_BASE_PLUGIN_ID, id: HIDDEN_PLUGINS_SETTING_ID, title: 'Hidden plugins', order: 90,
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
