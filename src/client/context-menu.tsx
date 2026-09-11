/**
 * Minimal context menu for the dock shell (right-click on the activity bar).
 * A single fixed-position popup with checkable items; closes on outside
 * mousedown, scroll, blur or Escape. Styles live in styles.ts (`.dsh-wb-menu*`)
 * so the menu follows the DSH theme tokens like the rest of the shell.
 */
import { createElement, useEffect, useRef, type ReactNode } from 'react'
import { isMenuActivationKey, menuItemRole } from './ui-helpers.ts'

/** One menu row. */
export interface ContextMenuItem {
  label: string
  /** Radio (●/○, default) or checkbox (✓/ ) marker. */
  kind?: 'radio' | 'checkbox'
  /** Renders a checked marker when true. */
  checked?: boolean
  onClick?: () => void
}

/** The open menu: screen position + items. */
export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

export function ContextMenu(props: { menu: ContextMenuState | null; onClose: () => void }): ReactNode {
  const { menu, onClose } = props
  const firstItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (menu === null) return
    firstItemRef.current?.focus()
    const close = (): void => onClose()
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    window.addEventListener('blur', close)
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('blur', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu, onClose])

  if (menu === null) return null
  // Keep the menu inside the viewport (Phase A: simple clamp).
  const x = Math.min(menu.x, Math.max(0, window.innerWidth - 180))
  const y = Math.min(menu.y, Math.max(0, window.innerHeight - menu.items.length * 30 - 12))

  return createElement('div', {
    className: 'dsh-wb-menu',
    role: 'menu',
    style: { left: x, top: y },
    // Keep clicks inside the menu alive: don't let the document-level
    // outside-close listener fire before the item's onClick runs.
    onMouseDown: (event: MouseEvent) => event.stopPropagation(),
  },
  menu.items.map((item, index) => createElement('div', {
    key: `${item.label}-${index}`,
    ref: index === 0 ? firstItemRef : undefined,
    className: 'dsh-wb-menu-item',
    role: menuItemRole(item.kind),
    'aria-checked': item.checked ?? false,
    tabIndex: 0,
    onKeyDown: (event: KeyboardEvent) => {
      if (isMenuActivationKey(event.key)) {
        event.preventDefault()
        item.onClick?.()
        onClose()
      }
    },
    onClick: (event: MouseEvent) => {
      event.stopPropagation()
      item.onClick?.()
      onClose()
    },
  },
  createElement('span', { className: 'dsh-wb-menu-mark' },
    item.kind === 'checkbox' ? (item.checked ? '✓' : ' ') : (item.checked ? '●' : '○')),
  item.label,
  )),
  )
}
