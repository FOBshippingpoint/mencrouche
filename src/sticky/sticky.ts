import { Apocalypse, apocalypse, type Overwrite } from "../apocalypse";
import { registerContextMenu } from "../contextMenu";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "../dataWizard";
import { getTemplate } from "../utils/getTemplate";
import { n81i } from "../utils/n81i";
import { pack } from "../utils/packer";
import { markDirtyAndSaveDocument } from "../lifesaver";
import { Zoomable, type Transform } from "./zoom";
import { Resizable } from "./resize";
import { Draggable, type Offset } from "./drag";
import { $, $$$, addCss } from "../utils/dollars";

function onEventOrTimeout<K extends keyof HTMLElementEventMap>(
	el: HTMLElement,
	todo: () => void,
	type: K,
	timeout = 1000,
) {
	let timeoutId: number;

	const handler = () => {
		clearTimeout(timeoutId);
		todo();
	};

	el.on(type, handler, { once: true });

	timeoutId = window.setTimeout(() => {
		el.off(type, handler);
		todo();
	}, timeout);
}

export interface PluginStickyPoolMap {}
export interface PluginSticky {}
export interface StickyConfig<
	C extends PluginStickyConfig = PluginStickyConfig,
> {
	id?: string;
	type?: string;
	rect?: Rectangle;
	zIndex?: number;
	className?: string;
	pluginConfig?: C;
	dataset?: Record<string, unknown>;
}
export interface Sticky<
	T extends PluginSticky = PluginSticky,
	C extends PluginStickyConfig = PluginStickyConfig,
> extends HTMLDivElement {
	type: string;
	delete: () => void;
	forceDelete: () => void;
	duplicate: () => Sticky;
	toggleMaximize: () => void;
	toggleGhostMode: () => void;
	togglePin: () => void;
	addControlWidget: (element: HTMLElement) => void;
	setTitle: (title: string) => void;
	replaceBody: (...nodes: (Node | string)[]) => void;
	save: () => StickyConfig<C>;
	plugin: T;
}

/**
 * `var(--size-fluid-9)` in pixels.
 *
 * Enable us to center sticky on screen
 * even if user hasn't move the cursor yet.
 */
const defaultWidth = $<HTMLDivElement>("#stickySizeDummy")!.offsetWidth;

const mutationObserver = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		mutation.target.dispatchEvent(new CustomEvent("classchange"));
	}
});

registerContextMenu("basic", [
	(sticky: Sticky) => ({
		name: "deleteSticky",
		icon: "lucide-trash",
		execute() {
			sticky.delete();
		},
	}),
	(sticky: Sticky) => ({
		name: "duplicateSticky",
		icon: "lucide-copy",
		execute() {
			sticky.duplicate();
		},
	}),
	(sticky: Sticky) => ({
		name: sticky.classList.contains("maximized")
			? "minimizeSticky"
			: "maximizeSticky",
		icon: sticky.classList.contains("maximized")
			? "lucide-minimize-2"
			: "lucide-maximize-2",
		execute() {
			sticky.toggleMaximize();
		},
	}),
	(sticky: Sticky) => ({
		name: sticky.classList.contains("pin") ? "unpinSticky" : "pinSticky",
		icon: sticky.classList.contains("pin") ? "lucide-pin-off" : "lucide-pin",
		execute() {
			sticky.togglePin();
		},
	}),
	(sticky: Sticky) => ({
		name: sticky.classList.contains("ghost")
			? "stickyGhostModeOff"
			: "stickyGhostModeOn",
		icon: sticky.classList.contains("ghost")
			? "lucide-square"
			: "lucide-box-select",
		execute() {
			sticky.toggleGhostMode();
		},
	}),
]);

