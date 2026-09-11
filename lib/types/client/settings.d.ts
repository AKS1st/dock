/** Extensible, validated client settings persisted independently from layout. */
import { type ComponentType } from 'react';
import { type DockLocale } from './internal/localization.ts';
/** The deliberately small props surface supplied to a setting editor. */
export interface SettingComponentProps<T = unknown> {
    value: T;
    onChange(value: T): void;
    /** Active dock/DSH locale, so a feature editor can localize its own labels. */
    locale?: DockLocale;
}
export type SettingComponent<T = unknown> = ComponentType<SettingComponentProps<T>>;
/** Display text: a plain string, or a locale-aware factory evaluated per render. */
export type SettingText = string | ((locale: DockLocale) => string);
export interface SettingDefinition<T = unknown> {
    /** Owning plugin; omitted for legacy/unscoped settings. */
    pluginId?: string;
    id: string;
    title: SettingText;
    description?: SettingText;
    /** Sort order used by the settings window; lower values appear first. */
    order?: number;
    defaultValue: T;
    /** The editor receives only its value and a write callback, never ctx/service. */
    component: SettingComponent<T>;
    /** Return true only for values accepted by the setting. */
    validate(value: unknown): value is T;
}
export interface SettingsStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface SettingsStore {
    register<T>(definition: SettingDefinition<T>): () => void;
    get<T = unknown>(id: string): T | undefined;
    getDefinitions(pluginId?: string): readonly SettingDefinition<unknown>[];
    set<T = unknown>(id: string, value: T): void;
    subscribe(listener: () => void): () => void;
}
export declare const SETTINGS_STORAGE_KEY = "dock:settings";
export declare const DOCK_BASE_PLUGIN_ID = "dock-base";
export declare const DOCK_POSITION_SETTING_ID = "dock-base:position";
export declare const DOCK_AUTO_HIDE_SETTING_ID = "dock-base:auto-hide";
export declare const DOCK_RESERVE_SETTING_ID = "dock-base:reserve-space";
export declare const HIDDEN_PLUGINS_SETTING_ID = "dock-base:hidden-plugins";
/** Generic fallback icon owned by dock-base (internal shell detail). */
export declare const GENERIC_PLUGIN_ICON: {
    readonly path: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z";
    readonly stroke: true;
};
export declare const DOCK_POSITIONS: readonly ["left", "right", "top", "bottom"];
export type DockPositionSettingValue = typeof DOCK_POSITIONS[number];
export declare const DOCK_POSITION_SETTING: SettingDefinition<'left' | 'right' | 'top' | 'bottom'>;
export declare const DOCK_AUTO_HIDE_SETTING: SettingDefinition<'off' | 'edge'>;
export declare const DOCK_RESERVE_SETTING: SettingDefinition<boolean>;
export declare const HIDDEN_PLUGINS_SETTING: SettingDefinition<string[]>;
export declare function createSettingsStore(storage?: SettingsStorage): SettingsStore;
