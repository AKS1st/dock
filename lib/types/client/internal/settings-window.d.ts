import type { ActivityBarItemDefinition, IconRef, PluginDefinition, WorkbenchService } from '../contract.ts';
import type { SettingDefinition } from '../settings.ts';
export type SettingsTab = 'entry' | 'other';
export declare function getVisibleSettings(definitions: readonly SettingDefinition<unknown>[]): readonly SettingDefinition<unknown>[];
export declare function getGeneralSettings(definitions: readonly SettingDefinition<unknown>[]): readonly SettingDefinition<unknown>[];
export declare function getPluginSettings(service: WorkbenchService, pluginId: string): readonly SettingDefinition<unknown>[];
export declare function canOpenPluginSettings(definitions: readonly SettingDefinition<unknown>[]): boolean;
export declare function pluginsForTab(plugins: readonly PluginDefinition[], tab: SettingsTab): readonly PluginDefinition[];
export declare function hasPluginVisibilitySwitch(plugin: PluginDefinition): boolean;
/**
 * The side-bar entry this plugin owns, matched through the activity item's
 * pluginId. A pane-less item is not an entry: the dock's own settings item
 * opens the settings dialog, so there is nothing to open in the side bar and
 * the "Open" action must not be offered for it.
 */
export declare function pluginEntryItem(service: WorkbenchService, pluginId: string): ActivityBarItemDefinition | undefined;
/**
 * Open a plugin's dock entry from the settings window. A hidden entry is
 * unhidden first, because activating a filtered-out activity would show
 * nothing; the user's intent here is "open it now".
 */
export declare function openPluginEntry(service: WorkbenchService, pluginId: string): boolean;
/** Keep switch keyboard activation from also activating its containing card. */
export declare function stopPluginSwitchKeydown(event: {
    key: string;
    stopPropagation(): void;
}): void;
export declare function pluginIcon(icon: IconRef | undefined): IconRef;
export declare function settingsTabClassName(id: SettingsTab, active: SettingsTab): string;
export declare function settingsPageClassName(detail: boolean): string;
