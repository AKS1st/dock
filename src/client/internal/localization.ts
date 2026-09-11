export type DockLocale = 'zh' | 'en'

/** DSH's current UI locale: Chinese for zh-* languages, English otherwise. */
export function getDockLocale(language?: string): DockLocale {
  const value = language ?? (
    (typeof document !== 'undefined' ? document.documentElement.lang : '')
    || (typeof navigator !== 'undefined' ? navigator.language : '')
  )
  return value.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function isDockEnglish(language?: string): boolean {
  return getDockLocale(language) === 'en'
}

export interface SettingsLabels {
  settings: string
  close: string
  back: string
  empty: string
  general: string
  plugins: string
  entry: string
  other: string
  showPlugin: string
  openPlugin: string
  dockPosition: string
  autoHide: string
  reserveSpace: string
  reserveSpaceHint: string
  left: string
  right: string
  top: string
  bottom: string
  autoHideOn: string
  autoHideOff: string
}

const LABELS: Record<DockLocale, SettingsLabels> = {
  zh: {
    settings: '设置', close: '关闭设置', back: '返回设置', empty: '暂无可配置的设置',
    general: '通用设置', plugins: '插件', entry: '入口', other: '其它', showPlugin: '显示', openPlugin: '打开',
    dockPosition: 'Dock 位置', autoHide: '自动隐藏', left: '左侧', right: '右侧', top: '顶部', bottom: '底部',
    reserveSpace: '为 dock 预留空间',
    reserveSpaceHint: '在停靠侧空出一条边距，避免 dock 栏遮挡页面边缘的导航（例如会话进度导航栏）。',
    autoHideOn: '开启', autoHideOff: '关闭',
  },
  en: {
    settings: 'Settings', close: 'Close settings', back: 'Back to settings', empty: 'No configurable settings',
    general: 'General settings', plugins: 'Plugins', entry: 'Entry', other: 'Other', showPlugin: 'Show', openPlugin: 'Open',
    dockPosition: 'Dock position', autoHide: 'Auto-hide', left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom',
    reserveSpace: 'Reserve space for the dock',
    reserveSpaceHint: 'Keeps a gutter on the docked edge so the dock bar never covers edge-hugging page chrome such as the conversation turn rail.',
    autoHideOn: 'On', autoHideOff: 'Off',
  },
}

export function settingsLabels(locale: DockLocale): SettingsLabels {
  return LABELS[locale]
}

export function positionLabel(position: 'left' | 'right' | 'top' | 'bottom', locale: DockLocale): string {
  return LABELS[locale][position]
}

export function autoHideLabel(enabled: boolean, locale: DockLocale): string {
  return enabled ? LABELS[locale].autoHideOn : LABELS[locale].autoHideOff
}

/**
 * Resolve a setting's display text. Definitions may declare a plain string or
 * a locale-aware factory, so feature plugins localize their own copy without
 * importing dock-base's internals.
 */
export function resolveSettingText(
  text: string | ((locale: DockLocale) => string) | undefined,
  locale: DockLocale,
): string | undefined {
  if (text === undefined) return undefined
  return typeof text === 'function' ? text(locale) : text
}