export interface WorkspaceConfig {
	/** CSS transform for crate. */
	transform: Transform;
	/** Offset left and offset top for crate. */
	offset: Offset;
	/** All stickies inside workspace. */
	stickies: StickyConfig[];
}
class Workspace extends EventTarget {
	/** Contains stickies. */
	innerCrate: HTMLDivElement;
	/**
	 * Contains crate.
	 * A simple html element wrapper, so that we can use
	 * css transform without worrying outer layout.
	 */
	outerCrate: HTMLDivElement;
	zoomable: Zoomable;
	draggable: Draggable;
	buildSticky: ReturnType<typeof buildBuildSticky>;
	cursorPoint: CursorPoint;
	private _isCursorOutside: boolean = true;
	private highestZIndex: number = 0;
	/** An array for tracking the sticky order `[lowest layer, ..., topest layer]` */
	private stickies: Sticky[] = [];
	apocalypse: Apocalypse;

	constructor(apocalypse: Apocalypse) {
		super();
		this.apocalypse = apocalypse;

		this.outerCrate = getTemplate<HTMLDivElement>("workspaceWidgets");
		this.innerCrate = this.outerCrate.$<HTMLDivElement>(".innerCrate")!;

		this.zoomable = new Zoomable(this.innerCrate, {
			interactEl: this.outerCrate,
			onZoom: () => markDirtyAndSaveDocument(),
		});

		this.draggable = new Draggable(this.innerCrate, {
			interactEl: this.outerCrate,
			acceptMouseButton: 1, // Only accept middle button drag.
			onDragStart: () => (this.outerCrate.style.cursor = "grab"),
			onDragEnd: () => this.outerCrate.style.removeProperty("cursor"),
			onDrag: () => markDirtyAndSaveDocument(),
		});

		// Peak hidden border when pressing ctrl key.
		document.body.on("keydown", (e) => {
			this.innerCrate.classList.toggle("peakGhost", e.ctrlKey);
		});
		document.body.on("keyup", (e) => {
			this.innerCrate.classList.toggle("peakGhost", e.ctrlKey);
		});

		// Continuosly track the cursor position.
		this.cursorPoint = [NaN, NaN];
		this.outerCrate.on("pointermove", (e) => {
			const rect = this.innerCrate.getBoundingClientRect();
			this.cursorPoint[0] = (e.clientX - rect.x) / this.zoomable.scale;
			this.cursorPoint[1] = (e.clientY - rect.y) / this.zoomable.scale;
		});
		this.outerCrate.on("pointerenter", () => (this._isCursorOutside = false));
		this.outerCrate.on("pointerleave", () => (this._isCursorOutside = true));

		// Build buildSticky function that has wrap with dynamic cursor point.
		this.buildSticky = buildBuildSticky(this);

		this.refreshHighestZIndex();

		this.on("dragminimize", (event) => {
			// When user drag maximized sticky
			// We will adjust sticky position to cursor
			// And keep the original width/height.
			const e = event as CustomEvent<Sticky>;
			const sticky = e.detail;
			const rect = parseRect(sticky.dataset.rect!);
			rect[0] = this.cursorPoint[0] - (rect[2] ?? 0) / 2;
			rect[1] = this.cursorPoint[1];
			this.minimize(sticky, rect);
		});
	}

	refreshHighestZIndex() {
		// Find and set the highestZIndex when initialize from existing document.
		this.highestZIndex = 0;
		for (const sticky of this.outerCrate.$$<HTMLDivElement>(".sticky")) {
			const zIndex = parseInt(sticky.style.zIndex);
			if (zIndex > this.highestZIndex) {
				this.highestZIndex = zIndex;
			}
		}
	}

	restoreAndReplaceAll(stickies: StickyConfig[]) {
		this.forceDeleteAll();
		for (const sticky of stickies) {
			this.restoreSticky(sticky);
		}
		this.refreshHighestZIndex();
	}

	delete(sticky: Sticky) {
		const obj = this.saveSticky(sticky);
		this.apocalypse.write({
			toString: () => `Delete sticky #[ ${sticky.id} ]`,
			execute: () => {
				this._delete(sticky);
				markDirtyAndSaveDocument();
			},
			undo: () => {
				this.restoreSticky(obj);
				markDirtyAndSaveDocument();
			},
		});
	}

