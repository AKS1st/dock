/**
 * Workbench shell styles, injected once by the client apply() as a
 * <style data-plugin="desk"> tag.
 *
 * Layout model: the workbench docks to one of four screen edges
 * (`body[data-desk-dock]`). The shell is always `[activity][body]` in the
 * dock direction; `body` is `[sidebar][main]` (sidebar always on the left).
 * The DSH app shell (#root) gives up the occupied size through the
 * --desk-size CSS variable (layout push), exactly one global mutation owned
 * by the base — feature plugins never touch global styles.
 */
const CSS = `
/* Layout push: #root yields the docked size on the docked edge. */
#root {
  margin-right: var(--desk-size, 0px);
  transition: margin-right 0.18s var(--ds-ease-in-out, ease),
              margin-left 0.18s var(--ds-ease-in-out, ease),
              margin-top 0.18s var(--ds-ease-in-out, ease),
              margin-bottom 0.18s var(--ds-ease-in-out, ease);
}
body[data-desk-dock="left"] #root   { margin-right: 0; margin-left: var(--desk-size, 0px); }
body[data-desk-dock="top"] #root    { margin-right: 0; margin-top: var(--desk-size, 0px); }
body[data-desk-dock="bottom"] #root { margin-right: 0; margin-bottom: var(--desk-size, 0px); }

.dsh-wb-root {
  position: fixed;
  z-index: 49;
  display: flex;
  background: var(--dsw-specific-sidebar-fill, #f6f7f9);
  font: 13px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--dsw-alias-label-primary, #1f2328);
  transition: width 0.18s var(--ds-ease-in-out, ease),
              height 0.18s var(--ds-ease-in-out, ease);
}
/* Docked edge + main direction (row for left/right, column for top/bottom). */
.dsh-wb-root[data-dock="left"],
.dsh-wb-root[data-dock="right"] {
  top: 0;
  bottom: 0;
  flex-direction: row;
  width: var(--desk-size, 720px);
}
.dsh-wb-root[data-dock="left"]  { left: 0; border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-root[data-dock="right"] { right: 0; border-left: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-root[data-dock="top"],
.dsh-wb-root[data-dock="bottom"] {
  left: 0;
  right: 0;
  flex-direction: column;
  height: var(--desk-size, 480px);
}
.dsh-wb-root[data-dock="top"]    { top: 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-root[data-dock="bottom"] { bottom: 0; border-top: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }

/* Activity bar: always on the docked edge (order flips with the dock side). */
.dsh-wb-root[data-dock="left"] .dsh-wb-activity   { order: 1; }
.dsh-wb-root[data-dock="left"] .dsh-wb-body       { order: 2; }
.dsh-wb-root[data-dock="right"] .dsh-wb-activity  { order: 2; }
.dsh-wb-root[data-dock="right"] .dsh-wb-body      { order: 1; }
.dsh-wb-root[data-dock="top"] .dsh-wb-activity    { order: 1; }
.dsh-wb-root[data-dock="top"] .dsh-wb-body        { order: 2; }
.dsh-wb-root[data-dock="bottom"] .dsh-wb-activity { order: 2; }
.dsh-wb-root[data-dock="bottom"] .dsh-wb-body     { order: 1; }

.dsh-wb-activity {
  width: 48px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 8px;
  background: var(--dsw-specific-sidebar-fill, #eef0f3);
}
.dsh-wb-root[data-dock="left"] .dsh-wb-activity,
.dsh-wb-root[data-dock="right"] .dsh-wb-activity {
  border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
.dsh-wb-root[data-dock="right"] .dsh-wb-activity {
  border-right: 0;
  border-left: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
/* Top/bottom docks: the activity bar is a horizontal strip. */
.dsh-wb-root[data-dock="top"] .dsh-wb-activity,
.dsh-wb-root[data-dock="bottom"] .dsh-wb-activity {
  width: auto;
  height: 44px;
  flex-direction: row;
  justify-content: center;
  padding: 0 8px;
  border-right: 0;
  border-left: 0;
}
.dsh-wb-root[data-dock="top"] .dsh-wb-activity {
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
.dsh-wb-root[data-dock="bottom"] .dsh-wb-activity {
  border-top: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
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
/* Drag sorting feedback: the dragged item fades, the drop target highlights. */
.dsh-wb-activity button[draggable="true"] { cursor: grab; }
.dsh-wb-activity button.dragging { opacity: 0.4; cursor: grabbing; }
.dsh-wb-activity button.drag-over {
  background: var(--dsw-alias-interactive-bg-hover-accent, rgba(90, 120, 255, 0.25));
}

.dsh-wb-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: row;
}

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
  color: var(--dsw-alias-label-secondary, #656d76);
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
  color: var(--dsw-alias-label-secondary, #656d76);
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
  color: var(--dsw-alias-label-secondary, #656d76);
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
  color: var(--dsw-alias-label-secondary, #656d76);
  background: var(--dsw-specific-sidebar-fill, #eef0f3);
}
.dsh-wb-view { padding: 8px; }

/* Collapsed: only the activity bar remains (strip on the docked edge). */
.dsh-wb-root.wb-collapsed .dsh-wb-body { display: none; }
.dsh-wb-root.wb-collapsed[data-dock="left"],
.dsh-wb-root.wb-collapsed[data-dock="right"] { width: 48px; }
.dsh-wb-root.wb-collapsed[data-dock="top"],
.dsh-wb-root.wb-collapsed[data-dock="bottom"] { height: 44px; }

/* Context menu: follows the DSH theme tokens (layer-2 panel background,
   label text, interactive hover) like the official overlay components. */
.dsh-wb-menu {
  position: fixed;
  z-index: 1000;
  min-width: 160px;
  padding: 4px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  font-size: 13px;
  color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-wb-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-wb-menu-item:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.12));
}
.dsh-wb-menu-mark {
  width: 14px;
  text-align: center;
  color: var(--dsw-alias-label-secondary, #656d76);
}
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
