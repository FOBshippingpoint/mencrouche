import { getTemplate } from "../utils/getTemplate";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "../dataWizard";
import { $, addCss } from "../utils/dollars";
import { registerContextMenu } from "../contextMenu";
import { bakeBean, soakBean } from "../utils/bean";
import { markDirtyAndSaveDocument } from "../lifesaver";

function getDockSlot(): HTMLSlotElement {
	const dockSlot = $<HTMLSlotElement>(".dockSlot");
	if (!dockSlot) {
		throw Error("should get dockSlot element");
	}
	return dockSlot;
}
const dockAppearanceDialog = $<HTMLDialogElement>("#dockAppearanceDialog")!;
const alwaysOnTopChk = dockAppearanceDialog.$<HTMLInputElement>(
	'[name="alwaysOnTop"]',
)!;
const transparentBackgroundChk = dockAppearanceDialog.$<HTMLInputElement>(
	'[name="transparentBackground"]',
)!;
const placementBtns = dockAppearanceDialog.$$<HTMLButtonElement>(
	"#dockPlacementSelector button",
);

let currentDock: Dock;
let backup: Record<string, unknown>;
let shouldRestore = true;
dockAppearanceDialog.$('[data-i18n="cancelSubmitBtn"]')!.on("click", () => {
	dockAppearanceDialog.close();
});
dockAppearanceDialog.$('[data-i18n="submitBtn"]')!.on("click", () => {
	shouldRestore = false; // keep changes
	dockAppearanceDialog.close();
	markDirtyAndSaveDocument();
});
dockAppearanceDialog.on("close", () => {
	if (shouldRestore) {
		soakBean(currentDock, backup);
	}
});
alwaysOnTopChk.on("change", () => {
	currentDock.classList.toggle("alwaysOnTop");
});
transparentBackgroundChk.on("change", () => {
	currentDock.classList.toggle("surface");
	currentDock.classList.toggle("shadow");
});
for (const btn of placementBtns) {
	btn.on("click", () => {
		placementBtns.forEach((other) => {
			if (other !== btn) {
				other.className = "";
			}
		});

		const placement = btn.dataset.placement as Placement;
		if (btn.classList.contains("active")) {
			btn.classList.toggle("grow");
		}
		btn.classList.add("active");
		const grow = btn.classList.contains("grow");
		placeElement(currentDock, placement, grow);
	});
}

export interface DockPluginRegistry extends Record<string, DockPlugin> {
	default: DockPlugin;
}
type PluginKey = keyof DockPluginRegistry;

type GetPluginType<K extends PluginKey> = Omit<DockPluginRegistry[K], "config">;

type GetConfigType<K extends PluginKey> = DockPluginRegistry[K]["config"];

export interface DockPlugin {
	config: Record<string, unknown>;
}
export interface DockConfig<K extends PluginKey = "default"> {
	id?: string;
	type?: K | string;
	zIndex?: number;
	className?: string;
	pluginConfig?: GetConfigType<K>;
	dataset?: Record<string, unknown>;
	placement?: Placement;
	grow?: boolean;
}

export interface Dock<K extends PluginKey = "default"> extends HTMLDivElement {
	type: string;
	replaceBody: (...nodes: (Node | string)[]) => void;
	save: () => GetConfigType<K>;
	plugin: GetPluginType<K>;
	pluginConfig?: GetConfigType<K>;
	placeAt(placement: Placement, grow: boolean): void;
}

type Placement =
	| "center"
	| "topLeft"
	| "top"
	| "topRight"
	| "right"
	| "bottomRight"
	| "bottom"
	| "bottomLeft"
	| "left";

const pluginDockPool = new Map<PluginKey, DockPluginModel<PluginKey>>();
const docks: Dock[] = [];

export interface DockPluginModel<K extends PluginKey> {
	type: K;
	css?: string;
	onSave(dock: Dock<K>): GetConfigType<K> | void;
	onDelete(dock: Dock<K>): void;
	onMount(dock: Dock<K>, origin: "create" | "restore"): void;
}