	deleteLatest() {
		const sticky = this.getLatestSticky();
		if (sticky) {
			this.delete(sticky);
			markDirtyAndSaveDocument();
		}
	}

	forceDelete(sticky: Sticky) {
		this.stickies.splice(this.stickies.indexOf(sticky), 1);
		sticky.remove();
		markDirtyAndSaveDocument();
	}

	forceDeleteAll() {
		for (const sticky of this.stickies) {
			sticky.remove();
		}
		this.stickies.length = 0;
		markDirtyAndSaveDocument();
	}

	deleteAll() {
		const backup = this.saveAllStickies();
		this.apocalypse.write({
			execute: () => {
				while (this.stickies.length) {
					this._delete(this.stickies.at(-1)!);
				}
				markDirtyAndSaveDocument();
			},
			undo: () => {
				for (const sticky of backup) {
					this.restoreSticky(sticky);
				}
				markDirtyAndSaveDocument();
			},
		});
	}

	saveSticky(sticky: Sticky) {
		const config = sticky.save();
		config.pluginConfig = {};
		const pluginSticky = getPluginStickyModel(sticky);
		if (pluginSticky) {
			config.type = pluginSticky.type;
			Object.assign(config.pluginConfig, pluginSticky.onSave(sticky));
		}

		// If pluginConfig has any content, return as is.
		for (const _ in config.pluginConfig) {
			return config;
		}
		// If not, delete pluginConfig and return.
		delete config.pluginConfig;
		return config;
	}

	saveAllStickies() {
		return this.stickies.map(this.saveSticky);
	}

	/**
	 * Save stickies and workspace attributes.
	 * Use when serializing workspace.
	 */
	saveWork(): WorkspaceConfig {
		return {
			stickies: this.saveAllStickies(),
			transform: this.zoomable.getTransform(),
			offset: this.draggable.getOffset(),
		};
	}

	duplicate(sticky: Sticky) {
		const config = this.saveSticky(sticky);
		const duplicated = this.buildSticky("restore", config);
		this.apocalypse.write({
			toString: () => `Duplicate sticky #[ ${sticky.id} ]`,
			execute: () => {
				this.addToTop(duplicated);
				duplicated.setRect(
					duplicated.offsetLeft + 20,
					duplicated.offsetTop + 20,
				);
				duplicated.focus();
				markDirtyAndSaveDocument();
			},
			undo: () => {
				this.forceDelete(duplicated);
				markDirtyAndSaveDocument();
			},
		});
	}

	toggleMaximize(sticky: Sticky) {
		if (!sticky.classList.contains("maximized")) {
			const prevRect = sticky.dataset.rect;
			const currRect = extractRect(sticky);
			// Original size => Maximize
			apocalypse.write({
				execute: () => {
					sticky.dataset.rect = currRect.toString();
					this.maximize(sticky);
				},
				undo: () => {
					sticky.dataset.rect = prevRect;
					this.minimize(sticky, currRect);
				},
			});
		} else {
			const prevRect = sticky.dataset.rect;
			const maximizedRect = extractRect(sticky);
			// Maximized => Original size
			apocalypse.write({
				execute: () => {
					sticky.dataset.rect = maximizedRect.toString();
					this.minimize(sticky, parseRect(prevRect!));
				},
				undo: () => {
					sticky.dataset.rect = prevRect;
					this.maximize(sticky);
				},
			});
		}

		sticky.dispatchEvent(
			new CustomEvent(
				sticky.classList.contains("maximized") ? "minimize" : "maximize",
			),
		);
	}

	duplicateLatest() {
		const sticky = this.getLatestSticky();
		if (sticky) {
			this.duplicate(sticky);
		}
	}

