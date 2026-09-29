import type { WorkbenchContext } from './contract.ts';
/**
 * The shell resolves the active Session from `uiSession`, whose scope adapter
 * is the view owner's selection source; waiting for it keeps every view's
 * sessionId correct on its first render instead of racing boot order.
 */
export declare const inject: string[];
/** Client plugin body. */
export declare function apply(ctx: WorkbenchContext): void;
