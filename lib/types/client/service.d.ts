/**
 * The WorkbenchService implementation: one registry per extension surface
 * (activity items / panels / editor views / status items / commands) plus
 * layout read/write proxying to the layout store. One instance per client
 * activation; published as `ctx.workbench` in the client apply().
 *
 * Design notes (Phase 1):
 * - Synchronous snapshot registries (Map + listener set) so React reads them
 *   through useSyncExternalStore without tearing.
 * - Every register* returns a disposer; consumers wrap it in ctx.effect()
 *   so fiber disposal (HMR / disable) unregisters cleanly.
 * - Duplicate ids throw, like the sidebar registry (package-prefix ids
 *   recommended: 'files', 'my-plugin:db').
 */
import type { WorkbenchService } from './contract.ts';
import type { LayoutStore } from './layout.ts';
export declare function createWorkbenchService(store: LayoutStore): WorkbenchService;
