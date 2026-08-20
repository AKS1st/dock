window.__ModuleLoader__.load({
	id: "dock",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom_client = require("react-dom/client");
		//#region src/client/layout.ts
		const DEFAULT_LAYOUT = {
			activity: null,
			sideBarOpen: true,
			editorTabs: [],
			activeEditorTab: null,
			dock: "right",
			autoHide: "off",
			activityOrder: [],
			absorbNative: false,
			floatingWindows: {}
		};
		const STORAGE_KEY = "dock:layout";
		const DOCKS = [
			"left",
			"right",
			"top",
			"bottom"
		];
		/**
		* Reorder an id list by moving `draggedId` to `targetId`'s position
		* (insert-before-target semantics). Pure and side-effect free so the drag
		* ordering logic is unit-testable. Unknown ids are left untouched.
		*/
		function reorderActivity(ids, draggedId, targetId) {
			const from = ids.indexOf(draggedId);
			const to = ids.indexOf(targetId);
			if (from === -1 || to === -1) return [...ids];
			const next = [...ids];
			next.splice(from, 1);
			next.splice(to, 0, draggedId);
			return next;
		}
		function loadPersisted(storage) {
			try {
				const raw = storage.getItem(STORAGE_KEY);
				if (raw === null) return null;
				const parsed = JSON.parse(raw);
				return {
					...DEFAULT_LAYOUT,
					...typeof parsed.activity === "string" || parsed.activity === null ? { activity: parsed.activity } : {},
					...typeof parsed.sideBarOpen === "boolean" ? { sideBarOpen: parsed.sideBarOpen } : {},
					...Array.isArray(parsed.editorTabs) ? (() => {
						const tabs = migrateEditorTabs(parsed.editorTabs, parsed.editorSeeds);
						let active = typeof parsed.activeEditorTab === "string" ? parsed.activeEditorTab : null;
						if (typeof active === "string" && !active.startsWith("vi:")) active = tabs.find((tab) => tab.viewId === active)?.instanceId ?? null;
						return {
							editorTabs: tabs,
							activeEditorTab: active
						};
					})() : {},
					...typeof parsed.dock === "string" && DOCKS.includes(parsed.dock) ? { dock: parsed.dock } : {},
					...parsed.autoHide === "edge" ? { autoHide: "edge" } : {},
					...Array.isArray(parsed.activityOrder) ? { activityOrder: parsed.activityOrder.filter((v) => typeof v === "string") } : {},
					...parsed.absorbNative === true ? { absorbNative: true } : {},
					...parsed.floatingWindows !== void 0 && parsed.floatingWindows !== null && typeof parsed.floatingWindows === "object" ? { floatingWindows: migrateFloatingWindows(parsed.floatingWindows) } : {}
				};
			} catch {
				return null;
			}
		}
		/** Migrate persisted editorTabs to the instance model: legacy string[]
		* (view ids) with a separate editorSeeds map becomes EditorTab[] with
		* generated instance ids. */
		function migrateEditorTabs(raw, seeds) {
			if (!Array.isArray(raw)) return [];
			if (raw.every((t) => typeof t === "string")) return raw.map((viewId, index) => ({
				instanceId: `vi:legacy:${index + 1}`,
				viewId,
				seed: seeds?.[viewId]
			}));
			return raw.filter((t) => typeof t === "object" && t !== null && typeof t.viewId === "string");
		}
		/** Migrate persisted floating windows to the instance model: legacy data was
		* keyed by viewId with no instanceId field — the new model keys by instanceId
		* and requires that field (close/move/resize all address windows by it).
		* Unknown or malformed entries are dropped. */
		function migrateFloatingWindows(raw) {
			const result = {};
			if (raw === null || typeof raw !== "object") return result;
			for (const value of Object.values(raw)) {
				if (value === null || typeof value !== "object") continue;
				const win = value;
				if (typeof win.viewId !== "string") continue;
				const instanceId = typeof win.instanceId === "string" ? win.instanceId : win.viewId;
				result[instanceId] = {
					instanceId,
					viewId: win.viewId,
					seed: win.seed,
					x: typeof win.x === "number" ? win.x : 120,
					y: typeof win.y === "number" ? win.y : 80,
					width: typeof win.width === "number" ? win.width : 520,
					height: typeof win.height === "number" ? win.height : 360
				};
			}
			return result;
		}
		function createLayoutStore(storage) {
			const backing = storage ?? (typeof window !== "undefined" ? window.localStorage : memoryStorage());
			const loaded = loadPersisted(backing);
			if (loaded !== null) try {
				backing.setItem(STORAGE_KEY, JSON.stringify(loaded));
			} catch {}
			let layout = loaded ?? DEFAULT_LAYOUT;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getLayout: () => layout,
				update(patch) {
					layout = {
						...layout,
						...patch
					};
					try {
						backing.setItem(STORAGE_KEY, JSON.stringify(layout));
					} catch {}
					for (const listener of [...listeners]) listener();
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				}
			};
		}
		/** Non-browser fallback so the store never throws outside a page. */
		function memoryStorage() {
			const map = /* @__PURE__ */ new Map();
			return {
				getItem: (key) => map.get(key) ?? null,
				setItem: (key, value) => {
					map.set(key, value);
				}
			};
		}
		//#endregion
		//#region src/client/service.ts
		/**
		* Merge a seed patch onto an existing seed. `patch.meta` is shallow-merged
		* into the current meta when both are plain objects (an editor writes its
		* dirty flag as `{ meta: { dirty: true } }` without knowing the rest of the
		* meta); every other patch field replaces its seed counterpart wholesale.
		*/
		function mergeSeed(seed, patch) {
			const base = seed ?? {};
			const meta = patch.meta === void 0 ? base.meta : typeof patch.meta === "object" && patch.meta !== null && typeof base.meta === "object" && base.meta !== null ? {
				...base.meta,
				...patch.meta
			} : patch.meta;
			return {
				...base,
				...patch,
				meta
			};
		}
		/** localStorage key for one view's remembered floating geometry. */
		const FLOATING_GEO_KEY = (viewId) => `dock:floating-geometry:${viewId}`;
		/** Read the remembered geometry for a view, or undefined when none is saved. */
		function rememberFloatingGeometry(viewId) {
			if (typeof window === "undefined" || window.localStorage === void 0) return void 0;
			try {
				const raw = window.localStorage.getItem(FLOATING_GEO_KEY(viewId));
				if (raw === null) return void 0;
				const parsed = JSON.parse(raw);
				if (typeof parsed.x === "number" && typeof parsed.y === "number" && typeof parsed.width === "number" && typeof parsed.height === "number" && Number.isFinite(parsed.x) && Number.isFinite(parsed.y) && parsed.width >= 240 && parsed.height >= 160) return {
					x: parsed.x,
					y: parsed.y,
					width: parsed.width,
					height: parsed.height
				};
			} catch {}
		}
		/** Remember a view's floating geometry in the browser. */
		function saveFloatingGeometry(viewId, geometry) {
			if (typeof window === "undefined" || window.localStorage === void 0) return;
			try {
				window.localStorage.setItem(FLOATING_GEO_KEY(viewId), JSON.stringify(geometry));
			} catch {}
		}
		/**
		* Clamp a floating-window rect so its title bar (the top
		* `FLOATING_HEAD_HEIGHT` strip, spanning the window width) stays fully
		* inside the viewport. The body may extend past the bottom edge, but the
		* head — with the move grip and the close button — is always reachable, so
		* a window can never be dragged into an uncontrollable position. No-op
		* outside a browser (no viewport to measure).
		*/
		function clampRect(x, y, width, height) {
			if (typeof window === "undefined") return {
				x,
				y
			};
			return {
				x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - width)),
				y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 34))
			};
		}
		function createWorkbenchService(store) {
			const activityItems = /* @__PURE__ */ new Map();
			const panels = /* @__PURE__ */ new Map();
			const editorViews = /* @__PURE__ */ new Map();
			const statusItems = /* @__PURE__ */ new Map();
			const commands = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of [...listeners]) listener();
			};
			const subscribe = (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			};
			const registerActivityBarItem = (def) => {
				if (activityItems.has(def.id)) throw new Error(`[dock] activity item "${def.id}" already registered`);
				activityItems.set(def.id, def);
				notify();
				return () => {
					if (activityItems.get(def.id) === def) {
						activityItems.delete(def.id);
						notify();
					}
				};
			};
			const registerPanel = (def) => {
				if (panels.has(def.id)) throw new Error(`[dock] panel "${def.id}" already registered`);
				panels.set(def.id, def);
				notify();
				return () => {
					if (panels.get(def.id) === def) {
						panels.delete(def.id);
						notify();
					}
				};
			};
			const registerEditorView = (def) => {
				if (editorViews.has(def.id)) throw new Error(`[dock] editor view "${def.id}" already registered`);
				editorViews.set(def.id, def);
				notify();
				return () => {
					if (editorViews.get(def.id) === def) {
						editorViews.delete(def.id);
						notify();
					}
				};
			};
			const registerStatusBarItem = (def) => {
				if (statusItems.has(def.id)) throw new Error(`[dock] status item "${def.id}" already registered`);
				statusItems.set(def.id, def);
				notify();
				return () => {
					if (statusItems.get(def.id) === def) {
						statusItems.delete(def.id);
						notify();
					}
				};
			};
			const registerCommand = (def) => {
				if (commands.has(def.id)) throw new Error(`[dock] command "${def.id}" already registered`);
				commands.set(def.id, def);
				notify();
				return () => {
					if (commands.get(def.id) === def) {
						commands.delete(def.id);
						notify();
					}
				};
			};
			const executeCommand = async (id, ...args) => {
				const command = commands.get(id);
				if (command === void 0) {
					console.warn(`[dock] unknown command "${id}"`);
					return;
				}
				return command.run(...args);
			};
			let uidCounter = 0;
			const uid = () => `vi:${++uidCounter}`;
			/**
			* Evaluate the instance's view-defined `beforeClose` gate. No hook → the
			* gate is trivially allowed; a synchronous `false` cancels; a synchronous
			* `true`/`undefined` allows; a promise defers the decision to its
			* resolution (any non-`false` value allows). Shared by `closeViewInstance`
			* and `openView` so replacing an instance's content (switching files) is
			* gated exactly like closing it — a dirty editor must confirm before its
			* content is discarded.
			*/
			const evaluateBeforeClose = (entry) => {
				const beforeClose = editorViews.get(entry.viewId)?.beforeClose;
				if (beforeClose === void 0) return { kind: "allowed" };
				const verdict = beforeClose(entry);
				if (typeof verdict === "object" && verdict !== null && typeof verdict.then === "function") return {
					kind: "pending",
					then(onAllow) {
						verdict.then((allow) => {
							if (allow !== false) onAllow();
						});
					}
				};
				return verdict === false ? { kind: "cancelled" } : { kind: "allowed" };
			};
			const openView = (viewId, seed, options) => {
				const current = store.getLayout();
				if (options?.floating === true) {
					const existingEntry = Object.entries(current.floatingWindows).find(([, win]) => win.viewId === viewId);
					if (existingEntry !== void 0) {
						const [instanceId, win] = existingEntry;
						if (seed !== void 0) {
							const gate = evaluateBeforeClose(win);
							if (gate.kind === "cancelled") return instanceId;
							if (gate.kind === "pending") {
								gate.then(() => replaceFloatingSeed(instanceId, seed));
								return instanceId;
							}
							replaceFloatingSeed(instanceId, seed);
						}
						return instanceId;
					}
					const instanceId = uid();
					const remembered = rememberFloatingGeometry(viewId);
					const width = remembered?.width ?? 520;
					const height = remembered?.height ?? 360;
					const { x, y } = clampRect(remembered?.x ?? 120, remembered?.y ?? 80, width, height);
					store.update({ floatingWindows: {
						...current.floatingWindows,
						[instanceId]: {
							instanceId,
							viewId,
							seed,
							x,
							y,
							width,
							height
						}
					} });
					return instanceId;
				}
				const existing = current.editorTabs.find((tab) => tab.viewId === viewId);
				if (existing !== void 0) {
					if (seed !== void 0) {
						const gate = evaluateBeforeClose(existing);
						if (gate.kind === "cancelled") return existing.instanceId;
						if (gate.kind === "pending") {
							gate.then(() => replaceTabSeed(existing.instanceId, seed));
							return existing.instanceId;
						}
						replaceTabSeed(existing.instanceId, seed);
					} else store.update({ activeEditorTab: existing.instanceId });
					return existing.instanceId;
				}
				const instanceId = uid();
				store.update({
					editorTabs: [...current.editorTabs, {
						instanceId,
						viewId,
						seed
					}],
					activeEditorTab: instanceId
				});
				return instanceId;
			};
			/** Replace a floating window's seed. Re-reads the layout so a deferred
			*  (async gate) application is safe; unknown ids are a no-op. */
			const replaceFloatingSeed = (instanceId, seed) => {
				const current = store.getLayout();
				const win = current.floatingWindows[instanceId];
				if (win === void 0) return;
				store.update({ floatingWindows: {
					...current.floatingWindows,
					[instanceId]: {
						...win,
						seed
					}
				} });
			};
			/** Replace an editor tab's seed and activate it. Re-reads the layout so a
			*  deferred (async gate) application is safe; unknown ids are a no-op. */
			const replaceTabSeed = (instanceId, seed) => {
				const current = store.getLayout();
				const tabs = current.editorTabs.map((tab) => tab.instanceId === instanceId ? {
					...tab,
					seed
				} : tab);
				if (tabs.every((tab, index) => tab === current.editorTabs[index])) return;
				store.update({
					editorTabs: tabs,
					activeEditorTab: instanceId
				});
			};
			/**
			* Close one view instance (tab or floating window). Before touching the
			* layout the instance's view definition is consulted: a registered
			* `beforeClose` hook receives `{ viewId, instanceId, seed }` and may
			* cancel the close by returning `false` (or a promise resolving to
			* `false`). The call is fire-and-forget — with an async hook the layout
			* stays open until the verdict resolves, then the close is performed on
			* approval. Unknown instance ids are a no-op.
			*/
			const closeViewInstance = (instanceId) => {
				const current = store.getLayout();
				const tab = current.editorTabs.find((entry) => entry.instanceId === instanceId);
				const win = current.floatingWindows[instanceId];
				const entry = tab ?? win;
				if (entry === void 0) return;
				const gate = evaluateBeforeClose(entry);
				if (gate.kind === "cancelled") return;
				if (gate.kind === "pending") {
					gate.then(() => performClose(instanceId));
					return;
				}
				performClose(instanceId);
			};
			const performClose = (instanceId) => {
				const current = store.getLayout();
				const editorTabs = current.editorTabs.filter((tab) => tab.instanceId !== instanceId);
				let activeEditorTab = current.activeEditorTab;
				if (activeEditorTab === instanceId) activeEditorTab = editorTabs.length > 0 ? editorTabs[editorTabs.length - 1].instanceId : null;
				const floatingWindows = { ...current.floatingWindows };
				delete floatingWindows[instanceId];
				store.update({
					editorTabs,
					activeEditorTab,
					floatingWindows
				});
			};
			/**
			* Patch one open instance's seed in place (editor tab or floating window;
			* unknown ids are a no-op). `patch.meta` is shallow-merged into the
			* instance's current meta when both are plain objects; other patch fields
			* replace their seed counterparts wholesale. Persisted with the layout, so
			* instance-level state (e.g. an editor's dirty flag) survives reloads.
			*/
			const updateViewSeed = (instanceId, patch) => {
				const current = store.getLayout();
				if (current.editorTabs.find((entry) => entry.instanceId === instanceId) !== void 0) {
					store.update({ editorTabs: current.editorTabs.map((entry) => entry.instanceId === instanceId ? {
						...entry,
						seed: mergeSeed(entry.seed, patch)
					} : entry) });
					return;
				}
				const win = current.floatingWindows[instanceId];
				if (win !== void 0) store.update({ floatingWindows: {
					...current.floatingWindows,
					[instanceId]: {
						...win,
						seed: mergeSeed(win.seed, patch)
					}
				} });
			};
			let openPathHandler;
			const registerOpenPathHandler = (handler) => {
				openPathHandler = handler;
				return () => {
					if (openPathHandler === handler) openPathHandler = void 0;
				};
			};
			const openPath = (path, options) => {
				if (openPathHandler !== void 0) {
					openPathHandler(path, options);
					return;
				}
				openView(options?.viewId ?? "editor", {
					path,
					title: options?.title
				});
			};
			const moveFloatingWindow = (instanceId, x, y) => {
				const current = store.getLayout();
				const win = current.floatingWindows[instanceId];
				if (win === void 0) return;
				const clamped = clampRect(x, y, win.width, win.height);
				store.update({ floatingWindows: {
					...current.floatingWindows,
					[instanceId]: {
						...win,
						x: clamped.x,
						y: clamped.y
					}
				} });
				saveFloatingGeometry(win.viewId, {
					x: clamped.x,
					y: clamped.y,
					width: win.width,
					height: win.height
				});
			};
			const resizeFloatingWindow = (instanceId, x, y, width, height) => {
				const current = store.getLayout();
				const win = current.floatingWindows[instanceId];
				if (win === void 0) return;
				const clamped = clampRect(x, y, width, height);
				store.update({ floatingWindows: {
					...current.floatingWindows,
					[instanceId]: {
						...win,
						x: clamped.x,
						y: clamped.y,
						width,
						height
					}
				} });
				saveFloatingGeometry(win.viewId, {
					x: clamped.x,
					y: clamped.y,
					width,
					height
				});
			};
			/** Pull every open floating window's title bar back into the viewport.
			*  Only touches windows that are actually out of bounds (viewport shrink,
			*  or geometry remembered on a larger screen); drags clamp live already. */
			const clampFloatingWindowsIntoView = () => {
				const current = store.getLayout();
				let changed = false;
				const floatingWindows = {};
				for (const [id, win] of Object.entries(current.floatingWindows)) {
					const clamped = clampRect(win.x, win.y, win.width, win.height);
					if (clamped.x !== win.x || clamped.y !== win.y) {
						floatingWindows[id] = {
							...win,
							x: clamped.x,
							y: clamped.y
						};
						changed = true;
					} else floatingWindows[id] = win;
				}
				if (!changed) return;
				store.update({ floatingWindows });
				for (const win of Object.values(floatingWindows)) saveFloatingGeometry(win.viewId, {
					x: win.x,
					y: win.y,
					width: win.width,
					height: win.height
				});
			};
			return {
				registerActivityBarItem,
				registerPanel,
				registerEditorView,
				registerStatusBarItem,
				registerCommand,
				executeCommand,
				getLayout: () => store.getLayout(),
				updateLayout: (patch) => store.update(patch),
				onDidChangeLayout: (listener) => store.subscribe(listener),
				openView,
				closeViewInstance,
				updateViewSeed,
				moveFloatingWindow,
				resizeFloatingWindow,
				clampFloatingWindowsIntoView,
				openPath,
				registerOpenPathHandler,
				getPanel: (id) => panels.get(id),
				getEditorView: (id) => editorViews.get(id),
				getActivityItem: (id) => activityItems.get(id),
				getPanels: () => Array.from(panels.values()),
				getEditorViews: () => Array.from(editorViews.values()),
				getActivityItems: () => Array.from(activityItems.values()),
				getStatusItems: () => Array.from(statusItems.values()),
				getCommands: () => Array.from(commands.values()),
				subscribe
			};
		}
		//#endregion
		//#region src/client/context-menu.tsx
		/**
		* Minimal context menu for the dock shell (right-click on the activity bar).
		* A single fixed-position popup with checkable items; closes on outside
		* mousedown, scroll, blur or Escape. Styles live in styles.ts (`.dsh-wb-menu*`)
		* so the menu follows the DSH theme tokens like the rest of the shell.
		*
		* The root stops mousedown propagation: the outside-close listener is
		* document-level, so without this an item's click would be swallowed by the
		* close-then-unmount sequence.
		*/
		function ContextMenu(props) {
			const { menu, onClose } = props;
			(0, react.useEffect)(() => {
				if (menu === null) return;
				const close = () => onClose();
				document.addEventListener("mousedown", close);
				document.addEventListener("scroll", close, true);
				window.addEventListener("blur", close);
				const onKey = (event) => {
					if (event.key === "Escape") close();
				};
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", close);
					document.removeEventListener("scroll", close, true);
					window.removeEventListener("blur", close);
					document.removeEventListener("keydown", onKey);
				};
			}, [menu, onClose]);
			if (menu === null) return null;
			const x = Math.min(menu.x, Math.max(0, window.innerWidth - 180));
			const y = Math.min(menu.y, Math.max(0, window.innerHeight - menu.items.length * 30 - 12));
			return (0, react.createElement)("div", {
				className: "dsh-wb-menu",
				role: "menu",
				style: {
					left: x,
					top: y
				},
				onMouseDown: (event) => event.stopPropagation()
			}, menu.items.map((item, index) => (0, react.createElement)("div", {
				key: `${item.label}-${index}`,
				className: "dsh-wb-menu-item",
				role: item.kind === "checkbox" ? "menuitemcheckbox" : "menuitemradio",
				"aria-checked": item.checked ?? false,
				onClick: (event) => {
					event.stopPropagation();
					item.onClick?.();
					onClose();
				}
			}, (0, react.createElement)("span", { className: "dsh-wb-menu-mark" }, item.kind === "checkbox" ? item.checked ? "✓" : " " : item.checked ? "●" : "○"), item.label)));
		}
		//#endregion
		//#region src/client/parts.tsx
		/**
		* Workbench shell components (Phase 1): activity bar / side bar / editor
		* area (tab strip) / bottom panel / status bar, rendered into a fixed
		* right-docked root. Written with React.createElement (no JSX) so the
		* client bundle needs no jsx-runtime handling.
		*
		* Rendering model: the shell reads registries and layout through
		* useSyncExternalStore (both are synchronous snapshots), so any
		* register/unregister or layout patch re-renders the affected parts.
		*/
		/** Sort helper shared by item lists. */
		function byOrder(a, b) {
			return (a.order ?? 100) - (b.order ?? 100);
		}
		/**
		* Render an IconRef: React nodes (emoji, custom components) render as-is;
		* IconSpec values render as an inline SVG `<path>` tinted with currentColor
		* so icons follow the active theme.
		*/
		function renderIcon(icon, size = 16) {
			if (icon === null || icon === void 0) return null;
			if (typeof icon === "object" && "path" in icon) {
				const spec = icon;
				return (0, react.createElement)("svg", {
					width: spec.size ?? size,
					height: spec.size ?? size,
					viewBox: spec.viewBox ?? "0 0 24 24",
					fill: spec.stroke ? "none" : "currentColor",
					stroke: spec.stroke ? "currentColor" : void 0,
					strokeWidth: spec.stroke ? 2 : void 0,
					strokeLinecap: spec.stroke ? "round" : void 0,
					strokeLinejoin: spec.stroke ? "round" : void 0,
					"aria-hidden": true
				}, (0, react.createElement)("path", { d: spec.path }));
			}
			return icon;
		}
		/**
		* Resolve a view component: a plain function component renders directly; a
		* zero-arg factory returning a Promise is wrapped in React.lazy (the
		* factory contract — components receive props, factories take none).
		*/
		function resolveViewComponent(def) {
			const component = def.component;
			if (component.length === 0) {
				const factory = component;
				return (0, react.lazy)(() => factory().then((resolved) => ({ default: resolved })));
			}
			return component;
		}
		function titleOf(def) {
			return typeof def.title === "function" ? def.title() : def.title;
		}
		function renderView(ctx, def, viewId, sessionId, active, seed) {
			const Component = resolveViewComponent(def);
			const props = {
				ctx,
				viewId,
				sessionId,
				active,
				seed
			};
			return (0, react.createElement)(react.Suspense, { fallback: (0, react.createElement)("div", { className: "dsh-wb-editor-empty" }, "Loading…") }, (0, react.createElement)(Component, props));
		}
		/** Module-level registry version: bumped on every registry change. */
		let registryVersion = 0;
		/** Docked edge labels for the position menu. */
		const DOCK_LABEL = {
			left: "左侧",
			right: "右侧",
			top: "顶部",
			bottom: "底部"
		};
		/** The whole workbench shell. */
		function WorkbenchRoot(props) {
			const { ctx, service, store } = props;
			const layout = (0, react.useSyncExternalStore)(store.subscribe, store.getLayout);
			const registry = (0, react.useSyncExternalStore)((onChange) => service.subscribe(() => {
				registryVersion += 1;
				onChange();
			}), () => registryVersion);
			const [menu, setMenu] = (0, react.useState)(null);
			const autoHide = layout.autoHide === "edge";
			const [autoHidden, setAutoHidden] = (0, react.useState)(false);
			const hideTimer = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
			}, []);
			const activityItems = (0, react.useMemo)(() => {
				const all = [...service.getActivityItems()].sort(byOrder);
				const byId = new Map(all.map((item) => [item.id, item]));
				const userOrdered = layout.activityOrder.map((id) => byId.get(id)).filter((item) => item !== void 0);
				const rest = all.filter((item) => !layout.activityOrder.includes(item.id));
				return [...userOrdered, ...rest];
			}, [
				registry,
				service,
				layout.activityOrder
			]);
			const panels = (0, react.useMemo)(() => [...service.getPanels()].sort(byOrder), [registry, service]);
			const editorViews = (0, react.useMemo)(() => [...service.getEditorViews()].sort(byOrder), [registry, service]);
			const statusItems = (0, react.useMemo)(() => [...service.getStatusItems()].sort(byOrder), [registry, service]);
			const sessionId = useSessionId(ctx);
			const collapsed = layout.activity === null;
			const absorbNative = layout.absorbNative === true;
			const activeActivity = layout.activity === null ? void 0 : service.getActivityItem(layout.activity);
			const activePane = activeActivity === void 0 || !layout.sideBarOpen ? void 0 : panels.find((panel) => panel.id === activeActivity.paneId && panel.region === "sideBar");
			const openDockMenu = (x, y) => {
				const items = [
					...[
						"left",
						"right",
						"top",
						"bottom"
					].map((dock) => ({
						label: `停靠到${DOCK_LABEL[dock]}`,
						checked: layout.dock === dock,
						onClick: () => store.update({ dock })
					})),
					{
						label: "自动隐藏（鼠标远离收起）",
						kind: "checkbox",
						checked: autoHide,
						onClick: () => store.update({ autoHide: autoHide ? "off" : "edge" })
					},
					{
						label: "吸收 DSH 原生界面",
						kind: "checkbox",
						checked: absorbNative,
						onClick: () => store.update({ absorbNative: !absorbNative })
					}
				];
				setMenu({
					x,
					y,
					items
				});
			};
			const reveal = () => {
				if (hideTimer.current !== null) {
					window.clearTimeout(hideTimer.current);
					hideTimer.current = null;
				}
				setAutoHidden(false);
			};
			const scheduleHide = () => {
				if (!autoHide) return;
				if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
				hideTimer.current = window.setTimeout(() => setAutoHidden(true), 900);
			};
			const rootClass = [
				"dsh-wb-root",
				collapsed ? "wb-collapsed" : void 0,
				autoHidden ? "wb-autohidden" : void 0
			].filter(Boolean).join(" ");
			const rootMountRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!absorbNative) return;
				const rootEl = document.getElementById("root");
				const mount = rootMountRef.current;
				if (rootEl !== null && mount !== null && rootEl.parentElement !== mount) mount.appendChild(rootEl);
				return () => {
					const el = document.getElementById("root");
					if (el !== null && mount !== null && el.parentElement === mount) document.body.appendChild(el);
				};
			}, [absorbNative]);
			return (0, react.createElement)(react.Fragment, null, (0, react.createElement)("div", {
				className: absorbNative ? `${rootClass} wb-absorb` : rootClass,
				"data-dock-shell": "",
				"data-dock": layout.dock,
				"data-mode": "dock",
				onMouseEnter: reveal,
				onMouseLeave: scheduleHide
			}, (0, react.createElement)(ActivityBar, {
				items: activityItems,
				activeId: layout.activity,
				dockMode: true,
				onActivate: (id) => {
					store.update(layout.activity === id ? { activity: null } : {
						activity: id,
						sideBarOpen: true
					});
				},
				onContextMenu: (x, y) => openDockMenu(x, y),
				onReorder: (draggedId, targetId) => {
					const next = reorderActivity(activityItems.map((item) => item.id), draggedId, targetId);
					store.update({ activityOrder: next });
				}
			}), (0, react.createElement)("div", { className: "dsh-wb-body" }, activePane !== void 0 && !collapsed ? (0, react.createElement)("div", { className: "dsh-wb-sidebar" }, (0, react.createElement)("div", { className: "dsh-wb-sidebar-header" }, titleOf(activePane)), renderView(ctx, activePane, activePane.id, sessionId, layout.activity === activeActivity?.id)) : null, absorbNative ? (0, react.createElement)("div", {
				className: "dsh-wb-main dsh-wb-absorb-main",
				ref: rootMountRef
			}) : layout.editorTabs.length > 0 ? (0, react.createElement)("div", { className: "dsh-wb-main" }, (0, react.createElement)(EditorArea, {
				ctx,
				service,
				store,
				tabs: layout.editorTabs,
				activeTab: layout.activeEditorTab,
				views: editorViews,
				sessionId
			}), (0, react.createElement)(StatusBar, {
				items: statusItems,
				ctx
			})) : null), (0, react.createElement)(ContextMenu, {
				menu,
				onClose: () => setMenu(null)
			}), (0, react.createElement)(FloatingWindows, {
				ctx,
				service,
				layout,
				sessionId,
				views: editorViews
			})), autoHide ? (0, react.createElement)("div", {
				className: "dsh-wb-autohide-hotspot",
				"data-dock": layout.dock,
				onMouseEnter: reveal,
				onMouseLeave: scheduleHide
			}) : null);
		}
		/**
		* The eight resize grips: the shared base class
		* (`dsh-wb-floating-resize`) plus an edge modifier class that positions the
		* grip and sets the resize cursor. 'w'/'n' drags also move the window so
		* the opposite edge stays anchored (handled in the drag math).
		*/
		const RESIZE_HANDLES = [
			{
				edge: "n",
				className: "dsh-wb-resize-n"
			},
			{
				edge: "s",
				className: "dsh-wb-resize-s"
			},
			{
				edge: "e",
				className: "dsh-wb-resize-e"
			},
			{
				edge: "w",
				className: "dsh-wb-resize-w"
			},
			{
				edge: "ne",
				className: "dsh-wb-resize-ne"
			},
			{
				edge: "nw",
				className: "dsh-wb-resize-nw"
			},
			{
				edge: "se",
				className: "dsh-wb-resize-se"
			},
			{
				edge: "sw",
				className: "dsh-wb-resize-sw"
			}
		];
		/** Independent floating windows (view + geometry), draggable/resizable. */
		function FloatingWindows(props) {
			const { ctx, service, layout, sessionId, views } = props;
			const viewById = (0, react.useMemo)(() => new Map(views.map((view) => [view.id, view])), [views]);
			const dragRef = (0, react.useRef)(null);
			const [dragging, setDragging] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!dragging) return;
				const onMove = (event) => {
					const drag = dragRef.current;
					if (drag === null) return;
					const dx = event.clientX - drag.startX;
					const dy = event.clientY - drag.startY;
					if (drag.mode === "move") {
						service.moveFloatingWindow(drag.id, drag.x + dx, drag.y + dy);
						return;
					}
					let x = drag.x;
					let y = drag.y;
					let width = drag.width;
					let height = drag.height;
					if (drag.mode.includes("e")) width = Math.max(240, drag.width + dx);
					if (drag.mode.includes("s")) height = Math.max(160, drag.height + dy);
					if (drag.mode.includes("w")) {
						width = Math.max(240, drag.width - dx);
						x = drag.x + drag.width - width;
					}
					if (drag.mode.includes("n")) {
						height = Math.max(160, drag.height - dy);
						y = drag.y + drag.height - height;
					}
					service.resizeFloatingWindow(drag.id, x, y, width, height);
				};
				const onUp = () => {
					dragRef.current = null;
					setDragging(false);
				};
				document.addEventListener("mousemove", onMove);
				document.addEventListener("mouseup", onUp);
				return () => {
					document.removeEventListener("mousemove", onMove);
					document.removeEventListener("mouseup", onUp);
				};
			}, [dragging, service]);
			(0, react.useEffect)(() => {
				const onViewportResize = () => service.clampFloatingWindowsIntoView();
				window.addEventListener("resize", onViewportResize);
				onViewportResize();
				return () => window.removeEventListener("resize", onViewportResize);
			}, [service]);
			const startDrag = (win, mode, event) => {
				event.preventDefault();
				dragRef.current = {
					id: windowKey(win),
					mode,
					startX: event.clientX,
					startY: event.clientY,
					...win
				};
				setDragging(true);
			};
			return (0, react.createElement)(react.Fragment, null, Object.values(layout.floatingWindows).map((win) => {
				const view = viewById.get(win.viewId);
				if (view === void 0) return null;
				const id = windowKey(win);
				const seedTitle = win.seed?.title;
				return (0, react.createElement)("div", {
					key: id,
					className: "dsh-wb-floating",
					style: {
						left: win.x,
						top: win.y,
						width: win.width,
						height: win.height
					}
				}, (0, react.createElement)("div", {
					className: "dsh-wb-floating-head",
					onMouseDown: (event) => startDrag(win, "move", event)
				}, view.icon !== void 0 ? renderIcon(view.icon, 13) : null, (0, react.createElement)("span", { className: "dsh-wb-floating-title" }, seedTitle ?? titleOf(view)), (0, react.createElement)("button", {
					className: "dsh-wb-floating-close",
					title: "Close",
					onClick: () => service.closeViewInstance(id)
				}, "×")), (0, react.createElement)("div", { className: "dsh-wb-floating-body" }, renderView(ctx, view, view.id, sessionId, true, win.seed)), RESIZE_HANDLES.map((handle) => (0, react.createElement)("div", {
					key: handle.edge,
					className: `dsh-wb-floating-resize ${handle.className}`,
					onMouseDown: (event) => startDrag(win, handle.edge, event)
				})));
			}));
		}
		/** Stable key of a floating window: the instance id. */
		function windowKey(win) {
			return win.instanceId;
		}
		function ActivityBar(props) {
			const { items, activeId, dockMode, onActivate, onContextMenu, onReorder } = props;
			const [draggingId, setDraggingId] = (0, react.useState)(null);
			const [overId, setOverId] = (0, react.useState)(null);
			const [hoverIndex, setHoverIndex] = (0, react.useState)(null);
			return (0, react.createElement)("div", {
				className: "dsh-wb-activity",
				onContextMenu: (event) => {
					event.preventDefault();
					onContextMenu(event.clientX, event.clientY);
				}
			}, items.map((item, index) => (0, react.createElement)("button", {
				key: item.id,
				className: [
					activeId === item.id ? "active" : void 0,
					draggingId === item.id ? "dragging" : void 0,
					overId === item.id ? "drag-over" : void 0,
					dockMode && hoverIndex === index ? "dock-hover" : void 0,
					dockMode && hoverIndex !== null && Math.abs(hoverIndex - index) === 1 ? "dock-near" : void 0
				].filter(Boolean).join(" ") || void 0,
				title: item.title,
				draggable: true,
				onClick: () => onActivate(item.id),
				onMouseEnter: () => {
					if (dockMode) setHoverIndex(index);
				},
				onMouseLeave: () => {
					if (dockMode) setHoverIndex(null);
				},
				onDragStart: (event) => {
					setDraggingId(item.id);
					event.dataTransfer?.setData("text/plain", item.id);
					event.dataTransfer.effectAllowed = "move";
				},
				onDragEnd: () => {
					setDraggingId(null);
					setOverId(null);
				},
				onDragOver: (event) => {
					event.preventDefault();
					if (draggingId !== null && draggingId !== item.id) setOverId(item.id);
				},
				onDragLeave: () => {
					if (overId === item.id) setOverId(null);
				},
				onDrop: (event) => {
					event.preventDefault();
					const dragged = draggingId ?? event.dataTransfer?.getData("text/plain");
					if (dragged !== void 0 && dragged !== item.id) onReorder(dragged, item.id);
					setDraggingId(null);
					setOverId(null);
				}
			}, renderIcon(item.icon, 18))));
		}
		function EditorArea(props) {
			const { ctx, service, store, tabs, activeTab, views, sessionId } = props;
			const viewById = (0, react.useMemo)(() => new Map(views.map((view) => [view.id, view])), [views]);
			const activeTabEntry = activeTab === null ? void 0 : tabs.find((tab) => tab.instanceId === activeTab);
			const activeView = activeTabEntry === void 0 ? void 0 : viewById.get(activeTabEntry.viewId);
			return (0, react.createElement)("div", { className: "dsh-wb-editor" }, tabs.length > 0 ? (0, react.createElement)("div", { className: "dsh-wb-tabs" }, tabs.map((tab) => {
				const view = viewById.get(tab.viewId);
				if (view === void 0) return null;
				const seedTitle = tab.seed?.title;
				return (0, react.createElement)("div", {
					key: tab.instanceId,
					className: `dsh-wb-tab${activeTab === tab.instanceId ? " active" : ""}`,
					onClick: () => store.update({ activeEditorTab: tab.instanceId })
				}, view.icon !== void 0 ? renderIcon(view.icon, 14) : null, seedTitle ?? titleOf(view), (0, react.createElement)("button", {
					className: "dsh-wb-tab-close",
					title: "Close",
					onClick: (event) => {
						event.stopPropagation();
						service.closeViewInstance(tab.instanceId);
					}
				}, "×"));
			})) : null, activeView !== void 0 && activeTabEntry !== void 0 ? renderView(ctx, activeView, activeView.id, sessionId, true, activeTabEntry.seed) : null);
		}
		function StatusBar(props) {
			const { items, ctx } = props;
			return (0, react.createElement)("div", { className: "dsh-wb-statusbar" }, items.map((item) => (0, react.createElement)("span", { key: item.id }, (0, react.createElement)(item.component, { ctx }))));
		}
		/**
		* Live active-session id: subscribes to the sessions list (same pattern as
		* the community sidebar), so switching the workspace/conversation re-renders
		* and every view keyed on sessionId reloads against the new working
		* directory. Returns undefined when the sessions service is absent.
		*/
		function useSessionId(ctx) {
			const sessions = ctx.get("sessions");
			return (0, react.useSyncExternalStore)((cb) => sessions?.list?.subscribe(cb) ?? (() => {}), () => sessions?.list?.getSnapshot().current);
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* Workbench shell styles, injected once by the client apply() as a
		* <style data-plugin="dock"> tag.
		*
		* Layout model: the workbench docks to one of four screen edges
		* (`body[data-dock]`). The shell is always `[activity][body]` in the
		* dock direction; `body` is `[sidebar][main]` (sidebar always on the left).
		* The DSH app shell (#root) gives up the occupied size through the
		* --dock-size CSS variable (layout push), exactly one global mutation owned
		* by the base — feature plugins never touch global styles.
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

/* Layout push: #root yields the docked size on the docked edge. Horizontal
   docks shrink #root's width via margins; vertical docks compress its fixed
   height (height:100%) via padding with an explicit border-box so the app
   shell content is never overlapped and no scrollbar appears. */
#root {
  margin-right: var(--dock-size, 0px);
  transition: margin-right 0.18s var(--ds-ease-in-out, ease),
              margin-left 0.18s var(--ds-ease-in-out, ease),
              padding-top 0.18s var(--ds-ease-in-out, ease),
              padding-bottom 0.18s var(--ds-ease-in-out, ease);
}
body[data-dock="left"] #root   { margin-right: 0; margin-left: var(--dock-size, 0px); }
body[data-dock="top"] #root,
body[data-dock="bottom"] #root { margin-right: 0; box-sizing: border-box; }
body[data-dock="top"] #root    { padding-top: var(--dock-size, 0px); }
body[data-dock="bottom"] #root { padding-bottom: var(--dock-size, 0px); }

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
   the workbench stops pushing the app shell (--dock-size is 0), the side
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
   workbench; the hidden state fades out the dock bar and floating sidebar
   (dock mode; the panel presentation was removed). ── */
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
`;
		function mountStyles() {
			const existing = document.querySelector("style[data-plugin=\"dock\"]");
			if (existing !== null) existing.remove();
			const style = document.createElement("style");
			style.setAttribute("data-plugin", "dock");
			style.textContent = CSS;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Client half of dock: publishes the `ctx.workbench` registry
		* service, then mounts the workbench shell as a fixed right-docked root on
		* document.body (the base owns this single portal; feature plugins never
		* touch the page layout). DSH's native UI stays untouched in Phase 1 —
		* absorbing it into the shell (session list → activity bar, chat →
		* editor area) is Phase 3 work.
		*/
		/** No runtime services required: the base only needs the cordis context. */
		const inject = [];
		/** Client plugin body. */
		function apply(ctx) {
			const store = createLayoutStore();
			const service = createWorkbenchService(store);
			ctx.provide("workbench", service);
			ctx.effect(() => {
				let root;
				let host;
				try {
					const unstyle = mountStyles();
					host = document.createElement("div");
					host.setAttribute("data-dock", "");
					document.body.appendChild(host);
					root = (0, react_dom_client.createRoot)(host);
					root.render((0, react.createElement)(WorkbenchRoot, {
						ctx,
						service,
						store
					}));
					return () => {
						root?.unmount();
						host?.remove();
						unstyle();
					};
				} catch (error) {
					console.error("[dock] mount error:", error);
					return () => {
						root?.unmount();
						host?.remove();
					};
				}
			}, "dock: shell mount");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map