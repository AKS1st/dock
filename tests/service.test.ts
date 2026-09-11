import assert from 'node:assert/strict'
import test from 'node:test'
import { createLayoutStore } from '../src/client/layout.ts'
import { createSettingsStore, DOCK_POSITION_SETTING, type SettingsStorage } from '../src/client/settings.ts'
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
