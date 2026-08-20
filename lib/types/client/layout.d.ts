/**
 * Workbench layout state: a small synchronous store (getLayout/update/
 * subscribe) persisted to localStorage, mirroring the pattern the sidebar
 * plugin uses for its per-session state but scoped to the workbench shell.
 * Phase 1 models one editor area with an ordered tab list; recursive
 * splits arrive in Phase 2.
 */
import type { WorkbenchLayout } from './contract.ts';
export declare const DEFAULT_LAYOUT: WorkbenchLayout;
export interface LayoutStore {
    getLayout(): WorkbenchLayout;
    update(patch: Partial<WorkbenchLayout>): void;
    subscribe(listener: () => void): () => void;
}
/** Minimal storage face (injectable so tests run without a browser). */
export interface LayoutStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/**
 * Reorder an id list by moving `draggedId` to `targetId`'s position
 * (insert-before-target semantics). Pure and side-effect free so the drag
 * ordering logic is unit-testable. Unknown ids are left untouched.
 */
export declare function reorderActivity(ids: readonly string[], draggedId: string, targetId: string): string[];
export declare function createLayoutStore(storage?: LayoutStorage): LayoutStore;
