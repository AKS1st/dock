/**
 * Minimal context menu for the dock shell (right-click on the activity bar).
 * A single fixed-position popup with checkable items; closes on outside
 * mousedown, scroll, blur or Escape. Styles live in styles.ts (`.dsh-wb-menu*`)
 * so the menu follows the DSH theme tokens like the rest of the shell.
 *
 * The root stops mousedown propagation: the outside-close listener is
 * document-level, so without this an item's click would be swallowed by the
 * close-then-unmount sequence.
 */
import { type ReactNode } from 'react';
/** One menu row. */
export interface ContextMenuItem {
    label: string;
    /** Radio (●/○, default) or checkbox (✓/ ) marker. */
    kind?: 'radio' | 'checkbox';
    /** Renders a checked marker when true. */
    checked?: boolean;
    onClick?: () => void;
}
/** The open menu: screen position + items. */
export interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
}
export declare function ContextMenu(props: {
    menu: ContextMenuState | null;
    onClose: () => void;
}): ReactNode;
