import assert from 'node:assert/strict'
import test from 'node:test'
import { createSettingsStore, DOCK_AUTO_HIDE_SETTING, DOCK_HOVER_SCALE_DEFAULT, DOCK_HOVER_SCALE_RANGE, DOCK_HOVER_SCALE_SETTING, DOCK_HOVER_SCALE_SETTING_ID, DOCK_NEAR_SCALE_DEFAULT, DOCK_NEAR_SCALE_RANGE, DOCK_NEAR_SCALE_SETTING, DOCK_NEAR_SCALE_SETTING_ID, DOCK_POSITIONS, DOCK_POSITION_SETTING, DOCK_RESERVE_SETTING, type SettingDefinition, type SettingsStorage } from '../src/client/settings.ts'
import { focusTrapTarget, isMenuActivationKey, menuItemRole } from '../src/client/ui-helpers.ts'
import { canOpenPluginSettings, getGeneralSettings, getVisibleSettings, hasPluginVisibilitySwitch, openPluginEntry, pluginEntryItem, pluginIcon, pluginsForTab, settingsPageClassName, settingsTabClassName, stopPluginSwitchKeydown } from '../src/client/internal/settings-window.ts'
import { dockReservePx } from '../src/client/internal/dock-space.ts'
import type { WorkbenchService } from '../src/client/contract.ts'
import { DOCK_BASE_PLUGIN_ID, GENERIC_PLUGIN_ICON, HIDDEN_PLUGINS_SETTING_ID } from '../src/client/settings.ts'
import { autoHideLabel, getDockLocale, positionLabel, resolveSettingText, settingsLabels } from '../src/client/internal/localization.ts'

function storage(initial?: string): SettingsStorage & { value?: string } {
  let value = initial
  return {
    get value() { return value },
    getItem: () => value ?? null,
    setItem: (_key, next) => { value = next },
  }
}

function definition(id: string, order: number, defaultValue = false): SettingDefinition<boolean> {
  return {
    id,
    title: id,
    order,
    defaultValue,
    component: (() => null) as SettingDefinition<boolean>['component'],
    validate: (value): value is boolean => typeof value === 'boolean',
  }
}

test('settings store starts empty and supports registration/read/write', () => {
  const backing = storage()
  const store = createSettingsStore(backing)
  assert.deepEqual(store.getDefinitions(), [])
  const unregister = store.register(definition('dock:z', 10))
  assert.equal(store.get('dock:z'), false)
  store.set('dock:z', true)
  assert.equal(store.get('dock:z'), true)
  assert.equal(JSON.parse(backing.value ?? '{}')['dock:z'], true)
  unregister()
  assert.deepEqual(store.getDefinitions(), [])
})

test('same-order settings are sorted by id and persisted values are validated', () => {
  const backing = storage(JSON.stringify({ 'dock:b': true, 'dock:a': 'bad' }))
  const store = createSettingsStore(backing)
  store.register(definition('dock:b', 20))
  store.register(definition('dock:a', 20, true))
  assert.deepEqual(store.getDefinitions().map((item) => item.id), ['dock:a', 'dock:b'])
  assert.equal(store.get('dock:a'), true)
  assert.equal(store.get('dock:b'), true)
  store.set('dock:b', 'invalid')
  assert.equal(store.get('dock:b'), false)
})

test('JSON-unsafe values are rejected before memory or persistence changes', () => {
  const backing = storage()
  const store = createSettingsStore(backing)
  store.register({ ...definition('dock:value', 1), validate: (value): value is unknown => true })
  const circular: Record<string, unknown> = {}
  circular.self = circular
  const unsafeValues: unknown[] = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0,
    undefined,
    (() => true),
    Symbol('setting'),
    1n,
    circular,
    { nested: [undefined] },
    { nested: { value: Number.NEGATIVE_INFINITY } },
    { nested: { value: () => true } },
    { nested: { value: Symbol('nested') } },
    { nested: { value: 1n } },
  ]
  for (const value of unsafeValues) assert.throws(() => store.set('dock:value', value), /JSON-safe/)
  const symbolKey = { [Symbol('key')]: true }
  assert.throws(() => store.set('dock:value', symbolKey), /JSON-safe/)
  const arrayWithExtraProperty: unknown[] = [true]
  Object.defineProperty(arrayWithExtraProperty, 'extra', { value: true, enumerable: false })
  assert.throws(() => store.set('dock:value', arrayWithExtraProperty), /JSON-safe/)
  const sparseArray: unknown[] = []
  sparseArray.length = 1
  assert.throws(() => store.set('dock:value', sparseArray), /JSON-safe/)
  const wrongPrototype = Object.create({ inherited: true }) as Record<string, unknown>
  wrongPrototype.value = true
  assert.throws(() => store.set('dock:value', wrongPrototype), /JSON-safe/)
  assert.equal(store.get('dock:value'), false)
  assert.equal(backing.value, JSON.stringify({ 'dock:value': false }))
})

