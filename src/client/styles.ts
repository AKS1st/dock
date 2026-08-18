/**
 * Workbench shell styles, injected once by the client apply() as a
 * <style data-plugin="desk"> tag. The shell is a fixed-position
 * workbench docked on the right edge; the DSH app shell gives up the width
 * through the --desk-width CSS variable (layout push), exactly one
 * global mutation owned by the base — feature plugins never touch global
 * styles.
 */
const CSS = `
.dsh-wb-root {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 49;
  display: flex;
  flex-direction: row;
  width: var(--desk-width, 720px);
  background: var(--dsw-specific-sidebar-fill, #f6f7f9);
  border-left: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  font: 13px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--dsw-text-primary, #1f2328);
  transition: width 0.18s var(--ds-ease-in-out, ease);
}
.dsh-wb-root.wb-collapsed { width: 48px; }
.dsh-wb-activity {
  width: 48px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 8px;
  background: var(--dsw-specific-sidebar-fill, #eef0f3);
  border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
.dsh-wb-activity button {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-wb-activity button:hover { background: rgba(127, 127, 127, 0.15); }
.dsh-wb-activity button.active { background: rgba(90, 120, 255, 0.18); }
.dsh-wb-sidebar {
  width: 240px;
  flex: none;
  overflow: auto;
  border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  padding: 6px 0;
}
.dsh-wb-sidebar-header {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dsw-text-secondary, #656d76);
}
.dsh-wb-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dsh-wb-tabs {
  display: flex;
  height: 34px;
  flex: none;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  overflow-x: auto;
  background: var(--dsw-specific-sidebar-fill, #f6f7f9);
}
.dsh-wb-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-text-secondary, #656d76);
  cursor: pointer;
  white-space: nowrap;
}
.dsh-wb-tab:hover { color: inherit; }
.dsh-wb-tab.active {
  color: inherit;
  border-bottom-color: var(--dsw-alias-border-accent, #4f6ef2);
}
.dsh-wb-tab-close { border: 0; background: transparent; cursor: pointer; color: inherit; opacity: 0.5; padding: 0 2px; }
.dsh-wb-tab-close:hover { opacity: 1; }
.dsh-wb-editor { flex: 1; min-height: 0; overflow: auto; }
.dsh-wb-editor-empty {
  padding: 24px;
  color: var(--dsw-text-secondary, #656d76);
  text-align: center;
}
.dsh-wb-panel {
  height: 170px;
  flex: none;
  border-top: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  overflow: auto;
}
.dsh-wb-statusbar {
  height: 24px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  border-top: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  font-size: 11px;
  color: var(--dsw-text-secondary, #656d76);
  background: var(--dsw-specific-sidebar-fill, #eef0f3);
}
.dsh-wb-view { padding: 8px; }
`

export function mountStyles(): () => void {
  const existing = document.querySelector('style[data-plugin="desk"]')
  if (existing !== null) existing.remove()
  const style = document.createElement('style')
  style.setAttribute('data-plugin', 'desk')
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
