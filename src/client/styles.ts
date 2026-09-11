/**
 * Workbench shell styles, injected once by the client apply() as a
 * <style data-plugin="dock"> tag.
 *
 * Layout model: the workbench docks to one of four screen edges
 * (`body[data-dock]`). The shell is always `[activity][body]` in the
 * dock direction; `body` is `[sidebar][main]` (sidebar always on the left).
 * The base publishes the docked edge and a measured turn-rail offset when
 * enabled; feature plugins never touch global styles.
 */
const CSS = `
/* ── Floating windows: independent draggable/resizable view windows. They
   must stay interactive even inside the dock root, which is
   pointer-events:none (the floating panel and context menu needed the same
   restoration). ── */
.dsh-wb-floating {
  position: fixed;
  z-index: 70;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 240px;
  min-height: 160px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}
.dsh-wb-floating-head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  flex: none;
  padding: 0 6px;
  cursor: move;
  user-select: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1f2328);
  /* Distinct from the editor's own toolbar: stronger tint + grip hint. */
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.12));
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
/* Visual grip affordance: three dots at the left of the window bar. */
.dsh-wb-floating-head::before {
  content: '⠿';
  color: var(--dsw-alias-label-secondary, #656d76);
  font-size: 11px;
  margin-right: 2px;
}
.dsh-wb-floating-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-wb-floating-close {
  border: 0;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.75;
  padding: 2px 8px;
  font-size: 13px;
}
.dsh-wb-floating-close:hover { opacity: 1; background: rgba(209, 36, 47, 0.18); }
.dsh-wb-floating-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
/* Resize grips: eight edge/corner handles (n/s/e/w + corners) so a window
   can be resized from any side, each with the matching resize cursor. The
   base class makes every grip absolute; the edge modifier positions it and
   picks the cursor. Grip hit areas are thin (6px) so they do not cover the
   window content; corners are 12px for an easier grab. */
.dsh-wb-floating-resize { position: absolute; z-index: 2; }
.dsh-wb-resize-n { top: 0; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.dsh-wb-resize-s { bottom: 0; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.dsh-wb-resize-e { right: 0; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.dsh-wb-resize-w { left: 0; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.dsh-wb-resize-ne { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.dsh-wb-resize-nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.dsh-wb-resize-se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.dsh-wb-resize-sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }

/* Shift only Harness's turn rail. Its inline frame variable is the stable
   marker of the TurnNavigator; the rest of the page keeps its native width. */
body[data-dock="right"] nav[style*="--turn-natural-height"] {
  right: calc(
    12px + var(--dock-turn-rail-offset, 0px)
    - (var(--dsh-composer-side-clearance) + 16px)
  );
}

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
  width: var(--dock-size, 720px);
}
.dsh-wb-root[data-dock="left"]  { left: 0; border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-root[data-dock="right"] { right: 0; border-left: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-root[data-dock="top"],
.dsh-wb-root[data-dock="bottom"] {
  left: 0;
  right: 0;
  flex-direction: column;
  height: var(--dock-size, 480px);
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

/* Editor area sits toward the screen center; the side bar hugs the outer
   (screen-edge) side. Right dock: main left, sidebar right; left dock keeps
   the classic sidebar-left layout (main toward the app shell = the middle). */
.dsh-wb-root[data-dock="right"] .dsh-wb-main { order: 1; }
.dsh-wb-root[data-dock="right"] .dsh-wb-sidebar { order: 2; border-right: 0; border-left: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }

.dsh-wb-sidebar {
  width: 240px;
  flex: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  padding: 6px 0;
}
.dsh-wb-sidebar-header {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 4px 12px;
  box-sizing: border-box;
  flex: none;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-secondary, #656d76);
}
.dsh-wb-sidebar-title { flex: 1; min-width: 0; }
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

/* Settings dialog is outside the auto-hide root so it remains visible and interactive. */
.dsh-wb-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.dsh-wb-settings {
  width: min(560px, calc(100vw - 32px));
  max-height: min(680px, calc(100vh - 32px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}
.dsh-wb-settings-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
.dsh-wb-settings-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-wb-settings-close {
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 3px 8px;
}
.dsh-wb-settings-close:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.12)); }
.dsh-wb-settings-page {
  overflow-y: auto;
  min-height: 0;
  padding: 4px 16px 16px;
  animation: dsh-wb-settings-page-in 180ms ease both;
}
@keyframes dsh-wb-settings-page-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
.dsh-wb-settings-page-list { animation-name: dsh-wb-settings-page-list-in; }
@keyframes dsh-wb-settings-page-list-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
.dsh-wb-settings-general h3, .dsh-wb-settings-plugins h3 { margin: 10px 0 6px; font-size: 13px; }
.dsh-wb-settings-tabs { display: flex; gap: 4px; margin-bottom: 6px; border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-settings-tab { border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary, #656d76); padding: 7px 12px; cursor: pointer; }
.dsh-wb-settings-tab.active { color: inherit; border-bottom-color: var(--dsw-alias-border-accent, #4f6ef2); }
.dsh-wb-plugin-card { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 44px; padding: 6px 10px; border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0); }
.dsh-wb-plugin-card.is-clickable { cursor: pointer; }
.dsh-wb-plugin-card.is-clickable:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
.dsh-wb-plugin-icon { flex: none; width: 24px; height: 24px; display: grid; place-items: center; color: var(--dsw-alias-label-secondary, #656d76); }
.dsh-wb-plugin-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dsh-wb-plugin-copy small { color: var(--dsw-alias-label-secondary, #656d76); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-wb-plugin-actions { flex: none; display: flex; align-items: center; gap: 8px; }
.dsh-wb-plugin-chevron { flex: none; width: 12px; text-align: center; font-size: 18px; line-height: 1; color: var(--dsw-alias-label-secondary, #656d76); }
.dsh-wb-plugin-open { border: 1px solid var(--dsw-alias-border-l2, #d8dbe0); border-radius: 6px; background: transparent; color: inherit; cursor: pointer; font-size: 12px; padding: 3px 9px; }
.dsh-wb-plugin-open:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.14)); }
.dsh-wb-plugin-switch { flex: none; width: 34px; height: 20px; padding: 2px; border: 0; border-radius: 12px; background: var(--dsw-alias-border-l2, #d8dbe0); cursor: pointer; }
.dsh-wb-plugin-switch span { display: block; width: 16px; height: 16px; border-radius: 50%; background: white; transition: transform .18s ease; }
.dsh-wb-plugin-switch.on { background: var(--dsw-alias-border-accent, #4f6ef2); }
.dsh-wb-plugin-switch.on span { transform: translateX(14px); }
/* The same switch, for a dock-owned setting row. */
.dsh-wb-setting-switch { flex: none; width: 34px; height: 20px; padding: 2px; border: 0; border-radius: 12px; background: var(--dsw-alias-border-l2, #d8dbe0); cursor: pointer; }
.dsh-wb-setting-switch span { display: block; width: 16px; height: 16px; border-radius: 50%; background: white; transition: transform .18s ease; }
.dsh-wb-setting-switch.on { background: var(--dsw-alias-border-accent, #4f6ef2); }
.dsh-wb-setting-switch.on span { transform: translateX(14px); }
.dsh-wb-settings-back { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 25px; line-height: 1; padding: 0 4px; }
.dsh-wb-settings-body { padding: 4px 16px 16px; }
.dsh-wb-setting-row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  min-width: 0;
  padding: 14px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
}
.dsh-wb-setting-row:last-child { border-bottom: 0; }
.dsh-wb-setting-copy { flex: 1; min-width: 0; }
.dsh-wb-setting-title { overflow-wrap: anywhere; }
.dsh-wb-setting-description {
  margin-top: 3px;
  color: var(--dsw-alias-label-secondary, #656d76);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.dsh-wb-setting-control { flex: none; max-width: 100%; }
.dsh-wb-setting-checkbox { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.dsh-wb-setting-checkbox input { accent-color: var(--dsw-alias-border-accent, #4f6ef2); }
/* Shared segmented control any feature plugin may use for its own setting. */
.dsh-wb-setting-choices {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--dsw-alias-border-l2, #d8dbe0);
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .08));
}
.dsh-wb-setting-choice {
  border: 0;
  border-radius: 7px;
  padding: 6px 12px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #656d76);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.dsh-wb-setting-choice:hover { color: inherit; background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .14)); }
.dsh-wb-setting-choice.active { color: var(--dsw-alias-label-primary, #1f2328); background: var(--dsw-alias-bg-layer-2, #fff); box-shadow: 0 1px 4px rgba(0, 0, 0, .16); }
.dsh-wb-settings-empty {
  padding: 40px 16px;
  color: var(--dsw-alias-label-secondary, #656d76);
  text-align: center;
}

/* Settings refresh: clearer hierarchy, cards, focus states, and segmented controls. */
.dsh-wb-settings-overlay { background: rgba(15, 23, 42, .32); backdrop-filter: blur(3px); }
.dsh-wb-settings { width: min(620px, calc(100vw - 32px)); max-height: min(760px, calc(100vh - 32px)); border-radius: 16px; box-shadow: 0 20px 56px rgba(0, 0, 0, .3); }
.dsh-wb-settings-head { padding: 16px 20px; gap: 12px; }
.dsh-wb-settings-head h2 { font-size: 17px; line-height: 1.3; }
.dsh-wb-settings-page { padding: 12px 20px 20px; overflow-x: hidden; scrollbar-gutter: stable; }
.dsh-wb-settings-general, .dsh-wb-settings-plugins { min-width: 0; margin-bottom: 24px; }
.dsh-wb-settings-plugins:last-child { margin-bottom: 0; }
.dsh-wb-settings-general h3, .dsh-wb-settings-plugins h3 { margin: 0 0 10px; font-size: 15px; line-height: 1.35; color: var(--dsw-alias-label-primary, #1f2328); }
.dsh-wb-settings-tabs { gap: 4px; margin-bottom: 10px; padding: 3px; border: 1px solid var(--dsw-alias-border-l2, #d8dbe0); border-radius: 10px; background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .08)); }
.dsh-wb-settings-tab { flex: 1; border: 0; border-radius: 7px; padding: 7px 12px; font-size: 13px; }
.dsh-wb-settings-tab:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12)); }
.dsh-wb-settings-tab.active { background: var(--dsw-alias-bg-layer-2, #fff); box-shadow: 0 1px 4px rgba(0, 0, 0, .12); }
.dsh-wb-plugin-list { display: grid; gap: 6px; min-width: 0; }
.dsh-wb-plugin-card { min-width: 0; min-height: 42px; padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l2, #d8dbe0); border-radius: 10px; }
.dsh-wb-plugin-card.is-clickable:hover { border-color: var(--dsw-alias-border-accent, #4f6ef2); }
.dsh-wb-plugin-copy { gap: 1px; }
.dsh-wb-plugin-copy small { font-size: 11px; }
.dsh-wb-setting-row { gap: 20px; min-width: 0; padding: 12px 0; }
.dsh-wb-setting-title { font-size: 13px; }
.dsh-wb-setting-description { margin-top: 3px; }
.dsh-wb-position-switch { min-width: 260px; }
.dsh-wb-position-option { padding: 6px 10px; font-size: 12px; }
.dsh-wb-settings-close:focus-visible, .dsh-wb-settings-back:focus-visible, .dsh-wb-settings-tab:focus-visible, .dsh-wb-plugin-card:focus-visible, .dsh-wb-plugin-switch:focus-visible, .dsh-wb-plugin-open:focus-visible, .dsh-wb-setting-switch:focus-visible, .dsh-wb-setting-choice:focus-visible { outline: 2px solid var(--dsw-alias-border-accent, #4f6ef2); outline-offset: 2px; }
@media (max-width: 520px) {
  .dsh-wb-settings { width: calc(100vw - 20px); max-height: calc(100vh - 20px); }
  .dsh-wb-settings-page { padding-left: 14px; padding-right: 14px; }
  .dsh-wb-setting-row { flex-direction: column; gap: 10px; }
  .dsh-wb-setting-control, .dsh-wb-position-switch { width: 100%; min-width: 0; }
}

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

/* ── Dock mode (macOS-like): the activity bar floats as a frosted capsule;
   the side bar pops up as a floating panel next to the dock. ── */
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
   workbench; the hidden state fades out only the dock bar and the floating
   sidebar. Open floating windows are independent (rendered outside the dock
   root), so they neither fade nor participate in the reveal interaction. ── */
.dsh-wb-autohide-hotspot {
  position: fixed;
  z-index: 48;
  background: transparent;
}
.dsh-wb-autohide-hotspot[data-dock="left"] { left: 0; top: 0; bottom: 0; width: 4px; }
.dsh-wb-autohide-hotspot[data-dock="right"] { right: 0; top: 0; bottom: 0; width: 4px; }
.dsh-wb-autohide-hotspot[data-dock="top"] { top: 0; left: 0; right: 0; height: 4px; }
.dsh-wb-autohide-hotspot[data-dock="bottom"] { bottom: 0; left: 0; right: 0; height: 4px; }

/* Auto-hide keeps a small edge marker visible, then reveals the capsule with
   a short slide/scale animation. The sidebar still disappears completely
   because it is not the discoverability affordance. */
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity {
  transition: transform 0.42s cubic-bezier(.22, 1, .36, 1),
              opacity 0.28s ease;
}
.dsh-wb-root[data-mode="dock"] .dsh-wb-sidebar {
  transition: opacity 0.3s var(--ds-ease-out, ease-out),
              visibility 0s linear 0.3s;
}
.dsh-wb-root[data-mode="dock"].wb-autohidden .dsh-wb-activity {
  opacity: 0;
  pointer-events: none;
}
.dsh-wb-root[data-mode="dock"].wb-autohidden[data-dock="right"] .dsh-wb-activity {
  transform: translate(22px, -50%) scale(.88);
}
.dsh-wb-root[data-mode="dock"].wb-autohidden[data-dock="left"] .dsh-wb-activity {
  transform: translate(-22px, -50%) scale(.88);
}
.dsh-wb-root[data-mode="dock"].wb-autohidden[data-dock="top"] .dsh-wb-activity {
  transform: translate(-50%, -22px) scale(.88);
}
.dsh-wb-root[data-mode="dock"].wb-autohidden[data-dock="bottom"] .dsh-wb-activity {
  transform: translate(-50%, 22px) scale(.88);
}
.dsh-wb-root[data-mode="dock"].wb-autohidden .dsh-wb-sidebar {
  opacity: 0;
  visibility: hidden;
}

/* The hotspot is intentionally visible, so auto-hide never becomes a mystery
   state. Its pill grows on hover and remains the reveal target. */
.dsh-wb-autohide-hotspot::after {
  content: '';
  position: absolute;
  display: block;
  border-radius: 999px;
  background: var(--dsw-alias-brand-primary, #4f6ef2);
  box-shadow: 0 0 10px var(--dsw-alias-brand-primary, #4f6ef2);
  opacity: .58;
  transition: opacity .2s ease, transform .2s ease, width .2s ease, height .2s ease;
}
.dsh-wb-autohide-hotspot:hover::after { opacity: .95; }
.dsh-wb-autohide-hotspot[data-dock="left"]::after,
.dsh-wb-autohide-hotspot[data-dock="right"]::after {
  width: 3px;
  height: 52px;
  top: 50%;
  transform: translateY(-50%);
}
.dsh-wb-autohide-hotspot[data-dock="left"]::after { left: 0; }
.dsh-wb-autohide-hotspot[data-dock="right"]::after { right: 0; }
.dsh-wb-autohide-hotspot[data-dock="left"]:hover::after { transform: translate(2px, -50%); }
.dsh-wb-autohide-hotspot[data-dock="right"]:hover::after { transform: translate(-2px, -50%); }
.dsh-wb-autohide-hotspot[data-dock="top"]::after,
.dsh-wb-autohide-hotspot[data-dock="bottom"]::after {
  width: 52px;
  height: 3px;
  left: 50%;
  transform: translateX(-50%);
}
.dsh-wb-autohide-hotspot[data-dock="top"]::after { top: 0; }
.dsh-wb-autohide-hotspot[data-dock="bottom"]::after { bottom: 0; }
.dsh-wb-autohide-hotspot[data-dock="top"]:hover::after { transform: translate(-50%, 2px); }
.dsh-wb-autohide-hotspot[data-dock="bottom"]:hover::after { transform: translate(-50%, -2px); }
`

export function mountStyles(): () => void {
  const existing = document.querySelector('style[data-plugin="dock"]')
  if (existing !== null) existing.remove()
  const style = document.createElement('style')
  style.setAttribute('data-plugin', 'dock')
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
