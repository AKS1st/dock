/** Pure keyboard behavior shared by the dock overlays and regression tests. */
export function focusTrapTarget(
  key: string,
  shiftKey: boolean,
  activeIndex: number,
  focusableCount: number,
): number | null {
  if (key !== 'Tab' || activeIndex < 0) return null
  if (focusableCount === 0) return -1
  if (shiftKey && activeIndex === 0) return focusableCount - 1
  if (!shiftKey && activeIndex === focusableCount - 1) return 0
  return null
}

export function isMenuActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}

export function menuItemRole(kind: 'radio' | 'checkbox' | undefined): 'menuitemradio' | 'menuitemcheckbox' {
  return kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio'
}