const sheetRegistry = new Map<PluginKey, CSSStyleSheet>();
export function registerDock<K extends PluginKey>(model: DockPluginModel<K>) {
	if (pluginDockPool.has(model.type)) {
		console.warn(
			`Overwriting existing plugin dock [ ${model.type} ]. You should only do this while development.`,
		);
	}

	// TODO duplicate in sticky.ts
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

	pluginDockPool.set(model.type, model);
}

export function createDock(options: DockConfig) {
	if (!pluginDockPool.has(options.type ?? "")) {
		throw Error(
			`Dock type [ ${options.type} ] not found. Please register dock type first via 'registerDock'.`,
		);
	}
	const model = pluginDockPool.get(options.type ?? "")!;
	const dock = getTemplate<HTMLDivElement>("dockWidgets");
	const _dock = dock as Dock;
	dock.id = options.id ?? crypto.randomUUID();
	dock.className = options.className ?? `${dock.className} ${options.type}`;
	_dock.pluginConfig = options.pluginConfig;
	placeElement(dock, options.placement ?? "center", options.grow ?? false);

	Object.assign(dock, {
		plugin: {},
		placeAt(placement: Placement, grow: boolean) {
			placeElement(dock, placement, grow);
		},
		replaceBody(...nodes: (Node | string)[]) {
			dock.$("slot")!.replaceChildren(...nodes);
		},
		save() {
			const pluginConfig = model.onSave(_dock);
			const config: Partial<DockConfig> = {};
			if (pluginConfig) {
				config.pluginConfig = pluginConfig;
			}
			config.id = dock.id;
			config.type = options.type;
			config.className = dock.className;
			config.placement = dock.dataset.placement! as Placement;
			config.grow = dock.dataset.grow === "true";
			return config;
		},
	});

	model.onMount(_dock, "create");
	getDockSlot().appendChild(dock);
	docks.push(_dock);

	return _dock;
}

export function getDockPluginModel(dock: Dock | HTMLElement) {
	for (const className of dock.classList.values()) {
		const model = pluginDockPool.get(className);
		if (model) {
			return model;
		}
	}
}

export function getDockPluginTypes() {
	return [...pluginDockPool.values()].map(({ type }) => type);
}

export function getAllDocks() {
	return docks;
}

function placeElement(
	element: HTMLElement,
	placement: Placement,
	grow: boolean,
) {
	element.classList.add("dock");
	element.dataset.placement = placement;
	element.dataset.grow = grow ? "true" : "false";

	if (grow) {
		const isVertical = "left right".includes(placement);
		element.dataset.grow = isVertical ? "vertical" : "horizontal";
		if ("topLeft topRight bottomLeft bottomRight".includes(placement)) {
			element.dataset.grow = "horizontal";
		}
	} else {
		element.dataset.grow = "none";
	}
}

registerContextMenu("dock", [
	{
		name: "editDockAppearanceMenuItem",
		icon: "lucide-paintbrush",
		execute(dock: any) {
			currentDock = dock as Dock;
			backup = bakeBean(dock, "class");
			placementBtns.forEach((btn) => (btn.className = ""));
			dockAppearanceDialog.$(
				`button[data-placement="${currentDock.dataset.placement}"]`,
			)!.className = "active";
			alwaysOnTopChk.checked = currentDock.classList.contains("alwaysOnTop");
			transparentBackgroundChk.checked =
				!currentDock.classList.contains("surface");
			dockAppearanceDialog.showModal();
			shouldRestore = true;
		},
	},
]);

addTodoBeforeSave(() => {
	dataset.setItem(
		"docks",
		docks.map((dock) => dock.save()),
	);
});
addTodoAfterLoad(() => {
	// TODO:
	// I'm not happy with this approach
	// Might integrate dock into workspace in future.
	window.on("workspaceConnected", () => {
		// Clear all docks
		getDockSlot().replaceChildren();
		// Restore docks
		const dockConfigs = dataset.getItem<DockConfig[]>("docks");
		if (dockConfigs) {
			for (const dockConfig of dockConfigs) {
				const dock = createDock(dockConfig);
				const model = pluginDockPool.get(dockConfig.type ?? "");
				if (model) {
					model.onMount(dock, "restore");
				} else {
					throw Error(
						`Failed to restore dock type [ ${dockConfig.type} ]. Please register dock type first via 'registerDock'.`,
					);
				}
			}
		}
	});
});
