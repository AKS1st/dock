window.__ModuleLoader__.load({
	id: "dock-base",
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
			const backing = storage ?? (typeof window !== "undefined" ? window.localStorage : memoryStorage$1());
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
		function memoryStorage$1() {
			const map = /* @__PURE__ */ new Map();
			return {
				getItem: (key) => map.get(key) ?? null,
				setItem: (key, value) => {
					map.set(key, value);
				}
			};
		}
		//#endregion
		//#region src/client/internal/localization.ts
		/** DSH's current UI locale: Chinese for zh-* languages, English otherwise. */
		function getDockLocale(language) {
			return (language ?? ((typeof document !== "undefined" ? document.documentElement.lang : "") || (typeof navigator !== "undefined" ? navigator.language : ""))).toLowerCase().startsWith("zh") ? "zh" : "en";
		}
		function isDockEnglish(language) {
			return getDockLocale(language) === "en";
		}
		const LABELS = {
			zh: {
				settings: "设置",
				close: "关闭设置",
				back: "返回设置",
				empty: "暂无可配置的设置",
				general: "通用设置",
				plugins: "插件",
				entry: "入口",
				other: "其它",
				showPlugin: "显示",
				openPlugin: "打开",
				dockSettings: "Dock 设置",
				hoverScale: "悬停图标放大",
				hoverScaleHint: "鼠标悬停时该图标的放大倍数（1.0–2.5×）。",
				nearScale: "相邻图标放大",
				nearScaleHint: "悬停图标两侧相邻项的放大倍数，不会超过悬停倍数（1.0–2.0×）。",
				dockPosition: "Dock 位置",
				autoHide: "自动隐藏",
				autoHideHint: "Dock 已隐藏，移到边缘可展开",
				left: "左侧",
				right: "右侧",
				top: "顶部",
				bottom: "底部",
				reserveSpace: "为 dock 预留空间",
				reserveSpaceHint: "在停靠侧空出一条边距，避免 dock 栏遮挡页面边缘的导航（例如会话进度导航栏）。",
				autoHideOn: "开启",
				autoHideOff: "关闭"
			},
			en: {
				settings: "Settings",
				close: "Close settings",
				back: "Back to settings",
				empty: "No configurable settings",
				general: "General settings",
				plugins: "Plugins",
				entry: "Entry",
				other: "Other",
				showPlugin: "Show",
				openPlugin: "Open",
				dockSettings: "Dock settings",
				hoverScale: "Hovered icon magnification",
				hoverScaleHint: "How much the hovered dock icon grows (1.0–2.5×).",
				nearScale: "Neighbour magnification",
				nearScaleHint: "How much the icons next to the hovered one grow; never more than the hovered icon (1.0–2.0×).",
				dockPosition: "Dock position",
				autoHide: "Auto-hide",
				autoHideHint: "Dock hidden; move to the edge to reveal",
				left: "Left",
				right: "Right",
				top: "Top",
				bottom: "Bottom",
				reserveSpace: "Reserve space for the dock",
				reserveSpaceHint: "Keeps a gutter on the docked edge so the dock bar never covers edge-hugging page chrome such as the conversation turn rail.",
				autoHideOn: "On",
				autoHideOff: "Off"
			}
		};
		function settingsLabels(locale) {
			return LABELS[locale];
		}
		function positionLabel(position, locale) {
			return LABELS[locale][position];
		}
		function autoHideLabel(enabled, locale) {
			return enabled ? LABELS[locale].autoHideOn : LABELS[locale].autoHideOff;
		}
		/**
		* Resolve a setting's display text. Definitions may declare a plain string or
		* a locale-aware factory, so feature plugins localize their own copy without
		* importing dock-base's internals.
		*/
		function resolveSettingText(text, locale) {
			if (text === void 0) return void 0;
			return typeof text === "function" ? text(locale) : text;
		}
		//#endregion
		//#region src/client/settings.ts
		/** Extensible, validated client settings persisted independently from layout. */
		const SETTINGS_STORAGE_KEY = "dock:settings";
		const DOCK_BASE_PLUGIN_ID = "dock-base";
		const DOCK_POSITION_SETTING_ID = "dock-base:position";
		const DOCK_AUTO_HIDE_SETTING_ID = "dock-base:auto-hide";
		const DOCK_RESERVE_SETTING_ID = "dock-base:reserve-space";
		const HIDDEN_PLUGINS_SETTING_ID = "dock-base:hidden-plugins";
		const DOCK_HOVER_SCALE_SETTING_ID = "dock-base:hover-scale";
		const DOCK_NEAR_SCALE_SETTING_ID = "dock-base:near-scale";
		/** Magnification applied to the icon under the cursor in dock mode. */
		const DOCK_HOVER_SCALE_DEFAULT = 1.6;
		/** Magnification applied to the two items flanking it. */
		const DOCK_NEAR_SCALE_DEFAULT = 1.2;
		/**
		* User-adjustable slider bounds for the dock's fisheye. The lower bound is 1
		* (hover never shrinks an icon) and the upper bounds stay below the point
		* where a magnified icon would swallow its neighbours. The stylesheet keeps
		* the same defaults as fallbacks, so it stays self-sufficient.
		*/
		const DOCK_HOVER_SCALE_RANGE = {
			min: 1,
			max: 2.5,
			step: .05
		};
		const DOCK_NEAR_SCALE_RANGE = {
			min: 1,
			max: 2,
			step: .05
		};
		/**
		* Dock-owned activity entry: it opens the settings window instead of a
		* side-bar pane (the dock cannot open itself *in* the dock), so it carries an
		* empty `paneId`.
		*/
		const DOCK_SETTINGS_ACTIVITY_ID = "dock-base:settings";
		/** Generic fallback icon owned by dock-base (internal shell detail). */
		const GENERIC_PLUGIN_ICON = {
			path: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
			stroke: true
		};
		/**
		* Dock's own icon: three entries resting on the dock bar. Distinct from the
		* generic 2×2 fallback so the dock reads as itself both in the activity bar
		* and in its own settings card.
		*/
		const DOCK_BASE_ICON = {
			path: "M5 8h4v4H5zM10 8h4v4h-4zM15 8h4v4h-4zM3 16h18",
			stroke: true
		};
		const DOCK_POSITIONS = [
			"left",
			"right",
			"top",
			"bottom"
		];
		const PositionSetting = ({ value, onChange, locale: activeLocale }) => {
			const locale = activeLocale ?? getDockLocale();
			return (0, react.createElement)("div", {
				className: "dsh-wb-setting-choices dsh-wb-position-switch",
				role: "radiogroup",
				"aria-label": settingsLabels(locale).dockPosition
			}, ...DOCK_POSITIONS.map((item) => (0, react.createElement)("button", {
				key: item,
				type: "button",
				role: "radio",
				"aria-checked": value === item,
				className: `dsh-wb-setting-choice dsh-wb-position-option${value === item ? " active" : ""}`,
				onClick: () => onChange(item)
			}, positionLabel(item, locale))));
		};
		const AutoHideSetting = ({ value, onChange, locale: activeLocale }) => {
			const locale = activeLocale ?? getDockLocale();
			return (0, react.createElement)("label", { className: "dsh-wb-setting-checkbox" }, (0, react.createElement)("input", {
				type: "checkbox",
				checked: value === "edge",
				onChange: (event) => onChange(event.target.checked ? "edge" : "off")
			}), autoHideLabel(value === "edge", locale));
		};
		const ReserveSpaceSetting = ({ value, onChange, locale: activeLocale }) => {
			const locale = activeLocale ?? getDockLocale();
			return (0, react.createElement)("button", {
				type: "button",
				role: "switch",
				"aria-checked": value,
				"aria-label": settingsLabels(locale).reserveSpace,
				className: `dsh-wb-setting-switch${value ? " on" : ""}`,
				onClick: () => onChange(!value)
			}, (0, react.createElement)("span"));
		};
		const noopComponent = (() => null);
		/** True only for a finite number inside the range (the setting's own guard). */
		function inScaleRange(value, range) {
			return typeof value === "number" && Number.isFinite(value) && value >= range.min && value <= range.max;
		}
		/**
		* Slider editor for one magnification factor. The knob never leaves the
		* declared range, the step is the persisted precision (so 0.05 steps cannot
		* accumulate float noise into the layout), and the live factor is printed
		* beside it because a bare slider gives no readout.
		*/
		function scaleSlider(range, label) {
			return ({ value, onChange, locale: activeLocale }) => {
				const locale = activeLocale ?? getDockLocale();
				const safe = inScaleRange(value, range) ? value : range.min;
				return (0, react.createElement)("div", { className: "dsh-wb-setting-slider" }, (0, react.createElement)("input", {
					type: "range",
					className: "dsh-wb-setting-range",
					min: range.min,
					max: range.max,
					step: range.step,
					value: safe,
					"aria-label": label(locale),
					onChange: (event) => {
						const next = Number.parseFloat(event.target.value);
						onChange(Number.isFinite(next) ? Math.round(next * 100) / 100 : range.min);
					}
				}), (0, react.createElement)("span", { className: "dsh-wb-setting-scale" }, `${Number(safe.toFixed(2))}×`));
			};
		}
		const DOCK_POSITION_SETTING = {
			pluginId: DOCK_BASE_PLUGIN_ID,
			id: DOCK_POSITION_SETTING_ID,
			title: (locale) => settingsLabels(locale).dockPosition,
			order: 0,
			defaultValue: "right",
			component: PositionSetting,
			validate: (value) => value === "left" || value === "right" || value === "top" || value === "bottom"
		};
		const DOCK_AUTO_HIDE_SETTING = {
			pluginId: DOCK_BASE_PLUGIN_ID,
			id: DOCK_AUTO_HIDE_SETTING_ID,
			title: (locale) => settingsLabels(locale).autoHide,
			order: 1,
			defaultValue: "off",
			component: AutoHideSetting,
			validate: (value) => value === "off" || value === "edge"
		};
		const DOCK_RESERVE_SETTING = {
			pluginId: DOCK_BASE_PLUGIN_ID,
			id: DOCK_RESERVE_SETTING_ID,
			title: (locale) => settingsLabels(locale).reserveSpace,
			description: (locale) => settingsLabels(locale).reserveSpaceHint,
			order: 2,
			defaultValue: true,
			component: ReserveSpaceSetting,
			validate: (value) => typeof value === "boolean"
		};
		const hoverScaleSlider = scaleSlider(DOCK_HOVER_SCALE_RANGE, (locale) => settingsLabels(locale).hoverScale);
		const nearScaleSlider = scaleSlider(DOCK_NEAR_SCALE_RANGE, (locale) => settingsLabels(locale).nearScale);
		const DOCK_HOVER_SCALE_SETTING = {
			pluginId: DOCK_BASE_PLUGIN_ID,
			id: DOCK_HOVER_SCALE_SETTING_ID,
			title: (locale) => settingsLabels(locale).hoverScale,
			description: (locale) => settingsLabels(locale).hoverScaleHint,
			order: 3,
			defaultValue: DOCK_HOVER_SCALE_DEFAULT,
			component: hoverScaleSlider,
			validate: (value) => inScaleRange(value, DOCK_HOVER_SCALE_RANGE)
		};
		const DOCK_NEAR_SCALE_SETTING = {
			pluginId: DOCK_BASE_PLUGIN_ID,
			id: DOCK_NEAR_SCALE_SETTING_ID,
			title: (locale) => settingsLabels(locale).nearScale,
			description: (locale) => settingsLabels(locale).nearScaleHint,
			order: 4,
			defaultValue: DOCK_NEAR_SCALE_DEFAULT,
			component: nearScaleSlider,
			validate: (value) => inScaleRange(value, DOCK_NEAR_SCALE_RANGE)
		};
		/** Internal bookkeeping row: never rendered (see getVisibleSettings), so it sorts last. */
		const HIDDEN_PLUGINS_SETTING = {
			pluginId: DOCK_BASE_PLUGIN_ID,
			id: HIDDEN_PLUGINS_SETTING_ID,
			title: "Hidden plugins",
			order: 90,
			defaultValue: [],
			component: noopComponent,
			validate: (value) => Array.isArray(value) && value.every((item) => typeof item === "string")
		};
		function memoryStorage() {
			const values = /* @__PURE__ */ new Map();
			return {
				getItem: (key) => values.get(key) ?? null,
				setItem: (key, value) => {
					values.set(key, value);
				}
			};
		}
		function resolveStorage(storage) {
			if (storage !== void 0) return storage;
			try {
				if (typeof window !== "undefined" && window.localStorage !== void 0) return window.localStorage;
			} catch {}
			return memoryStorage();
		}
		function createSettingsStore(storage) {
			const backing = resolveStorage(storage);
			let persisted = {};
			try {
				const raw = backing.getItem(SETTINGS_STORAGE_KEY);
				if (raw !== null) {
					const parsed = JSON.parse(raw);
					if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) persisted = parsed;
				}
			} catch {}
			const definitions = /* @__PURE__ */ new Map();
			const values = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			const persist = () => {
				const snapshot = { ...persisted };
				for (const [id, value] of values) snapshot[id] = value;
				const serialized = JSON.stringify(snapshot);
				if (serialized === void 0) throw new Error("[dock] settings value is not JSON-safe");
				persisted = snapshot;
				try {
					backing.setItem(SETTINGS_STORAGE_KEY, serialized);
				} catch {}
			};
			const assertJsonSafe = (value) => {
				const visiting = /* @__PURE__ */ new WeakSet();
				const visit = (candidate) => {
					if (candidate === null || typeof candidate === "boolean" || typeof candidate === "string") return;
					if (typeof candidate === "number") {
						if (Number.isFinite(candidate) && !Object.is(candidate, -0)) return;
						throw new TypeError();
					}
					if (typeof candidate !== "object") throw new TypeError();
					if (visiting.has(candidate)) throw new TypeError();
					const isArray = Array.isArray(candidate);
					const prototype = Object.getPrototypeOf(candidate);
					if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new TypeError();
					visiting.add(candidate);
					const keys = Reflect.ownKeys(candidate);
					if (isArray) {
						const array = candidate;
						if (keys.length !== array.length + 1 || !Object.prototype.hasOwnProperty.call(candidate, "length")) throw new TypeError();
						for (let index = 0; index < array.length; index++) if (!Object.prototype.hasOwnProperty.call(candidate, String(index))) throw new TypeError();
					}
					for (const key of keys) {
						if (typeof key === "symbol") throw new TypeError();
						if (isArray && key === "length") continue;
						const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
						if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError();
						visit(descriptor.value);
					}
					visiting.delete(candidate);
				};
				try {
					visit(value);
					const serialized = JSON.stringify(value);
					if (serialized === void 0 || JSON.parse(serialized) === void 0) throw new TypeError();
				} catch {
					throw new TypeError("[dock] setting value must be JSON-safe");
				}
			};
			const cloneJsonSafe = (value) => {
				assertJsonSafe(value);
				return JSON.parse(JSON.stringify(value));
			};
			const notify = () => {
				for (const listener of [...listeners]) listener();
			};
			return {
				register(definition) {
					if (definitions.has(definition.id)) throw new Error(`[dock] setting "${definition.id}" already registered`);
					const defaultValue = cloneJsonSafe(definition.defaultValue);
					if (!definition.validate(defaultValue)) throw new Error(`[dock] invalid default value for setting "${definition.id}"`);
					const typed = definition;
					definitions.set(definition.id, typed);
					const candidate = persisted[definition.id];
					const safeCandidate = candidate === void 0 ? void 0 : cloneJsonSafe(candidate);
					const value = safeCandidate !== void 0 && definition.validate(safeCandidate) ? safeCandidate : cloneJsonSafe(defaultValue);
					values.set(definition.id, value);
					persisted[definition.id] = cloneJsonSafe(value);
					persist();
					notify();
					return () => {
						if (definitions.get(definition.id) !== typed) return;
						definitions.delete(definition.id);
						notify();
					};
				},
				get(id) {
					const definition = definitions.get(id);
					if (definition === void 0) return void 0;
					const value = values.get(id);
					const safeValue = value === void 0 ? void 0 : cloneJsonSafe(value);
					return safeValue !== void 0 && definition.validate(safeValue) ? safeValue : cloneJsonSafe(definition.defaultValue);
				},
				getDefinitions(pluginId) {
					return [...definitions.values()].filter((definition) => pluginId === void 0 || definition.pluginId === pluginId).sort((left, right) => {
						const orderDifference = (left.order ?? 100) - (right.order ?? 100);
						return orderDifference !== 0 ? orderDifference : left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
					});
				},
				set(id, value) {
					const definition = definitions.get(id);
					if (definition === void 0) throw new Error(`[dock] unknown setting "${id}"`);
					const safeValue = cloneJsonSafe(value);
					const valid = definition.validate(safeValue);
					const next = valid ? safeValue : cloneJsonSafe(definition.defaultValue);
					if (Object.is(values.get(id), next)) {
						if (!valid) {
							persisted[id] = next;
							persist();
						}
						return;
					}
					values.set(id, next);
					persisted[id] = next;
					persist();
					notify();
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
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
		function createWorkbenchService(store, settings) {
			const plugins = /* @__PURE__ */ new Map();
			const pluginListeners = /* @__PURE__ */ new Set();
			const activityItems = /* @__PURE__ */ new Map();
			const panels = /* @__PURE__ */ new Map();
			const editorViews = /* @__PURE__ */ new Map();
			const statusItems = /* @__PURE__ */ new Map();
			const commands = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of [...listeners]) listener();
			};
			const notifyPlugins = () => {
				notify();
				for (const listener of [...pluginListeners]) listener();
			};
			const registerPlugin = (def) => {
				if (plugins.has(def.id)) throw new Error(`[dock] plugin "${def.id}" already registered`);
				plugins.set(def.id, def);
				notifyPlugins();
				return () => {
					if (plugins.get(def.id) === def) {
						plugins.delete(def.id);
						notifyPlugins();
					}
				};
			};
			const onDidChangePlugins = (listener) => {
				pluginListeners.add(listener);
				return () => {
					pluginListeners.delete(listener);
				};
			};
			const disposeDockPlugin = registerPlugin({
				id: DOCK_BASE_PLUGIN_ID,
				title: "Dock",
				description: "Workbench dock and settings",
				icon: DOCK_BASE_ICON,
				hasEntry: true,
				order: 0
			});
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
			const disposeDockSettingsEntry = registerActivityBarItem({
				id: DOCK_SETTINGS_ACTIVITY_ID,
				pluginId: DOCK_BASE_PLUGIN_ID,
				title: settingsLabels(getDockLocale()).dockSettings,
				icon: DOCK_BASE_ICON,
				order: 900,
				paneId: ""
			});
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
			const disposeDockPositionSetting = settings.register(DOCK_POSITION_SETTING);
			const disposeDockAutoHideSetting = settings.register(DOCK_AUTO_HIDE_SETTING);
			const disposeDockReserveSetting = settings.register(DOCK_RESERVE_SETTING);
			const disposeDockHoverScaleSetting = settings.register(DOCK_HOVER_SCALE_SETTING);
			const disposeDockNearScaleSetting = settings.register(DOCK_NEAR_SCALE_SETTING);
			const disposeHiddenPluginsSetting = settings.register(HIDDEN_PLUGINS_SETTING);
			const syncLayoutToSettings = () => {
				const layout = store.getLayout();
				if (settings.get(DOCK_POSITION_SETTING.id) !== layout.dock) settings.set(DOCK_POSITION_SETTING.id, layout.dock);
				if (settings.get(DOCK_AUTO_HIDE_SETTING.id) !== layout.autoHide) settings.set(DOCK_AUTO_HIDE_SETTING.id, layout.autoHide);
			};
			syncLayoutToSettings();
			const syncMagnification = () => {
				const hover = settings.get(DOCK_HOVER_SCALE_SETTING.id);
				const near = settings.get(DOCK_NEAR_SCALE_SETTING.id);
				if (hover === void 0 || near === void 0 || near <= hover) return;
				settings.set(DOCK_NEAR_SCALE_SETTING.id, hover);
			};
			syncMagnification();
			const stopLayoutSync = store.subscribe(syncLayoutToSettings);
			const stopSettingSync = settings.subscribe(() => {
				const dock = settings.get(DOCK_POSITION_SETTING.id);
				const autoHide = settings.get(DOCK_AUTO_HIDE_SETTING.id);
				const patch = {};
				if (dock !== void 0 && dock !== store.getLayout().dock) patch.dock = dock;
				if (autoHide !== void 0 && autoHide !== store.getLayout().autoHide) patch.autoHide = autoHide;
				if (Object.keys(patch).length > 0) store.update(patch);
				syncMagnification();
			});
			let disposed = false;
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				stopLayoutSync();
				stopSettingSync();
				disposeDockSettingsEntry();
				disposeDockPlugin();
				disposeHiddenPluginsSetting();
				disposeDockNearScaleSetting();
				disposeDockHoverScaleSetting();
				disposeDockReserveSetting();
				disposeDockAutoHideSetting();
				disposeDockPositionSetting();
			};
			return {
				dispose,
				registerPlugin,
				getPlugin: (id) => plugins.get(id),
				getPlugins: () => Array.from(plugins.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100)),
				onDidChangePlugins,
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
				subscribe,
				registerSetting: (definition) => settings.register(definition),
				getSettings: (pluginId) => pluginId === void 0 ? settings.getDefinitions() : settings.getDefinitions().filter((definition) => definition.pluginId === pluginId),
				getSetting: (id) => settings.get(id),
				setSetting: (id, value) => settings.set(id, value),
				onDidChangeSetting: (listener) => settings.subscribe(listener),
				getHiddenPluginIds: () => settings.get("dock-base:hidden-plugins") ?? [],
				setPluginHidden: (pluginId, hidden) => {
					const current = settings.get("dock-base:hidden-plugins") ?? [];
					const next = hidden ? [.../* @__PURE__ */ new Set([...current, pluginId])] : current.filter((id) => id !== pluginId);
					settings.set(HIDDEN_PLUGINS_SETTING_ID, next);
				}
			};
		}
		/**
		* Return the measured offset needed to move the conversation turn rail clear
		* of the floating dock bar. The bar rect is measured in viewport coordinates,
		* so the result is the distance from the bar to the docked edge plus
		* {@link DOCK_RESERVE_GAP}.
		*/
		function dockReservePx(position, bar, viewport, gap = 12) {
			const measured = position === "right" ? viewport.width - bar.left : position === "left" ? bar.right : position === "bottom" ? viewport.height - bar.top : bar.bottom;
			if (!Number.isFinite(measured)) return 0;
			return Math.max(0, Math.ceil(measured + gap));
		}
		//#endregion
		//#region src/client/ui-helpers.ts
		/** Pure keyboard behavior shared by the dock overlays and regression tests. */
		function focusTrapTarget(key, shiftKey, activeIndex, focusableCount) {
			if (key !== "Tab" || activeIndex < 0) return null;
			if (focusableCount === 0) return -1;
			if (shiftKey && activeIndex === 0) return focusableCount - 1;
			if (!shiftKey && activeIndex === focusableCount - 1) return 0;
			return null;
		}
		function isMenuActivationKey(key) {
			return key === "Enter" || key === " ";
		}
		function menuItemRole(kind) {
			return kind === "checkbox" ? "menuitemcheckbox" : "menuitemradio";
		}
		//#endregion
		//#region src/client/context-menu.tsx
		/**
		* Minimal context menu for the dock shell (right-click on the activity bar).
		* A single fixed-position popup with checkable items; closes on outside
		* mousedown, scroll, blur or Escape. Styles live in styles.ts (`.dsh-wb-menu*`)
		* so the menu follows the DSH theme tokens like the rest of the shell.
		*/
		function ContextMenu(props) {
			const { menu, onClose } = props;
			const firstItemRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (menu === null) return;
				firstItemRef.current?.focus();
				const close = () => onClose();
				document.addEventListener("mousedown", close);
				document.addEventListener("scroll", close, true);
				window.addEventListener("blur", close);
				const onKey = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						close();
					}
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
				ref: index === 0 ? firstItemRef : void 0,
				className: "dsh-wb-menu-item",
				role: menuItemRole(item.kind),
				"aria-checked": item.checked ?? false,
				tabIndex: 0,
				onKeyDown: (event) => {
					if (isMenuActivationKey(event.key)) {
						event.preventDefault();
						item.onClick?.();
						onClose();
					}
				},
				onClick: (event) => {
					event.stopPropagation();
					item.onClick?.();
					onClose();
				}
			}, (0, react.createElement)("span", { className: "dsh-wb-menu-mark" }, item.kind === "checkbox" ? item.checked ? "✓" : " " : item.checked ? "●" : "○"), item.label)));
		}
		//#endregion
		//#region src/client/internal/settings-window.ts
		function getVisibleSettings(definitions) {
			return definitions.filter((definition) => definition.id !== HIDDEN_PLUGINS_SETTING_ID);
		}
		function getGeneralSettings(definitions) {
			return definitions.filter((definition) => (definition.pluginId === void 0 || definition.pluginId === "dock-base") && definition.id !== "dock-base:hidden-plugins");
		}
		function getPluginSettings(service, pluginId) {
			return getVisibleSettings(service.getSettings(pluginId));
		}
		function canOpenPluginSettings(definitions) {
			return getVisibleSettings(definitions).length > 0;
		}
		function pluginsForTab(plugins, tab) {
			return plugins.filter((plugin) => tab === "entry" ? plugin.hasEntry : !plugin.hasEntry);
		}
		function hasPluginVisibilitySwitch(plugin) {
			return plugin.hasEntry;
		}
		/**
		* The side-bar entry this plugin owns, matched through the activity item's
		* pluginId. A pane-less item is not an entry: the dock's own settings item
		* opens the settings dialog, so there is nothing to open in the side bar and
		* the "Open" action must not be offered for it.
		*/
		function pluginEntryItem(service, pluginId) {
			return service.getActivityItems().find((item) => (item.pluginId ?? item.id) === pluginId && item.paneId !== "");
		}
		/**
		* Open a plugin's dock entry from the settings window. A hidden entry is
		* unhidden first, because activating a filtered-out activity would show
		* nothing; the user's intent here is "open it now".
		*/
		function openPluginEntry(service, pluginId) {
			const item = pluginEntryItem(service, pluginId);
			if (item === void 0) return false;
			if (service.getHiddenPluginIds().includes(pluginId)) service.setPluginHidden(pluginId, false);
			service.updateLayout({
				activity: item.id,
				sideBarOpen: true
			});
			return true;
		}
		/** Keep switch keyboard activation from also activating its containing card. */
		function stopPluginSwitchKeydown(event) {
			if (event.key === "Enter" || event.key === " ") event.stopPropagation();
		}
		function pluginIcon(icon) {
			return icon ?? GENERIC_PLUGIN_ICON;
		}
		function settingsTabClassName(id, active) {
			return `dsh-wb-settings-tab${active === id ? " active" : ""}`;
		}
		function settingsPageClassName(detail) {
			return `dsh-wb-settings-page ${detail ? "dsh-wb-settings-page-detail" : "dsh-wb-settings-page-list"}`;
		}
		//#endregion
		//#region src/client/SettingsWindow.tsx
		const FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
		/** Standalone settings dialog, rendered beside (not inside) the auto-hide root. */
		function SettingsWindow(props) {
			const { service, open, onClose, restoreFocusRef } = props;
			const dialogRef = (0, react.useRef)(null);
			const closeButtonRef = (0, react.useRef)(null);
			const wasOpenRef = (0, react.useRef)(false);
			const [detailPluginId, setDetailPluginId] = (0, react.useState)(null);
			const [tab, setTab] = (0, react.useState)("entry");
			const settingsSnapshot = useSettingsSnapshot(service);
			const plugins = usePluginsSnapshot(service);
			const locale = useLocaleSnapshot();
			const labels = (0, react.useMemo)(() => settingsLabels(locale), [locale]);
			const localize = (0, react.useCallback)((definition) => {
				const title = resolveSettingText(definition.title, locale);
				const description = resolveSettingText(definition.description, locale);
				return {
					...definition,
					title: title ?? definition.id,
					description
				};
			}, [locale]);
			(0, react.useEffect)(() => {
				if (!open) {
					if (wasOpenRef.current) restoreFocusRef?.current?.focus();
					wasOpenRef.current = false;
					return;
				}
				wasOpenRef.current = true;
				closeButtonRef.current?.focus();
				const onMouseDown = (event) => {
					const target = event.target;
					if (target instanceof Node && !dialogRef.current?.contains(target)) onClose();
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						if (detailPluginId !== null) setDetailPluginId(null);
						else onClose();
						return;
					}
					if (event.key !== "Tab" || dialogRef.current === null) return;
					const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)];
					if (focusable.length === 0) return;
					const activeIndex = focusable.indexOf(document.activeElement);
					const nextIndex = focusTrapTarget(event.key, event.shiftKey, activeIndex, focusable.length);
					if (nextIndex !== null) {
						event.preventDefault();
						if (nextIndex >= 0) focusable[nextIndex]?.focus();
					}
				};
				document.addEventListener("mousedown", onMouseDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("mousedown", onMouseDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [
				open,
				onClose,
				restoreFocusRef,
				detailPluginId
			]);
			if (!open) return null;
			const selected = detailPluginId === null ? void 0 : plugins.find((plugin) => plugin.id === detailPluginId);
			const selectedSettings = selected === void 0 ? [] : getPluginSettings(service, selected.id);
			return (0, react.createElement)("div", { className: "dsh-wb-settings-overlay" }, (0, react.createElement)("div", {
				ref: dialogRef,
				className: `dsh-wb-settings${selected !== void 0 ? " dsh-wb-settings-detail" : ""}`,
				role: "dialog",
				"aria-modal": true,
				"aria-labelledby": "dsh-wb-settings-title"
			}, (0, react.createElement)("div", { className: "dsh-wb-settings-head" }, selected !== void 0 ? (0, react.createElement)("button", {
				type: "button",
				className: "dsh-wb-settings-back",
				onClick: () => setDetailPluginId(null),
				"aria-label": labels.back
			}, "‹") : null, (0, react.createElement)("h2", { id: "dsh-wb-settings-title" }, selected?.title ?? labels.settings), (0, react.createElement)("button", {
				ref: closeButtonRef,
				type: "button",
				className: "dsh-wb-settings-close",
				"aria-label": labels.close,
				title: labels.close,
				onClick: onClose
			}, "×")), selected !== void 0 ? (0, react.createElement)("div", { className: settingsPageClassName(true) }, selectedSettings.length === 0 ? (0, react.createElement)("div", { className: "dsh-wb-settings-empty" }, labels.empty) : selectedSettings.map((definition) => createSettingRow(service, localize(definition), locale))) : (0, react.createElement)("div", { className: settingsPageClassName(false) }, (0, react.createElement)("div", { className: "dsh-wb-settings-general" }, (0, react.createElement)("h3", null, labels.general), getGeneralSettings(settingsSnapshot).map((definition) => createSettingRow(service, localize(definition), locale))), (0, react.createElement)("section", { className: "dsh-wb-settings-plugins" }, (0, react.createElement)("h3", null, labels.plugins), (0, react.createElement)("div", {
				className: "dsh-wb-settings-tabs",
				role: "tablist"
			}, createTab("entry", labels.entry, tab, setTab), createTab("other", labels.other, tab, setTab)), (0, react.createElement)("div", { className: "dsh-wb-plugin-list" }, pluginsForTab(plugins, tab).map((plugin) => createPluginCard(service, plugin, labels, () => {
				if (canOpenPluginSettings(getPluginSettings(service, plugin.id))) setDetailPluginId(plugin.id);
			}, () => {
				if (openPluginEntry(service, plugin.id)) onClose();
			})))))));
		}
		function createTab(id, label, active, onSelect) {
			return (0, react.createElement)("button", {
				type: "button",
				role: "tab",
				"aria-selected": active === id,
				className: settingsTabClassName(id, active),
				onClick: () => onSelect(id)
			}, label);
		}
		function createPluginCard(service, plugin, labels, onOpenSettings, onOpenEntry) {
			const canOpen = canOpenPluginSettings(getPluginSettings(service, plugin.id));
			const hidden = service.getHiddenPluginIds().includes(plugin.id);
			const entry = pluginEntryItem(service, plugin.id);
			return (0, react.createElement)("div", {
				key: plugin.id,
				className: `dsh-wb-plugin-card${canOpen ? " is-clickable" : ""}`,
				role: canOpen ? "button" : void 0,
				tabIndex: canOpen ? 0 : void 0,
				onClick: canOpen ? onOpenSettings : void 0,
				onKeyDown: canOpen ? (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onOpenSettings();
					}
				} : void 0
			}, (0, react.createElement)("span", { className: "dsh-wb-plugin-icon" }, renderIcon$1(pluginIcon(plugin.icon))), (0, react.createElement)("span", { className: "dsh-wb-plugin-copy" }, (0, react.createElement)("span", { className: "dsh-wb-plugin-title" }, plugin.title), plugin.description ? (0, react.createElement)("small", null, plugin.description) : null), (0, react.createElement)("span", { className: "dsh-wb-plugin-actions" }, entry !== void 0 ? (0, react.createElement)("button", {
				type: "button",
				className: "dsh-wb-plugin-open",
				title: `${labels.openPlugin} ${plugin.title}`,
				"aria-label": `${labels.openPlugin} ${plugin.title}`,
				onClick: (event) => {
					event.stopPropagation();
					onOpenEntry();
				},
				onKeyDown: stopPluginSwitchKeydown
			}, labels.openPlugin) : null, hasPluginVisibilitySwitch(plugin) ? (0, react.createElement)("button", {
				type: "button",
				role: "switch",
				"aria-checked": !hidden,
				className: `dsh-wb-plugin-switch${hidden ? "" : " on"}`,
				onClick: (event) => {
					event.stopPropagation();
					service.setPluginHidden(plugin.id, !hidden);
				},
				onKeyDown: stopPluginSwitchKeydown,
				"aria-label": `${labels.showPlugin} ${plugin.title}`
			}, (0, react.createElement)("span")) : null, (0, react.createElement)("span", {
				className: "dsh-wb-plugin-chevron",
				"aria-hidden": true
			}, canOpen ? "›" : "\xA0")));
		}
		function renderIcon$1(icon, size = 22) {
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
		function createSettingRow(service, definition, locale) {
			const Component = definition.component;
			return (0, react.createElement)("section", {
				key: definition.id,
				className: "dsh-wb-setting-row"
			}, (0, react.createElement)("div", { className: "dsh-wb-setting-copy" }, (0, react.createElement)("div", { className: "dsh-wb-setting-title" }, definition.title), definition.description !== void 0 ? (0, react.createElement)("div", { className: "dsh-wb-setting-description" }, definition.description) : null), (0, react.createElement)("div", { className: "dsh-wb-setting-control" }, (0, react.createElement)(Component, {
				value: service.getSetting(definition.id),
				onChange: (next) => service.setSetting(definition.id, next),
				locale
			})));
		}
		function usePluginsSnapshot(service) {
			const ref = (0, react.useRef)();
			const version = (0, react.useRef)(0);
			const subscribe = (0, react.useCallback)((listener) => service.onDidChangePlugins(() => {
				version.current += 1;
				ref.current = void 0;
				listener();
			}), [service]);
			const get = (0, react.useCallback)(() => {
				if (ref.current?.service !== service) {
					version.current = 0;
					ref.current = void 0;
				}
				if (!ref.current) ref.current = {
					service,
					version: version.current,
					value: service.getPlugins()
				};
				return ref.current.value;
			}, [service]);
			return (0, react.useSyncExternalStore)(subscribe, get, get);
		}
		function useLocaleSnapshot() {
			const subscribe = (0, react.useCallback)((listener) => {
				if (typeof window === "undefined") return () => {};
				window.addEventListener("languagechange", listener);
				const root = typeof document !== "undefined" ? document.documentElement : null;
				const observer = root !== null && typeof MutationObserver !== "undefined" ? new MutationObserver(listener) : null;
				observer?.observe(root, {
					attributes: true,
					attributeFilter: ["lang"]
				});
				return () => {
					window.removeEventListener("languagechange", listener);
					observer?.disconnect();
				};
			}, []);
			const get = (0, react.useCallback)(() => {
				const documentLanguage = typeof document !== "undefined" ? document.documentElement.lang : "";
				const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "";
				return getDockLocale(documentLanguage || browserLanguage);
			}, []);
			return (0, react.useSyncExternalStore)(subscribe, get, get);
		}
		function useSettingsSnapshot(service) {
			const ref = (0, react.useRef)();
			const subscribe = (0, react.useCallback)((listener) => service.onDidChangeSetting(() => {
				ref.current = void 0;
				listener();
			}), [service]);
			const get = (0, react.useCallback)(() => {
				if (ref.current?.service !== service) ref.current = void 0;
				if (!ref.current) ref.current = {
					service,
					value: service.getSettings()
				};
				return ref.current.value;
			}, [service]);
			return (0, react.useSyncExternalStore)(subscribe, get, get);
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
		/** The dock bar element whose measured size the page reserve is derived from. */
		const DOCK_BAR_SELECTOR = ".dsh-wb-activity";
		/**
		* Publish the docked edge and the measured offset consumed only by the
		* conversation turn rail. The page shell itself remains full width, so its
		* scrollbar stays at the viewport edge.
		*/
		function useDockRailOffset(rootRef, dock, enabled) {
			(0, react.useEffect)(() => {
				const body = document.body;
				const publish = () => {
					const bar = rootRef.current?.querySelector(DOCK_BAR_SELECTOR) ?? null;
					const offset = enabled && dock === "right" && bar !== null ? dockReservePx("right", bar.getBoundingClientRect(), {
						width: window.innerWidth,
						height: window.innerHeight
					}) : 0;
					if (offset > 0) body.style.setProperty("--dock-turn-rail-offset", `${offset}px`);
					else body.style.removeProperty("--dock-turn-rail-offset");
				};
				body.setAttribute("data-dock", dock);
				publish();
				const bar = rootRef.current?.querySelector(DOCK_BAR_SELECTOR) ?? null;
				const observer = bar !== null && typeof ResizeObserver !== "undefined" ? new ResizeObserver(publish) : null;
				if (bar !== null) observer?.observe(bar);
				window.addEventListener("resize", publish);
				return () => {
					observer?.disconnect();
					window.removeEventListener("resize", publish);
					body.removeAttribute("data-dock");
					body.style.removeProperty("--dock-turn-rail-offset");
				};
			}, [
				rootRef,
				dock,
				enabled
			]);
		}
		/**
		* Publish the two magnification factors as custom properties on the shell
		* root. The stylesheet stays static — only the values move — so tuning the
		* sliders in settings never re-injects CSS.
		*/
		function useDockMagnification(rootRef, hoverScale, nearScale) {
			(0, react.useEffect)(() => {
				const root = rootRef.current;
				if (root === null) return;
				root.style.setProperty("--dock-icon-hover-scale", String(hoverScale));
				root.style.setProperty("--dock-icon-near-scale", String(nearScale));
				return () => {
					root.style.removeProperty("--dock-icon-hover-scale");
					root.style.removeProperty("--dock-icon-near-scale");
				};
			}, [
				rootRef,
				hoverScale,
				nearScale
			]);
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
		/** Docked edge labels for the position menu (zh/en pairs). */
		const DOCK_LABEL = {
			left: {
				zh: "左侧",
				en: "Left"
			},
			right: {
				zh: "右侧",
				en: "Right"
			},
			top: {
				zh: "顶部",
				en: "Top"
			},
			bottom: {
				zh: "底部",
				en: "Bottom"
			}
		};
		/** True when the DSH UI language is English. The locale plugin keeps
		*  `document.documentElement.lang` in sync with the active locale ('en' for
		*  English, 'zh-CN' for Chinese), so the menu follows the UI language
		*  without importing the locale service. */
		function isEnglish() {
			return isDockEnglish();
		}
		/** The whole workbench shell. */
		function WorkbenchRoot(props) {
			const { ctx, service, store } = props;
			const layout = (0, react.useSyncExternalStore)(store.subscribe, store.getLayout);
			const registry = (0, react.useSyncExternalStore)((onChange) => service.subscribe(() => {
				registryVersion += 1;
				onChange();
			}), () => registryVersion);
			const autoHide = layout.autoHide === "edge";
			const settingsVersion = (0, react.useSyncExternalStore)(service.onDidChangeSetting, () => service.getHiddenPluginIds().join("\0"));
			const hiddenPlugins = (0, react.useMemo)(() => new Set(service.getHiddenPluginIds()), [settingsVersion, service]);
			const reserveSpace = (0, react.useSyncExternalStore)(service.onDidChangeSetting, () => service.getSetting(DOCK_RESERVE_SETTING_ID) !== false);
			const hoverScale = (0, react.useSyncExternalStore)(service.onDidChangeSetting, () => service.getSetting("dock-base:hover-scale") ?? 1.6);
			const nearScale = (0, react.useSyncExternalStore)(service.onDidChangeSetting, () => service.getSetting("dock-base:near-scale") ?? 1.2);
			const rootRef = (0, react.useRef)(null);
			const [menu, setMenu] = (0, react.useState)(null);
			const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
			const settingsRestoreRef = (0, react.useRef)(null);
			const [autoHidden, setAutoHidden] = (0, react.useState)(false);
			const hideTimer = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
			}, []);
			(0, react.useEffect)(() => {
				if (autoHide) return;
				if (hideTimer.current !== null) {
					window.clearTimeout(hideTimer.current);
					hideTimer.current = null;
				}
				setAutoHidden(false);
			}, [autoHide]);
			const activityItems = (0, react.useMemo)(() => {
				const all = [...service.getActivityItems()].filter((item) => !hiddenPlugins.has(item.pluginId ?? item.id)).sort(byOrder);
				const byId = new Map(all.map((item) => [item.id, item]));
				const userOrdered = layout.activityOrder.map((id) => byId.get(id)).filter((item) => item !== void 0);
				const rest = all.filter((item) => !layout.activityOrder.includes(item.id));
				return [...userOrdered, ...rest];
			}, [
				registry,
				service,
				layout.activityOrder,
				hiddenPlugins
			]);
			const panels = (0, react.useMemo)(() => [...service.getPanels()].sort(byOrder), [registry, service]);
			const editorViews = (0, react.useMemo)(() => [...service.getEditorViews()].sort(byOrder), [registry, service]);
			const statusItems = (0, react.useMemo)(() => [...service.getStatusItems()].sort(byOrder), [registry, service]);
			const sessionId = useSessionId(ctx);
			const collapsed = layout.activity === null;
			(0, react.useEffect)(() => {
				if (layout.activity !== null) {
					const active = service.getActivityItem(layout.activity);
					if (active !== void 0 && hiddenPlugins.has(active.pluginId ?? active.id)) store.update({ activity: null });
				}
			}, [
				layout.activity,
				hiddenPlugins,
				service,
				store
			]);
			const activeActivity = layout.activity === null ? void 0 : (() => {
				const activity = service.getActivityItem(layout.activity);
				return activity !== void 0 && !hiddenPlugins.has(activity.pluginId ?? activity.id) ? activity : void 0;
			})();
			const activePane = activeActivity === void 0 || !layout.sideBarOpen ? void 0 : panels.find((panel) => panel.id === activeActivity.paneId && panel.region === "sideBar");
			const openDockMenu = (x, y, target) => {
				settingsRestoreRef.current = target instanceof HTMLElement ? target.closest("button") ?? target : null;
				const en = isEnglish();
				const items = [...[
					"left",
					"right",
					"top",
					"bottom"
				].map((dock) => ({
					label: en ? `Dock to ${DOCK_LABEL[dock].en}` : `停靠到${DOCK_LABEL[dock].zh}`,
					checked: layout.dock === dock,
					onClick: () => store.update({ dock })
				})), {
					label: en ? "Auto-hide (hide when mouse leaves)" : "自动隐藏（鼠标远离收起）",
					kind: "checkbox",
					checked: autoHide,
					onClick: () => store.update({ autoHide: autoHide ? "off" : "edge" })
				}];
				items.push({
					label: isEnglish() ? "Settings" : "设置",
					onClick: () => setSettingsOpen(true)
				});
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
				autoHide && autoHidden ? "wb-autohidden" : void 0
			].filter(Boolean).join(" ");
			useDockRailOffset(rootRef, layout.dock, reserveSpace);
			useDockMagnification(rootRef, hoverScale, nearScale);
			return (0, react.createElement)(react.Fragment, null, (0, react.createElement)("div", {
				ref: rootRef,
				className: rootClass,
				"data-dock-shell": "",
				"data-dock": layout.dock,
				"data-mode": "dock",
				onMouseEnter: reveal,
				onMouseLeave: scheduleHide
			}, (0, react.createElement)(ActivityBar, {
				items: activityItems,
				activeId: layout.activity,
				dockMode: true,
				onActivate: (id, trigger) => {
					if (id === "dock-base:settings") {
						settingsRestoreRef.current = trigger;
						setSettingsOpen(true);
						return;
					}
					store.update(layout.activity === id ? { activity: null } : {
						activity: id,
						sideBarOpen: true
					});
				},
				onContextMenu: (x, y, target) => openDockMenu(x, y, target),
				onReorder: (draggedId, targetId) => {
					const next = reorderActivity(activityItems.map((item) => item.id), draggedId, targetId);
					store.update({ activityOrder: next });
				}
			}), (0, react.createElement)("div", { className: "dsh-wb-body" }, activePane !== void 0 && !collapsed ? (0, react.createElement)("div", { className: "dsh-wb-sidebar" }, (0, react.createElement)("div", { className: "dsh-wb-sidebar-header" }, (0, react.createElement)("span", { className: "dsh-wb-sidebar-title" }, titleOf(activePane)), activePane.headerComponent !== void 0 ? renderView(ctx, {
				...activePane,
				component: activePane.headerComponent
			}, activePane.id, sessionId, layout.activity === activeActivity?.id) : null), renderView(ctx, activePane, activePane.id, sessionId, layout.activity === activeActivity?.id)) : null, layout.editorTabs.length > 0 ? (0, react.createElement)("div", { className: "dsh-wb-main" }, (0, react.createElement)(EditorArea, {
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
			})) : null)), (0, react.createElement)(ContextMenu, {
				menu,
				onClose: () => setMenu(null)
			}), (0, react.createElement)(SettingsWindow, {
				service,
				open: settingsOpen,
				onClose: () => setSettingsOpen(false),
				restoreFocusRef: settingsRestoreRef
			}), (0, react.createElement)(FloatingWindows, {
				ctx,
				service,
				layout,
				sessionId,
				views: editorViews
			}), autoHide ? (0, react.createElement)("div", {
				className: "dsh-wb-autohide-hotspot",
				"aria-label": settingsLabels(isEnglish() ? "en" : "zh").autoHideHint,
				title: settingsLabels(isEnglish() ? "en" : "zh").autoHideHint,
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
					onContextMenu(event.clientX, event.clientY, event.target);
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
				onClick: (event) => onActivate(item.id, event.currentTarget instanceof HTMLElement ? event.currentTarget : null),
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
		* Live active-session id: subscribes to the uiSession scope adapter's current
		* binding, so switching the workspace/conversation re-renders and every view
		* keyed on sessionId reloads against the new working directory. Returns
		* undefined when the uiSession service is absent or no Session is selected.
		*
		* The sessions service no longer owns selection: its list snapshot carried a
		* `current` field through 0.1.x and the 0.2 client dropped it ("navigation
		* belongs to view owners"). The view owner's binding is `uiSession.adapter.current`,
		* whose snapshot exposes the scope identity as `key`.
		*/
		function useSessionId(ctx) {
			const current = ctx.get("uiSession")?.adapter?.current;
			return (0, react.useSyncExternalStore)((cb) => current?.subscribe(cb) ?? (() => {}), () => current?.getSnapshot().key);
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
/* Numeric slider row (dock magnification): a fixed-width track so the rows
   line up, with the live value printed beside it — a bare slider has no
   readout. tabular-nums keeps the number from jittering while dragging. */
.dsh-wb-setting-slider { display: flex; align-items: center; gap: 10px; }
.dsh-wb-setting-range {
  width: 148px;
  max-width: 100%;
  accent-color: var(--dsw-alias-border-accent, #4f6ef2);
  cursor: pointer;
}
.dsh-wb-setting-scale {
  min-width: 46px;
  text-align: right;
  color: var(--dsw-alias-label-secondary, #656d76);
  font-variant-numeric: tabular-nums;
}
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
.dsh-wb-settings-close:focus-visible, .dsh-wb-settings-back:focus-visible, .dsh-wb-settings-tab:focus-visible, .dsh-wb-plugin-card:focus-visible, .dsh-wb-plugin-switch:focus-visible, .dsh-wb-plugin-open:focus-visible, .dsh-wb-setting-switch:focus-visible, .dsh-wb-setting-choice:focus-visible, .dsh-wb-setting-range:focus-visible { outline: 2px solid var(--dsw-alias-border-accent, #4f6ef2); outline-offset: 2px; }
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
  transition: transform 140ms cubic-bezier(.2, 1.35, .35, 1);
}
/* The hovered icon pops hard and its two neighbours follow; the raised
   stacking order keeps the grown icon on top so a scaled neighbour can never
   steal the hover (which would otherwise make the bar flicker). The factors
   are user-tunable sliders in settings, published on the shell root as
   --dock-icon-*-scale; the fallbacks are the setting defaults, so the
   stylesheet stays correct on its own. */
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button.dock-hover {
  transform: scale(var(--dock-icon-hover-scale, 1.6));
  position: relative;
  z-index: 2;
}
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button.dock-near {
  transform: scale(var(--dock-icon-near-scale, 1.2));
  position: relative;
  z-index: 1;
}
/* Dock mode keeps the native arrow over the bar: magnification is the whole
   hover cue, so a pointer/grab hand would be a second, competing signal.
   Only an in-flight reorder drag still shows the grabbing hand. */
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity,
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button { cursor: default; }
.dsh-wb-root[data-mode="dock"] .dsh-wb-activity button.dragging { cursor: grabbing; }
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
		* touch the page layout). DSH's native UI stays untouched — the workbench
		* floats alongside it like the macOS Dock.
		*/
		/**
		* The shell resolves the active Session from `uiSession`, whose scope adapter
		* is the view owner's selection source; waiting for it keeps every view's
		* sessionId correct on its first render instead of racing boot order.
		*/
		const inject = ["uiSession"];
		/** Client plugin body. */
		function apply(ctx) {
			const store = createLayoutStore();
			const service = createWorkbenchService(store, createSettingsStore());
			ctx.provide("workbench", service);
			ctx.effect(() => {
				let root;
				let host;
				let unstyle;
				let cleaned = false;
				const cleanup = () => {
					if (cleaned) return;
					cleaned = true;
					root?.unmount();
					root = void 0;
					host?.remove();
					host = void 0;
					unstyle?.();
					unstyle = void 0;
					service.dispose();
				};
				try {
					unstyle = mountStyles();
					host = document.createElement("div");
					host.setAttribute("data-dock", "");
					document.body.appendChild(host);
					root = (0, react_dom_client.createRoot)(host);
					root.render((0, react.createElement)(WorkbenchRoot, {
						ctx,
						service,
						store
					}));
					return cleanup;
				} catch (error) {
					console.error("[dock] mount error:", error);
					cleanup();
					return cleanup;
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