test('settings values are defensively cloned on set and get', () => {
  const store = createSettingsStore(storage())
  const definition = {
    id: 'dock:object', title: 'object', defaultValue: { nested: { enabled: false } },
    component: (() => null) as SettingDefinition<{ nested: { enabled: boolean }}>['component'],
    validate: (value: unknown): value is { nested: { enabled: boolean } } =>
      typeof value === 'object' && value !== null && 'nested' in value,
  }
  store.register(definition)
  const input = { nested: { enabled: true } }
  store.set('dock:object', input)
  input.nested.enabled = false
  const result = store.get<{ nested: { enabled: boolean } }>('dock:object')
  assert.deepEqual(result, { nested: { enabled: true } })
  if (result) result.nested.enabled = false
  assert.deepEqual(store.get('dock:object'), { nested: { enabled: true } })
})

test('settings dialog traps focus at both boundaries and lets outside focus escape', () => {
  assert.equal(focusTrapTarget('Tab', false, 2, 3), 0)
  assert.equal(focusTrapTarget('Tab', true, 0, 3), 2)
  assert.equal(focusTrapTarget('Tab', false, 1, 3), null)
  assert.equal(focusTrapTarget('Enter', false, 2, 3), null)
  assert.equal(focusTrapTarget('Tab', false, -1, 0), null)
  assert.equal(focusTrapTarget('Tab', true, -1, 3), null)
})

test('context menu keyboard activation and ARIA roles stay aligned', () => {
  assert.equal(isMenuActivationKey('Enter'), true)
  assert.equal(isMenuActivationKey(' '), true)
  assert.equal(isMenuActivationKey('ArrowDown'), false)
  assert.equal(menuItemRole('checkbox'), 'menuitemcheckbox')
  assert.equal(menuItemRole(undefined), 'menuitemradio')
})

test('settings window helpers split plugins, icons, access, and general settings', () => {
  const hidden = definition(HIDDEN_PLUGINS_SETTING_ID, 2)
  const general = { ...definition('dock-base:custom', 1), pluginId: DOCK_BASE_PLUGIN_ID }
  const legacy = definition('legacy:setting', 0)
  const pluginSetting = { ...definition('plugin:setting', 1), pluginId: 'entry' }
  assert.deepEqual(pluginsForTab([
    { id: 'entry', title: 'Entry', hasEntry: true },
    { id: 'other', title: 'Other', hasEntry: false },
  ], 'entry').map((plugin) => plugin.id), ['entry'])
  const entryPlugin = { id: 'entry', title: 'Entry', hasEntry: true }
  const otherPlugin = { id: 'other', title: 'Other', hasEntry: false }
  assert.deepEqual(pluginsForTab([entryPlugin, otherPlugin], 'other').map((plugin) => plugin.id), ['other'])
  assert.equal(hasPluginVisibilitySwitch(entryPlugin), true)
  assert.equal(hasPluginVisibilitySwitch(otherPlugin), false)
  assert.deepEqual(pluginIcon(undefined), GENERIC_PLUGIN_ICON)
  assert.deepEqual(getVisibleSettings([hidden, pluginSetting]).map((item) => item.id), ['plugin:setting'])
  assert.equal(canOpenPluginSettings([hidden]), false)
  assert.equal(canOpenPluginSettings([hidden, pluginSetting]), true)
  assert.deepEqual(getGeneralSettings([hidden, general, legacy, pluginSetting]).map((item) => item.id), ['dock-base:custom', 'legacy:setting'])
})

test('localization helper provides zh and en labels without changing plugin text', () => {
  assert.equal(getDockLocale('zh-CN'), 'zh')
  assert.equal(getDockLocale('zh-TW'), 'zh')
  assert.equal(getDockLocale('en-US'), 'en')
  assert.deepEqual(DOCK_POSITIONS, ['left', 'right', 'top', 'bottom'])
  assert.deepEqual(DOCK_POSITIONS.map((position) => positionLabel(position, 'zh')), ['左侧', '右侧', '顶部', '底部'])
  assert.deepEqual(DOCK_POSITIONS.map((position) => positionLabel(position, 'en')), ['Left', 'Right', 'Top', 'Bottom'])
  assert.equal(settingsLabels('zh').settings, '设置')
  assert.equal(settingsLabels('en').settings, 'Settings')
  assert.equal(settingsLabels('zh').entry, '入口')
  assert.equal(settingsLabels('en').other, 'Other')
  assert.equal(positionLabel('left', 'zh'), '左侧')
  assert.equal(positionLabel('left', 'en'), 'Left')
  assert.equal(autoHideLabel(true, 'zh'), '开启')
  assert.equal(autoHideLabel(false, 'en'), 'Off')
  assert.equal(settingsLabels('zh').openPlugin, '打开')
  assert.equal(settingsLabels('en').openPlugin, 'Open')
  assert.equal(resolveSettingText('plain', 'zh'), 'plain')
  assert.equal(resolveSettingText((locale) => (locale === 'zh' ? '中文' : 'English'), 'zh'), '中文')
  assert.equal(resolveSettingText((locale) => (locale === 'zh' ? '中文' : 'English'), 'en'), 'English')
  assert.equal(resolveSettingText(undefined, 'zh'), undefined)
})

