import type { WorkbenchContext } from './contract.ts';
/** No runtime services required: the base only needs the cordis context. */
export declare const inject: string[];
/** Client plugin body. */
export declare function apply(ctx: WorkbenchContext): void;
