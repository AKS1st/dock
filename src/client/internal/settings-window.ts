import type { ActivityBarItemDefinition, IconRef, PluginDefinition, WorkbenchService } from '../contract.ts'
import type { SettingDefinition } from '../settings.ts'
import { DOCK_BASE_PLUGIN_ID, GENERIC_PLUGIN_ICON, HIDDEN_PLUGINS_SETTING_ID } from '../settings.ts'

export type SettingsTab = 'entry' | 'other'

export function getVisibleSettings(definitions: readonly SettingDefinition<unknown>[]): readonly SettingDefinition<unknown>[] {
  return definitions.filter((definition) => definition.id !== HIDDEN_PLUGINS_SETTING_ID)
}

export function getGeneralSettings(definitions: readonly SettingDefinition<unknown>[]): readonly SettingDefinition<unknown>[] {
  return definitions.filter((definition) => (definition.pluginId === undefined || definition.pluginId === DOCK_BASE_PLUGIN_ID) && definition.id !== HIDDEN_PLUGINS_SETTING_ID)
}

export function getPluginSettings(service: WorkbenchService, pluginId: string): readonly SettingDefinition<unknown>[] {
  return getVisibleSettings(service.getSettings(pluginId))
}

export function canOpenPluginSettings(definitions: readonly SettingDefinition<unknown>[]): boolean {
  return getVisibleSettings(definitions).length > 0
}

export function pluginsForTab(plugins: readonly PluginDefinition[], tab: SettingsTab): readonly PluginDefinition[] {
  return plugins.filter((plugin) => tab === 'entry' ? plugin.hasEntry : !plugin.hasEntry)
}

export function hasPluginVisibilitySwitch(plugin: PluginDefinition): boolean {
  return plugin.hasEntry
}

/** The dock entry this plugin owns, matched through the activity item's pluginId. */
export function pluginEntryItem(service: WorkbenchService, pluginId: string): ActivityBarItemDefinition | undefined {
  return service.getActivityItems().find((item) => (item.pluginId ?? item.id) === pluginId)
}

/**
 * Open a plugin's dock entry from the settings window. A hidden entry is
 * unhidden first, because activating a filtered-out activity would show
 * nothing; the user's intent here is "open it now".
 */
export function openPluginEntry(service: WorkbenchService, pluginId: string): boolean {
  const item = pluginEntryItem(service, pluginId)
  if (item === undefined) return false
  if (service.getHiddenPluginIds().includes(pluginId)) service.setPluginHidden(pluginId, false)
  service.updateLayout({ activity: item.id, sideBarOpen: true })
  return true
}

/** Keep switch keyboard activation from also activating its containing card. */
export function stopPluginSwitchKeydown(event: { key: string; stopPropagation(): void }): void {
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
}

export function pluginIcon(icon: IconRef | undefined): IconRef {
  return icon ?? GENERIC_PLUGIN_ICON
}

export function settingsTabClassName(id: SettingsTab, active: SettingsTab): string {
  return `dsh-wb-settings-tab${active === id ? ' active' : ''}`
}

export function settingsPageClassName(detail: boolean): string {
  return `dsh-wb-settings-page ${detail ? 'dsh-wb-settings-page-detail' : 'dsh-wb-settings-page-list'}`
}
