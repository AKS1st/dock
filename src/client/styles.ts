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
/* Layout push: #root yields the docked size on the docked edge. Horizontal
   docks shrink #root's width via margins; vertical docks compress its fixed
   height (height:100%) via padding with an explicit border-box so the app
   shell content is never overlapped and no scrollbar appears. */
#root {
  margin-right: var(--desk-size, 0px);
  transition: margin-right 0.18s var(--ds-ease-in-out, ease),
              margin-left 0.18s var(--ds-ease-in-out, ease),
              padding-top 0.18s var(--ds-ease-in-out, ease),
              padding-bottom 0.18s var(--ds-ease-in-out, ease);
}
body[data-desk-dock="left"] #root   { margin-right: 0; margin-left: var(--desk-size, 0px); }
body[data-desk-dock="top"] #root,
body[data-desk-dock="bottom"] #root { margin-right: 0; box-sizing: border-box; }
body[data-desk-dock="top"] #root    { padding-top: var(--desk-size, 0px); }
body[data-desk-dock="bottom"] #root { padding-bottom: var(--desk-size, 0px); }

.dsh-wb-root {
  position: fixed;
  z-index: 49;
  display: flex;
  background: var(--dsw-specific-sidebar-fill, #f6f7f9);
  font: 13px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--dsw-alias-label-primary, #1f2328);
  transition: width 0.18s var(--ds-ease-in-out, ease),
              height 0.18s var(--ds-ease-in-out, ease),
              transform 0.3s var(--ds-ease-out, ease-out),
              opacity 0.3s var(--ds-ease-out, ease-out);
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
/* Dock mode: magnification is the only hover cue — no background tint on
   hover or on the active item (the scale conveys state). */
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button:hover,
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button.active { background: transparent; }
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
  /* Survives the dock root's pointer-events:none (dock mode). */
  pointer-events: auto;
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

/* ── Dock mode (macOS-like): the activity bar floats as a frosted capsule,
   the workbench stops pushing the app shell (--desk-size is 0), the side
   bar pops up as a floating panel next to the dock. ── */
.dsh-wb-root[data-mode="dock"] {
  background: transparent;
  border: 0;
  width: auto !important;
  height: auto !important;
  pointer-events: none;
}
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity {
  pointer-events: auto;
  position: fixed;
  z-index: 60;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
  padding: 6px;
  gap: 2px;
}
/* Centered on the docked edge; horizontal strip for top/bottom, vertical
   strip for left/right. */
.dsh-wb-root[data-mode="dock"][data-dock="bottom"] .dsh-wb-activity {
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  flex-direction: row;
  width: auto;
  height: auto;
}
.dsh-wb-root[data-mode="dock"][data-dock="top"] .dsh-wb-activity {
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  flex-direction: row;
  width: auto;
  height: auto;
}
.dsh-wb-root[data-mode="dock"][data-dock="left"] .dsh-wb-activity {
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  width: auto;
  height: auto;
}
.dsh-wb-root[data-mode="dock"][data-dock="right"] .dsh-wb-activity {
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  width: auto;
  height: auto;
}
/* Dock buttons: rounded capsule + magnification (fisheye) on hover. */
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button {
  border-radius: 10px;
  transition: transform 120ms ease;
}
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button.dock-hover { transform: scale(1.35); }
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button.dock-near { transform: scale(1.08); }
/* Dock mode hides the editor/panel area; the side bar becomes a floating
   panel next to the dock. */
.dsh-wb-root[data-mode="dock"] .dsh-wb-main { display: none; }
.dsh-wb-root[data-mode="dock"] .dsh-wb-sidebar {
  position: fixed;
  z-index: 59;
  /* The dock root is pointer-events:none; the floating panel must be
     interactive again (same for the context menu below). */
  pointer-events: auto;
  width: 300px;
  max-height: 70vh;
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
  background: var(--dsw-alias-bg-layer-2, #ffffff);
}
.dsh-wb-root[data-mode="dock"][data-dock="bottom"] .dsh-wb-sidebar {
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
}
.dsh-wb-root[data-mode="dock"][data-dock="top"] .dsh-wb-sidebar {
  left: 50%;
  top: 84px;
  transform: translateX(-50%);
}
.dsh-wb-root[data-mode="dock"][data-dock="left"] .dsh-wb-sidebar {
  left: 84px;
  top: 50%;
  transform: translateY(-50%);
}
.dsh-wb-root[data-mode="dock"][data-dock="right"] .dsh-wb-sidebar {
  right: 84px;
  top: 50%;
  transform: translateY(-50%);
}

/* ── Auto-hide (edge): a 4px hotspot strip on the docked edge revives the
   workbench; the hidden state slides the shell off-screen (panel mode) or
   hides the dock bar and floating panel (dock mode). ── */
.dsh-wb-autohide-hotspot {
  position: fixed;
  z-index: 48;
  background: transparent;
}
.dsh-wb-autohide-hotspot[data-dock="left"] { left: 0; top: 0; bottom: 0; width: 4px; }
.dsh-wb-autohide-hotspot[data-dock="right"] { right: 0; top: 0; bottom: 0; width: 4px; }
.dsh-wb-autohide-hotspot[data-dock="top"] { top: 0; left: 0; right: 0; height: 4px; }
.dsh-wb-autohide-hotspot[data-dock="bottom"] { bottom: 0; left: 0; right: 0; height: 4px; }

.dsh-wb-root.wb-autohidden { opacity: 0; }
.dsh-wb-root.wb-autohidden[data-mode="panel"][data-dock="right"] { transform: translateX(calc(100% + 1px)); }
.dsh-wb-root.wb-autohidden[data-mode="panel"][data-dock="left"] { transform: translateX(calc(-100% - 1px)); }
.dsh-wb-root.wb-autohidden[data-mode="panel"][data-dock="top"] { transform: translateY(calc(-100% - 1px)); }
.dsh-wb-root.wb-autohidden[data-mode="panel"][data-dock="bottom"] { transform: translateY(calc(100% + 1px)); }
/* Dock mode: the bar fades out (visibility flips after the fade completes
   so the opacity transition stays visible). */
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity,
.dsh-wb-root[data-mode="dock"] .dsh-wb-sidebar {
  transition: opacity 0.3s var(--ds-ease-out, ease-out),
              visibility 0s linear 0.3s;
}
.dsh-wb-root[data-mode="dock"].wb-autohidden .dsh-wb-activity,
.dsh-wb-root[data-mode="dock"].wb-autohidden .dsh-wb-sidebar {
  opacity: 0;
  visibility: hidden;
}

/* ── Absorb mode: the workbench takes over the full viewport and hosts the
   DSH app shell (#root) in the editor area — the harness UI becomes the
   base's default view. Fixed layout: activity | sidebar | main. ── */
.dsh-wb-root.wb-absorb {
  inset: 0;
  width: auto !important;
  height: auto !important;
  border: 0;
  flex-direction: row;
  background: var(--dsw-alias-bg-base, #ffffff);
}
.dsh-wb-root.wb-absorb .dsh-wb-activity {
  border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
.dsh-wb-root.wb-absorb .dsh-wb-main {
  background: var(--dsw-alias-bg-base, #ffffff);
  overflow: hidden;
}
/* The moved #root fills the editor area (height:100% relative to main). */
.dsh-wb-root.wb-absorb .dsh-wb-absorb-main > #root {
  height: 100%;
  width: 100%;
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