	moveToTop(sticky: Sticky) {
		this.highestZIndex++;
		sticky.style.zIndex = this.highestZIndex.toString();
		sticky.style.order = this.highestZIndex.toString();
		let idx = this.stickies.indexOf(sticky);
		if (idx !== -1) {
			this.stickies.splice(idx, 1);
			this.stickies.push(sticky);
			markDirtyAndSaveDocument();
		}
	}

	arrange() {
		// Filter out pinned stickies.
		const stickies: Sticky[] = [];
		for (const sticky of this.stickies) {
			if (!sticky.classList.contains("pin")) {
				stickies.push(sticky);
			}
		}

		const GAP = 0; // TODO: remove this variable since this bin packing algo will add gap?
		const crate = this.innerCrate;
		const crateMom = this.outerCrate;
		const transform = workspace.zoomable.getTransform();
		const offset = workspace.draggable.getOffset();
		const blocks = stickies.map((sticky) => ({
			left: sticky.offsetLeft,
			top: sticky.offsetTop,
			width: sticky.offsetWidth + GAP,
			height: sticky.offsetHeight + GAP,
		}));
		apocalypse.write({
			toString: () => "Arrange stickies",
			execute() {
				const fittedBlocks = pack(
					crateMom.offsetWidth / workspace.zoomable.scale,
					blocks,
				);

				onEventOrTimeout(
					crate,
					() => {
						crate.classList.remove("arranging");
						markDirtyAndSaveDocument();
					},
					"transitionend",
				);
				for (let i = 0; i < fittedBlocks.length; i++) {
					const sticky = stickies[i]!;
					const fitted = fittedBlocks[i];
					if (fitted) {
						sticky.setRect(fitted.left + GAP, fitted.top + GAP);
					}
				}
				workspace.zoomable.transformReset();
				workspace.draggable.offsetReset();
				crate.classList.add("arranging");
			},
			undo() {
				onEventOrTimeout(
					crate,
					() => {
						crate.classList.remove("arranging");
						markDirtyAndSaveDocument();
					},
					"transitionend",
				);
				workspace.zoomable.setTransform(transform);
				workspace.draggable.setOffset(offset);
				for (let i = 0; i < blocks.length; i++) {
					const sticky = stickies[i]!;
					const block = blocks[i]!;
					sticky.setRect(block.left, block.top);
				}
				crate.classList.remove("arranging");
			},
		});
	}

	getLatestSticky() {
		return this.stickies.at(-1);
	}

	getLatestStickyByType<K extends keyof PluginStickyPoolMap>(type: K) {
		for (let i = this.stickies.length - 1; i >= 0; i--) {
			if (this.stickies[i]?.type === type) {
				return this.stickies[i] as PluginStickyPoolMap[K];
			}
		}
		return null;
	}

	getAllStickies(): readonly Sticky[] {
		return this.stickies;
	}

	private _delete(sticky: Sticky) {
		const idx = this.stickies.indexOf(sticky);
		if (idx !== -1) {
			this.stickies.splice(idx, 1);
		}
		this.stickies.at(-1)?.focus();

		const model = getPluginStickyModel(sticky);
		if (model) {
			model.onDelete(sticky);
		}

		onEventOrTimeout(sticky, () => sticky.remove(), "animationend");
		sticky.classList.add("deleted");
	}

	private maximize(sticky: Sticky) {
		const width = this.outerCrate.offsetWidth / workspace.zoomable.scale;
		const height = this.outerCrate.offsetHeight / workspace.zoomable.scale;
		const matrix = new DOMMatrixReadOnly(
			getComputedStyle(this.innerCrate).transform,
		);
		const translateX = matrix.m41;
		const translateY = matrix.m42;
		const scale = workspace.zoomable.scale;
		const left = -this.innerCrate.offsetLeft / scale - translateX / scale;
		const top = -this.innerCrate.offsetTop / scale - translateY / scale;
		sticky.setRect(left, top, width, height);
		sticky.classList.add("maximized");
	}

