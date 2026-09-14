import assert from 'node:assert/strict'
import test from 'node:test'
import { createLayoutStore } from '../src/client/layout.ts'
import { createSettingsStore, DOCK_BASE_ICON, DOCK_HOVER_SCALE_DEFAULT, DOCK_NEAR_SCALE_DEFAULT, DOCK_POSITION_SETTING, DOCK_SETTINGS_ACTIVITY_ID, DOCK_SETTINGS_ACTIVITY_ORDER, type SettingsStorage } from '../src/client/settings.ts'
import { createWorkbenchService } from '../src/client/service.ts'

function storage(): SettingsStorage {
  let value: string | null = null
  return { getItem: () => value, setItem: (_key, next) => { value = next } }
}

test('dock-base is registered and service disposal removes its registry row', () => {
  const service = createWorkbenchService(createLayoutStore(storage()), createSettingsStore(storage()))
  const dock = service.getPlugin('dock-base')
  assert.equal(dock?.id, 'dock-base')
  assert.equal(dock?.title, 'Dock')
  assert.equal(dock?.hasEntry, true)
  assert.ok(service.getPlugins().some((plugin) => plugin.id === 'dock-base'))
  service.dispose()
  assert.equal(service.getPlugin('dock-base'), undefined)
})

test('dock registers its own settings entry and disposal removes it', () => {
  const service = createWorkbenchService(createLayoutStore(storage()), createSettingsStore(storage()))
  const entry = service.getActivityItem(DOCK_SETTINGS_ACTIVITY_ID)
  assert.equal(entry?.pluginId, 'dock-base')
  // No pane: the shell opens the settings window instead of a side bar.
  assert.equal(entry?.paneId, '')
  assert.equal(entry?.order, DOCK_SETTINGS_ACTIVITY_ORDER)
  assert.equal(entry?.icon, DOCK_BASE_ICON)
  assert.deepEqual(service.getActivityItems().map((item) => item.id), [DOCK_SETTINGS_ACTIVITY_ID])
  service.dispose()
  assert.equal(service.getActivityItem(DOCK_SETTINGS_ACTIVITY_ID), undefined)
  service.dispose()
})

test('plugin registry rejects duplicate ids and disposer unregisters', () => {
  const service = createWorkbenchService(createLayoutStore(storage()), createSettingsStore(storage()))
  const definition = { id: 'files', title: 'Files', hasEntry: true }
  const dispose = service.registerPlugin(definition)
  assert.deepEqual(service.getPlugin('files'), definition)
  assert.throws(() => service.registerPlugin(definition), /already registered/)
  dispose()
  assert.equal(service.getPlugin('files'), undefined)
  service.dispose()
})

test('plugin changes notify subscribers and scoped settings remain discoverable', () => {
  const service = createWorkbenchService(createLayoutStore(storage()), createSettingsStore(storage()))
  let changes = 0
  const stop = service.onDidChangePlugins(() => { changes += 1 })
  const dispose = service.registerPlugin({ id: 'entry', title: 'Entry', hasEntry: true })
  service.registerPlugin({ id: 'other', title: 'Other', hasEntry: false })
  assert.equal(changes, 2)
  assert.deepEqual(service.getPlugins().map((plugin) => plugin.id), ['dock-base', 'entry', 'other'])
  dispose()
  assert.equal(changes, 3)
  stop()
  service.dispose()
})

test('a neighbour never outgrows the hovered icon, and both are tunable', () => {
  const service = createWorkbenchService(createLayoutStore(storage()), createSettingsStore(storage()))
  assert.equal(service.getSetting('dock-base:hover-scale'), DOCK_HOVER_SCALE_DEFAULT)
  assert.equal(service.getSetting('dock-base:near-scale'), DOCK_NEAR_SCALE_DEFAULT)

  // Both factors move independently inside their own range.
  service.setSetting('dock-base:hover-scale', 2.2)
  service.setSetting('dock-base:near-scale', 1.5)
  assert.equal(service.getSetting('dock-base:hover-scale'), 2.2)
  assert.equal(service.getSetting('dock-base:near-scale'), 1.5)

  // Lowering the hover factor below the neighbour drags the neighbour with it.
  service.setSetting('dock-base:hover-scale', 1.1)
  assert.equal(service.getSetting('dock-base:near-scale'), 1.1)

  service.dispose()
  assert.equal(service.getSetting('dock-base:hover-scale'), undefined)
  assert.equal(service.getSetting('dock-base:near-scale'), undefined)
})

test('dock settings adapt bidirectionally and hidden plugin ids persist', () => {
  const layout = createLayoutStore(storage())
  const settings = createSettingsStore(storage())
  const service = createWorkbenchService(layout, settings)
  layout.update({ dock: 'left', autoHide: 'edge' })
  assert.equal(service.getSetting('dock-base:position'), 'left')
  assert.equal(service.getSetting('dock-base:auto-hide'), 'edge')
  service.setSetting('dock-base:position', 'top')
  assert.equal(layout.getLayout().dock, 'top')
  service.setPluginHidden('files', true)
  assert.deepEqual(service.getHiddenPluginIds(), ['files'])
  service.setPluginHidden('files', false)
  assert.deepEqual(service.getHiddenPluginIds(), [])

  service.dispose()
  assert.deepEqual(settings.getDefinitions(), [])
  layout.update({ dock: 'bottom' })
  assert.equal(settings.get('dock-base:position'), undefined)
  const disposePosition = settings.register(DOCK_POSITION_SETTING)
  settings.set('dock-base:position', 'left')
  assert.equal(layout.getLayout().dock, 'bottom')
  disposePosition()
  service.dispose()
})