test('dock-base own settings localize their titles through the definition factory', () => {
  assert.equal(resolveSettingText(DOCK_POSITION_SETTING.title, 'zh'), 'Dock 位置')
  assert.equal(resolveSettingText(DOCK_POSITION_SETTING.title, 'en'), 'Dock position')
  assert.equal(resolveSettingText(DOCK_AUTO_HIDE_SETTING.title, 'zh'), '自动隐藏')
  assert.equal(resolveSettingText(DOCK_AUTO_HIDE_SETTING.title, 'en'), 'Auto-hide')
})

test('plugin entry helpers map a plugin to its activity item and open it', () => {
  const calls: Array<{ hidden: string[]; activity?: string; sideBarOpen?: boolean }> = []
  const service = {
    getActivityItems: () => [
      { id: 'files', pluginId: 'dock-files', title: 'Files', icon: '', order: 10, paneId: 'files' },
      { id: 'git', title: 'Git', icon: '', order: 20, paneId: 'git' },
    ],
    getHiddenPluginIds: () => ['dock-files'],
    setPluginHidden: (pluginId: string, hidden: boolean) => { calls.push({ hidden: hidden ? [pluginId] : [] }) },
    updateLayout: (patch: { activity?: string; sideBarOpen?: boolean }) => { calls.push({ hidden: [], activity: patch.activity, sideBarOpen: patch.sideBarOpen }) },
  } as unknown as WorkbenchService

  assert.equal(pluginEntryItem(service, 'dock-files')?.paneId, 'files')
  // Items without pluginId fall back to their own id.
  assert.equal(pluginEntryItem(service, 'git')?.paneId, 'git')
  assert.equal(pluginEntryItem(service, 'missing'), undefined)

  assert.equal(openPluginEntry(service, 'missing'), false)
  assert.equal(calls.length, 0)
  // A hidden entry is unhidden first, then activated.
  assert.equal(openPluginEntry(service, 'dock-files'), true)
  assert.deepEqual(calls, [{ hidden: [] }, { hidden: [], activity: 'files', sideBarOpen: true }])
})

test("dock's own pane-less settings entry is never an entry to open", () => {
  const calls: string[] = []
  const service = {
    getActivityItems: () => [
      { id: 'dock-base:settings', pluginId: 'dock-base', title: 'Dock settings', icon: '', order: 900, paneId: '' },
    ],
    getHiddenPluginIds: () => [],
    setPluginHidden: () => { calls.push('unhide') },
    updateLayout: () => { calls.push('activate') },
  } as unknown as WorkbenchService

  assert.equal(pluginEntryItem(service, 'dock-base'), undefined)
  assert.equal(openPluginEntry(service, 'dock-base'), false)
  assert.deepEqual(calls, [])
})

test('plugin switch activation keys stop at the switch instead of the card', () => {
  for (const key of ['Enter', ' ']) {
    let stopped = 0
    stopPluginSwitchKeydown({ key, stopPropagation: () => { stopped += 1 } })
    assert.equal(stopped, 1)
  }
  let stopped = 0
  stopPluginSwitchKeydown({ key: 'ArrowDown', stopPropagation: () => { stopped += 1 } })
  assert.equal(stopped, 0)
})

test('settings navigation helpers preserve transition classes and active state', () => {
  assert.equal(settingsTabClassName('entry', 'entry'), 'dsh-wb-settings-tab active')
  assert.equal(settingsTabClassName('other', 'entry'), 'dsh-wb-settings-tab')
  assert.equal(settingsPageClassName(true), 'dsh-wb-settings-page dsh-wb-settings-page-detail')
  assert.equal(settingsPageClassName(false), 'dsh-wb-settings-page dsh-wb-settings-page-list')
})

