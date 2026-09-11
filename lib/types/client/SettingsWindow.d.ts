import { type ReactNode } from 'react';
import type { WorkbenchService } from './contract.ts';
interface SettingsWindowProps {
    service: WorkbenchService;
    open: boolean;
    onClose: () => void;
    restoreFocusRef?: {
        current: HTMLElement | null;
    };
}
/** Standalone settings dialog, rendered beside (not inside) the auto-hide root. */
export declare function SettingsWindow(props: SettingsWindowProps): ReactNode;
export {};