	private minimize(sticky: Sticky, rect: Rectangle) {
		sticky.setRect(...rect);
		sticky.classList.remove("maximized");
	}

	private restoreSticky(options: StickyConfig) {
		const sticky = this.buildSticky("restore", options);
		this.stickies.push(sticky);
		this.innerCrate.appendChild(sticky);
	}

	private addToTop(sticky: Sticky) {
		this.stickies.push(sticky);
		this.moveToTop(sticky);
		this.innerCrate.appendChild(sticky);
	}

	createSticky(options: StickyConfig) {
		let backupOptions: StickyConfig;
		let sticky: Sticky;

		this.apocalypse.write({
			toString: () => "Create sticky",
			execute: () => {
				sticky = this.buildSticky("create", backupOptions ?? options);
				this.addToTop(sticky);
				backupOptions = sticky.save();
			},
			undo: () => {
				this.forceDelete(sticky);
			},
		});
	}

	getById(id: string) {
		for (const sticky of this.stickies) {
			if (sticky.id === id) {
				return sticky;
			}
		}
	}

	isCursorOutside(): boolean {
		return this._isCursorOutside;
	}

	getCenterPoint(): CursorPoint {
		// Return central point
		const rect = this.innerCrate.getBoundingClientRect();
		const width = this.outerCrate.offsetWidth / workspace.zoomable.scale;
		const height = this.outerCrate.offsetHeight / workspace.zoomable.scale;
		return [
			-rect.x / this.zoomable.scale + width / 2,
			-rect.y / this.zoomable.scale + height / 2,
		];
	}
}

let mouseTarget: HTMLElement;
document.addEventListener(
	"mouseover",
	(e) => (mouseTarget = e.target as HTMLElement),
);

/**
 * NaN means that there is the cursor point is not initialized.
 * Since we need crate to be append first to get the width and height.
 * TODO: We use this ugly approach to judge whether the point is ready for use.
 *
 * :: I avoid (number | null) since it will cause more type issue. However, current approach is inconsist.
 * e.g. the Rectangle type accept null.
 */
