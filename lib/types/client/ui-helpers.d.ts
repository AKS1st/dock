/** Pure keyboard behavior shared by the dock overlays and regression tests. */
export declare function focusTrapTarget(key: string, shiftKey: boolean, activeIndex: number, focusableCount: number): number | null;
export declare function isMenuActivationKey(key: string): boolean;
export declare function menuItemRole(kind: 'radio' | 'checkbox' | undefined): 'menuitemradio' | 'menuitemcheckbox';
