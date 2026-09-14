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
export declare const DOCK_HOVER_SCALE_SETTING_ID = "dock-base:hover-scale";
export declare const DOCK_NEAR_SCALE_SETTING_ID = "dock-base:near-scale";
/** Magnification applied to the icon under the cursor in dock mode. */
export declare const DOCK_HOVER_SCALE_DEFAULT = 1.6;
/** Magnification applied to the two items flanking it. */
export declare const DOCK_NEAR_SCALE_DEFAULT = 1.2;
/**
 * User-adjustable slider bounds for the dock's fisheye. The lower bound is 1
 * (hover never shrinks an icon) and the upper bounds stay below the point
 * where a magnified icon would swallow its neighbours. The stylesheet keeps
 * the same defaults as fallbacks, so it stays self-sufficient.
 */
export declare const DOCK_HOVER_SCALE_RANGE: DockScaleRange;
export declare const DOCK_NEAR_SCALE_RANGE: DockScaleRange;
/**
 * Dock-owned activity entry: it opens the settings window instead of a
 * side-bar pane (the dock cannot open itself *in* the dock), so it carries an
 * empty `paneId`.
 */
export declare const DOCK_SETTINGS_ACTIVITY_ID = "dock-base:settings";
/** Tail order: the dock's own entry sits after every feature entry. */
export declare const DOCK_SETTINGS_ACTIVITY_ORDER = 900;
/** Generic fallback icon owned by dock-base (internal shell detail). */
export declare const GENERIC_PLUGIN_ICON: {
    readonly path: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z";
    readonly stroke: true;
};
/**
 * Dock's own icon: three entries resting on the dock bar. Distinct from the
 * generic 2×2 fallback so the dock reads as itself both in the activity bar
 * and in its own settings card.
 */
export declare const DOCK_BASE_ICON: {
    readonly path: "M5 8h4v4H5zM10 8h4v4h-4zM15 8h4v4h-4zM3 16h18";
    readonly stroke: true;
};
export declare const DOCK_POSITIONS: readonly ["left", "right", "top", "bottom"];
export type DockPositionSettingValue = typeof DOCK_POSITIONS[number];
/** A bounded numeric range rendered as a slider (min/max/step are the contract). */
export interface DockScaleRange {
    min: number;
    max: number;
    step: number;
}
/** True only for a finite number inside the range (the setting's own guard). */
export declare function inScaleRange(value: unknown, range: DockScaleRange): value is number;
export declare const DOCK_POSITION_SETTING: SettingDefinition<'left' | 'right' | 'top' | 'bottom'>;
export declare const DOCK_AUTO_HIDE_SETTING: SettingDefinition<'off' | 'edge'>;
export declare const DOCK_RESERVE_SETTING: SettingDefinition<boolean>;
export declare const DOCK_HOVER_SCALE_SETTING: SettingDefinition<number>;
export declare const DOCK_NEAR_SCALE_SETTING: SettingDefinition<number>;
/** Internal bookkeeping row: never rendered (see getVisibleSettings), so it sorts last. */
export declare const HIDDEN_PLUGINS_SETTING: SettingDefinition<string[]>;
export declare function createSettingsStore(storage?: SettingsStorage): SettingsStore;