test('dock reserve measures the pushed space from the bar rect', () => {
  const viewport = { width: 1000, height: 800 }
  // Right-docked bar at x=940 (60px wide) plus the 24px visual gap.
  assert.equal(dockReservePx('right', { left: 940, right: 1000, top: 0, bottom: 0 }, viewport), 84)
  assert.equal(dockReservePx('left', { left: 0, right: 60, top: 0, bottom: 0 }, viewport), 84)
  assert.equal(dockReservePx('bottom', { left: 0, right: 0, top: 748, bottom: 800 }, viewport), 76)
  assert.equal(dockReservePx('top', { left: 0, right: 0, top: 0, bottom: 44 }, viewport), 68)
  // A custom gap is honoured, and a missing measurement cannot reserve space.
  assert.equal(dockReservePx('right', { left: 940, right: 1000, top: 0, bottom: 0 }, viewport, 0), 60)
  assert.equal(dockReservePx('right', { left: Number.NaN, right: 0, top: 0, bottom: 0 }, viewport), 0)
})

test('the reserve setting is a dock-owned boolean defaulting to on', () => {
  assert.equal(DOCK_RESERVE_SETTING.pluginId, DOCK_BASE_PLUGIN_ID)
  assert.equal(DOCK_RESERVE_SETTING.defaultValue, true)
  assert.equal(DOCK_RESERVE_SETTING.validate(true), true)
  assert.equal(DOCK_RESERVE_SETTING.validate(false), true)
  assert.equal(DOCK_RESERVE_SETTING.validate('on'), false)
  assert.equal(resolveSettingText(DOCK_RESERVE_SETTING.title, 'zh'), '为 dock 预留空间')
  assert.equal(resolveSettingText(DOCK_RESERVE_SETTING.title, 'en'), 'Reserve space for the dock')
})

test('the magnification settings are bounded sliders with dock defaults', () => {
  assert.equal(DOCK_HOVER_SCALE_SETTING.pluginId, DOCK_BASE_PLUGIN_ID)
  assert.equal(DOCK_HOVER_SCALE_SETTING.defaultValue, DOCK_HOVER_SCALE_DEFAULT)
  assert.equal(DOCK_NEAR_SCALE_SETTING.defaultValue, DOCK_NEAR_SCALE_DEFAULT)
  // The range is the contract: the slider cannot leave it, so the guard is it.
  for (const value of [DOCK_HOVER_SCALE_RANGE.min, 1.55, DOCK_HOVER_SCALE_DEFAULT, DOCK_HOVER_SCALE_RANGE.max]) {
    assert.equal(DOCK_HOVER_SCALE_SETTING.validate(value), true)
  }
  for (const value of [0.9, DOCK_HOVER_SCALE_RANGE.max + 0.01, Number.NaN, Number.POSITIVE_INFINITY, '1.6', null, undefined]) {
    assert.equal(DOCK_HOVER_SCALE_SETTING.validate(value), false)
  }
  assert.equal(DOCK_NEAR_SCALE_SETTING.validate(DOCK_NEAR_SCALE_RANGE.max), true)
  assert.equal(DOCK_NEAR_SCALE_SETTING.validate(DOCK_NEAR_SCALE_RANGE.max + 0.05), false)
  assert.equal(DOCK_NEAR_SCALE_RANGE.max <= DOCK_HOVER_SCALE_RANGE.max, true)
  assert.equal(resolveSettingText(DOCK_HOVER_SCALE_SETTING.title, 'zh'), '悬停图标放大')
  assert.equal(resolveSettingText(DOCK_HOVER_SCALE_SETTING.title, 'en'), 'Hovered icon magnification')
  assert.equal(resolveSettingText(DOCK_NEAR_SCALE_SETTING.title, 'zh'), '相邻图标放大')
  assert.equal(resolveSettingText(DOCK_NEAR_SCALE_SETTING.title, 'en'), 'Neighbour magnification')
})

test('an out-of-range persisted magnification falls back to its default', () => {
  const backing = storage(JSON.stringify({ [DOCK_HOVER_SCALE_SETTING_ID]: 9, [DOCK_NEAR_SCALE_SETTING_ID]: 0.2 }))
  const store = createSettingsStore(backing)
  store.register(DOCK_HOVER_SCALE_SETTING)
  store.register(DOCK_NEAR_SCALE_SETTING)
  assert.equal(store.get(DOCK_HOVER_SCALE_SETTING_ID), DOCK_HOVER_SCALE_DEFAULT)
  assert.equal(store.get(DOCK_NEAR_SCALE_SETTING_ID), DOCK_NEAR_SCALE_DEFAULT)
  // A hand-edited value outside the range is also rejected on write.
  store.set(DOCK_HOVER_SCALE_SETTING_ID, 4)
  assert.equal(store.get(DOCK_HOVER_SCALE_SETTING_ID), DOCK_HOVER_SCALE_DEFAULT)
})

test('setting subscribers observe writes and can unsubscribe', () => {
  const store = createSettingsStore(storage())
  store.register(definition('dock:flag', 1))
  let changes = 0
  const unsubscribe = store.subscribe(() => { changes += 1 })
  store.set('dock:flag', true)
  assert.equal(changes, 1)
  unsubscribe()
  store.set('dock:flag', false)
  assert.equal(changes, 1)
})
