export type DockLocale = 'zh' | 'en';
/** DSH's current UI locale: Chinese for zh-* languages, English otherwise. */
export declare function getDockLocale(language?: string): DockLocale;
export declare function isDockEnglish(language?: string): boolean;
export interface SettingsLabels {
    settings: string;
    close: string;
    back: string;
    empty: string;
    general: string;
    plugins: string;
    entry: string;
    other: string;
    showPlugin: string;
    openPlugin: string;
    dockPosition: string;
    autoHide: string;
    autoHideHint: string;
    reserveSpace: string;
    reserveSpaceHint: string;
    left: string;
    right: string;
    top: string;
    bottom: string;
    autoHideOn: string;
    autoHideOff: string;
}
export declare function settingsLabels(locale: DockLocale): SettingsLabels;
export declare function positionLabel(position: 'left' | 'right' | 'top' | 'bottom', locale: DockLocale): string;
export declare function autoHideLabel(enabled: boolean, locale: DockLocale): string;
/**
 * Resolve a setting's display text. Definitions may declare a plain string or
 * a locale-aware factory, so feature plugins localize their own copy without
 * importing dock-base's internals.
 */
export declare function resolveSettingText(text: string | ((locale: DockLocale) => string) | undefined, locale: DockLocale): string | undefined;
