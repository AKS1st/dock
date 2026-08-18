/**
 * Minimal context menu for the desk shell (right-click on the activity bar).
 * A single fixed-position popup with checkable items; closes on outside
 * mousedown, scroll, blur or Escape. Styles live in styles.ts (`.dsh-wb-menu*`)
 * so the menu follows the DSH theme tokens like the rest of the shell.
 *
 * The root stops mousedown propagation: the outside-close listener is
 * document-level, so without this an item's click would be swallowed by the
 * close-then-unmount sequence.
 */
import { createElement, useEffect, type ReactNode } from 'react'

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

  useEffect(() => {
    if (menu === null) return
    const close = (): void => onClose()
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    window.addEventListener('blur', close)
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
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
    className: 'dsh-wb-menu-item',
    role: item.kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio',
    'aria-checked': item.checked ?? false,
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
