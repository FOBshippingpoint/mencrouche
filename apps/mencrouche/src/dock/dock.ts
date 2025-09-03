import { forkTemplate } from "../utils/forkTemplate";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "../dataWizard";
import { $, addCss } from "../utils/tools";
import { registerContextMenu } from "../contextMenu";
import { bakeBean, soakBean } from "../utils/bean";
import { markDirtyAndSaveDocument } from "../lifesaver";
import type {
	Dock,
	DockPluginModel,
	DockConfig,
	DockPluginKey,
	Placement,
} from "@mencrouche/types";

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
const isDockHiddenChk = dockAppearanceDialog.$<HTMLInputElement>(
	'[name="isDockHidden"]',
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
isDockHiddenChk.on("change", () => {
	currentDock.classList.toggle("none", isDockHiddenChk.checked);
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

const pluginDockPool = new Map<DockPluginKey, DockPluginModel<DockPluginKey>>();
const docks: Dock[] = [];

const sheetRegistry = new Map<DockPluginKey, CSSStyleSheet>();
export function registerDock<K extends DockPluginKey>(
	model: DockPluginModel<K>,
) {
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
	const dock = forkTemplate<HTMLDivElement>("dockWidgets");
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
			isDockHiddenChk.checked = currentDock.isHidden;
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
	const interval = setInterval(() => {
		try {
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
			clearInterval(interval);
		} catch (error) {}
	}, 10);
});
