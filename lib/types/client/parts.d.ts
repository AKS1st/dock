import type { ReactNode } from 'react';
import type { WorkbenchContext, WorkbenchService } from './contract.ts';
import type { LayoutStore } from './layout.ts';
interface RootProps {
    ctx: WorkbenchContext;
    service: WorkbenchService;
    store: LayoutStore;
}
/** The whole workbench shell. */
export declare function WorkbenchRoot(props: RootProps): ReactNode;
export {};
