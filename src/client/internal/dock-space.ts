import type { DockPosition } from '../contract.ts'

/**
 * Visual gap kept between the floating dock bar and the conversation turn rail.
 * The bar is fixed 12px from the docked edge, so the offset is the bar's own
 * size plus the same gap.
 */
export const DOCK_RESERVE_GAP = 12

export interface DockBarRect {
  left: number
  right: number
  top: number
  bottom: number
}

export interface DockViewport {
  width: number
  height: number
}

/**
 * Return the measured offset needed to move the conversation turn rail clear
 * of the floating dock bar. The bar rect is measured in viewport coordinates,
 * so the result is the distance from the bar to the docked edge plus
 * {@link DOCK_RESERVE_GAP}.
 */
export function dockReservePx(
  position: DockPosition,
  bar: DockBarRect,
  viewport: DockViewport,
  gap = DOCK_RESERVE_GAP,
): number {
  const measured =
    position === 'right'
      ? viewport.width - bar.left
      : position === 'left'
        ? bar.right
        : position === 'bottom'
          ? viewport.height - bar.top
          : bar.bottom
  if (!Number.isFinite(measured)) return 0
  return Math.max(0, Math.ceil(measured + gap))
}