type CursorPoint = [number, number];
function buildBuildSticky(workspace: Workspace) {
	return function buildSticky(
		buildType: "create" | "restore",
		{
			id,
			type,
			rect,
			zIndex,
			className,
			dataset,
			pluginConfig,
		}: StickyConfig = {},
	) {
		const sticky = getTemplate<HTMLDivElement>("sticky");
		sticky.id = id ?? crypto.randomUUID();

		// x, y will be overwrite by rect (if defined)
		let [x, y] = workspace.cursorPoint;
		const isCursorNotReady = isNaN(x);
		if (isCursorNotReady || mouseTarget?.closest("#navbar")) {
			[x, y] = workspace.getCenterPoint();
			y -= defaultWidth / 2;
		}

		if (rect) {
			const [left, top, width, height] = rect;

			if (typeof left === "number") {
				sticky.style.left = `${left}px`;
			} else {
				sticky.style.left = `${x - defaultWidth / 2}px`;
			}

			if (typeof top === "number") {
				sticky.style.top = `${top}px`;
			} else {
				sticky.style.top = `${y - 10}px`;
			}

			if (typeof width === "number") {
				sticky.style.width = `${width}px`;
			}

			if (typeof height === "number") {
				sticky.style.height = `${height}px`;
			}
		} else {
			sticky.style.left = `${x - defaultWidth / 2}px`;
			sticky.style.top = `${y - 10}px`;
			sticky.style.width = `${defaultWidth}px`;
			sticky.style.height = `${defaultWidth}px`;
		}
		if (zIndex) {
			sticky.style.zIndex = zIndex.toString();
		}
		if (className) {
			sticky.className = className;
		}
		if (dataset) {
			for (const [key, value] of Object.entries(dataset)) {
				sticky.dataset[key] = value as string;
			}
		}

		function enableStickyFunctionality(): Sticky {
			const stickyHeader = sticky.$<HTMLDivElement>(".stickyHeader")!;
			const deleteBtn = sticky.$<HTMLButtonElement>(".deleteBtn")!;
			const maximizeToggleLbl =
				sticky.$<HTMLLabelElement>(".maximizeToggleLbl")!;

			new Draggable(
				sticky,
				(() => {
					let write: Overwrite<Rectangle>;
					return {
						interactEl: stickyHeader,
						container: workspace.outerCrate,
						padding: 20,
						onDragStart: () => {
							const rect = extractRect(sticky);
							if (sticky.classList.contains("maximized")) {
								workspace.dispatchEvent(
									new CustomEvent<Sticky>("dragminimize", {
										detail: sticky as Sticky,
									}),
								);
							} else {
								// When we are doing normal dragging, do not restore width and height
								// Only restore width and height when "drag to minimize".
								rect[2] = null;
								rect[3] = null;
							}
							write = workspace.apocalypse.checkpoint(rect);
						},
						onDragEnd: () => {
							const currRect = extractRect(sticky);
							write({
								execute() {
									sticky.setRect(...currRect);
								},
								undo(rect) {
									sticky.setRect(...rect);
								},
							});
						},
					};
				})(),
				workspace.zoomable,
			);
			new Resizable(
				sticky,
				(() => {
					let write: Overwrite<Rectangle>;
					return {
						onResizeStart: () => {
							const rect = extractRect(sticky);
							write = workspace.apocalypse.checkpoint(rect);
						},
						onResizeEnd: () => {
							const currRect = extractRect(sticky);
							write({
								execute() {
									sticky.setRect(...currRect);
								},
								undo(rect) {
									sticky.setRect(null, null, rect[2], rect[3]);
								},
							});
						},
					};
				})(),
				workspace.zoomable,
			);

			const extendedSticky = sticky as Sticky;

			Object.assign(sticky, {
				delete() {
					workspace.delete(extendedSticky);
				},
				forceDelete() {
					workspace.forceDelete(extendedSticky);
				},
				duplicate() {
					workspace.duplicate(extendedSticky);
				},
				toggleMaximize() {
					workspace.toggleMaximize(extendedSticky);
				},
				toggleGhostMode() {
					sticky.classList.toggle("ghost");
				},
				togglePin() {
					sticky.classList.toggle("pin");
					if (sticky.classList.contains("pin")) {
						sticky.dispatchEvent(new CustomEvent("pin"));
					} else {
						sticky.dispatchEvent(new CustomEvent("unpin"));
					}
				},
				addControlWidget(element: HTMLElement) {
					sticky
						.$<HTMLDivElement>(".stickyControls slot")!
						.appendChild(element);
					return extendedSticky;
				},
				setTitle(title: string) {
					sticky.$<HTMLDivElement>(".stickyTitle")!.textContent = title;
				},
				replaceBody(...nodes: (Node | string)[]) {
					sticky.$(".stickyBody")!.replaceChildren(...nodes);
				},
				plugin: {},
				save() {
					const config: StickyConfig = {
						id: extendedSticky.id,
						type: extendedSticky.type,
						className: sticky.className,
					};
					config.rect = extractRect(sticky);
					// Convert DOMStringMap to plain js object.
					config.dataset = Object.fromEntries(Object.entries(sticky.dataset));
					const zIndex = sticky.style.zIndex;
					if (zIndex !== "") {
						config.zIndex = parseInt(zIndex);
					}

					return config;
				},
			});

			sticky.on("pointerdown", (e) => {
				if (e.button !== 2 /* NOT right-click */) {
					workspace.moveToTop(extendedSticky);
				}
			});

			deleteBtn.on("click", () => {
				extendedSticky.delete();
			});

			maximizeToggleLbl.on("change", () => {
				extendedSticky.toggleMaximize();
			});

			mutationObserver.observe(sticky, { attributeFilter: ["class"] });

			// colorful outline
			// [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });

			return sticky as Sticky;
		}
		// TODO: should not return?
		const basicSticky = enableStickyFunctionality();
		basicSticky.dataset.contextMenu = "basic";
		if (type) {
			const model = pluginStickyPool.get(type);
			if (model) {
				if (buildType === "create") {
					model.onCreate(basicSticky);
					basicSticky.classList.add(type);
					basicSticky.type = type;
				} else if (buildType === "restore") {
					model.onRestore(basicSticky, pluginConfig);
				}
			} else {
				throw Error(
					`Plugin sticky type [ ${type} ] not found. Please register sticky type first via 'registerSticky'.`,
				);
			}
		}
		n81i.translateElement(basicSticky);

		return basicSticky;
	};
}

