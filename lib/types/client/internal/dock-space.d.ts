import type { DockPosition } from '../contract.ts';
/**
 * Visual gap kept between the floating dock bar and the app shell it pushes.
 * The bar is fixed 12px from the docked edge, so the reserve is the bar's own
 * size plus the same gap on both sides.
 */
export declare const DOCK_RESERVE_GAP = 12;
export interface DockBarRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}
export interface DockViewport {
    width: number;
    height: number;
}
/**
 * Space the DSH app shell (`#root`) gives up on the docked edge so the floating
 * dock bar cannot cover page chrome that hugs the window edge — the
 * conversation turn rail is the current case.
 *
 * The bar rect is measured in viewport coordinates, so the reserve is the
 * distance from the bar to the docked edge plus {@link DOCK_RESERVE_GAP}.
 */
export declare function dockReservePx(position: DockPosition, bar: DockBarRect, viewport: DockViewport, gap?: number): number;