export const workspace = new Workspace(apocalypse);

const pluginStickyPool = new Map<
	string,
	PluginStickyModel<PluginSticky, PluginStickyConfig>
>();

type Rectangle = [
	left: number | null,
	top: number | null,
	width: number | null,
	height: number | null,
];

function extractRect(element: HTMLElement): Rectangle {
	return [
		element.offsetLeft,
		element.offsetTop,
		element.offsetWidth,
		element.offsetHeight,
	];
}
function parseRect(rect: string): Rectangle {
	const numbers = rect.split(",");
	if (numbers.length === 4) {
		return numbers.map((n) => {
			const num = parseInt(n);
			if (isNaN(num)) {
				return null;
			} else {
				return num;
			}
		}) as Rectangle;
	} else {
		throw Error(
			`Rectangle string must have 4 value seperated with comma. [ ${rect} ] has length [ ${numbers.length} ].`,
		);
	}
}

export interface PluginStickyConfig extends Record<string, unknown> {}
export interface PluginStickyModel<
	S extends PluginSticky,
	C extends PluginStickyConfig,
> {
	type: string;
	css?: string;
	onCreate(sticky: Sticky<S, C>): void;
	onSave(sticky: Sticky<S, C>): C | void;
	onDelete(sticky: Sticky<S, C>): void;
	onRestore(sticky: Sticky<S, C>, config?: C): void;
}

const sheetRegistry = new Map<string, CSSStyleSheet>();
export function registerSticky<
	S extends PluginSticky,
	C extends PluginStickyConfig,
>(model: PluginStickyModel<S, C>) {
	if (pluginStickyPool.has(model.type)) {
		console.warn(
			`Overwriting existing plugin sticky [ ${model.type} ]. You should only do this while development.`,
		);
	}

	if (model.css) {
		let css: string;
		const validatorEl = document.createElement("i");
		validatorEl.style.cssText = model.css;
		if (validatorEl.style.cssText !== "") {
			// Inline css
			// Accepts "padding: 0" or "padding: 0; height: 10px", etc.
			css = `.${model.type}{${validatorEl.style.cssText}}`;
		} else {
			// Non-inline css
			// Trust user's css is valid
			css = `.${model.type}{${model.css}}`;
		}
		if (sheetRegistry.has(model.type)) {
			// Already exists, replace it.
			sheetRegistry.get(model.type)?.replaceSync(css);
		} else {
			// Does not exists, add new one.
			sheetRegistry.set(model.type, addCss(css));
		}
	}

	pluginStickyPool.set(model.type, model);
}

export function getPluginStickyModel(sticky: HTMLDivElement | Sticky) {
	for (const className of sticky.classList.values()) {
		const model = pluginStickyPool.get(className);
		if (model) {
			return model;
		}
	}
}

export function getPluginStickyTypes() {
	return [...pluginStickyPool.values()].map(({ type }) => type);
}

addTodoBeforeSave(() => {
	dataset.setItem("workspace", workspace.saveWork());
});
addTodoAfterLoad(() => {
	const config = dataset.getItem<WorkspaceConfig>("workspace");
	if (config) {
		workspace.zoomable.setTransform(config.transform);
		workspace.draggable.setOffset(config.offset);
		workspace.restoreAndReplaceAll(config.stickies);
	}
});
