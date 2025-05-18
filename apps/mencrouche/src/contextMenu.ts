import { $, $$$, n81i } from "./utils/tools";
import { getTemplate } from "./utils/getTemplate";
import type { MenuItem, MenuItemDefinition } from "@mencrouche/types";

const contextMenu = $<HTMLDivElement>("#contextMenu")!;
const registry = new Map();

function isIOS() {
	return (
		[
			"iPad Simulator",
			"iPhone Simulator",
			"iPod Simulator",
			"iPad",
			"iPhone",
			"iPod",
		].includes(navigator.platform) ||
		// iPad on iOS 13 detection
		(navigator.userAgent.includes("Mac") && "ontouchend" in document)
	);
}

function showContextMenu(e: MouseEvent | CustomEvent) {
	const target = (e.target as HTMLElement).closest("[data-context-menu]") as
		| HTMLElement
		| undefined;

	if (!target) {
		return;
	}

	const keys = target.dataset.contextMenu!.split(" ");
	const frag = document.createDocumentFragment();
	for (const key of keys ?? []) {
		const menuItems = registry.get(key);
		if (menuItems === undefined) {
			throw Error(
				`Context menu [ ${key} ] not found. Please register context menu first via 'registerContextMenu'.`,
			);
		}
		frag.appendChild(buildMenuItems(menuItems, target));
	}
	contextMenu.replaceChildren(frag);

	e.preventDefault();
	contextMenu.classList.remove("none");

	let x: number;
	let y: number;
	if (e instanceof MouseEvent) {
		x = e.clientX;
		y = e.clientY;
	} else {
		x = e.detail.originalEvent.clientX;
		y = e.detail.originalEvent.clientY;
	}

	const docRect = document.body.getBoundingClientRect();
	const menuRect = contextMenu.getBoundingClientRect();

	contextMenu.style.top = `${Math.min(y, docRect.height - menuRect.height)}px`;
	contextMenu.style.left = `${Math.min(x, docRect.width - menuRect.width)}px`;
}

document.body.on("contextmenu", (e) => {
	if (e.shiftKey) return;
	if (!$("#settings")!.classList.contains("none")) return;
	if ((e.target as Element).matches("input,textarea,[contenteditable='true']"))
		return;
	if ((e.target as Element).closest('[data-context-menu="disabled"]')) return;

	showContextMenu(e);
});

if (isIOS()) {
	document.on("longpress", (e) => {
		showContextMenu(e as CustomEvent);
	});
}

document.on("click", (e) => {
	if (!(e as any).target.closest(".contextMenu")) {
		contextMenu.classList.add("none");
	}
});

let timer: number;
let isLongPress = false;

function startLongPress(e: PointerEvent) {
	timer = window.setTimeout(() => {
		isLongPress = true;
		const longPressEvent = new CustomEvent("longpress", {
			bubbles: true,
			cancelable: true,
			detail: { originalEvent: e },
		});
		e.target?.dispatchEvent(longPressEvent);
	}, 1500);
}

function endLongPress(event: PointerEvent) {
	clearTimeout(timer);
	if (isLongPress) {
		event.preventDefault();
	}
	isLongPress = false;
}

document.body.on("pointerdown", startLongPress);
document.body.on("pointerup", endLongPress);
document.body.on("pointercancel", endLongPress);
document.body.on("pointerleave", endLongPress);

/**
 * Registers a context menu (right-click menu) for elements with the specified data attribute.
 *
 * @param {string} name - The name identifier for the context menu. Elements with
 * `data-contextmenu="{name}"` attribute will trigger this menu on right-click.
 * Multiple context menus can be registered for the same element using whitespace separator.
 *
 * @param {MenuItem[]} menuItems - Array of menu items to display in the context menu.
 * Menu items can be:
 * - `MenuItemDefinition` objects (with name, icon, execute function, and/or subItems)
 * - `MenuItemBuilder` functions that return a MenuItemDefinition or null (nothing)
 * - "hr" string to insert a horizontal rule separator
 *
 * @example
 * ```typescript
 * // Register a simple context menu
 * registerContextMenu('imageMenu', [
 *   { name: 'view', icon: 'lucide-eye', execute: (target) => viewImage(target) },
 *   'hr', // Horizontal rule (<hr/>)
 *   { name: 'copy', icon: 'lucide-copy', execute: (target) => copyImage(target) }
 * ]);
 *
 * // With a menu builder function for conditional items
 * registerContextMenu('noteMenu', [
 *   { name: 'edit', execute: (target) => editNote(target) },
 *   (target) => {
 *     // Only show delete option for non-protected notes
 *     const note = target.closest('.note');
 *     return note?.dataset.protected !== 'true'
 *       ? { name: 'delete', execute: () => deleteNote(note) }
 *       : null;
 *   }
 * ]);
 * ```
 */
export function registerContextMenu(name: string, menuItems: MenuItem[]) {
	if (registry.has(name)) {
		console.warn(
			`Overwriting existing context menu [ ${name} ]. You should only do this while development.`,
		);
	}
	registry.set(name, menuItems);
}

function buildMenuItems(menuItems: MenuItem[], eventTarget: EventTarget) {
	// TODO:
	// this line used to decouple from dataset, but I think it has the room to improve.
	const theme = document.documentElement.dataset.theme;

	const frag = document.createDocumentFragment();
	for (const item of menuItems) {
		let menuItem: MenuItem | null = item;
		if (typeof item === "function") {
			menuItem = item(eventTarget);
			if (!menuItem) {
				continue;
			}
		}

		if (item === "hr") {
			frag.appendChild($$$("hr"));
		} else {
			const menuItemDef = menuItem as MenuItemDefinition;
			const btn = getTemplate<HTMLButtonElement>("menuItem");
			const iconL = btn.$<HTMLElement>(".icon.left")!;
			const span = btn.$("span")!;
			const iconR = btn.$<HTMLElement>(".icon.right")!;
			span.dataset.i18n = menuItemDef.name;

			function setIconProperty(iconEl: HTMLElement, iconName: string) {
				iconEl.classList.add("used");
				iconEl.style.setProperty(
					"--icon",
					`url("https://api.iconify.design/${iconName}.svg?color=${theme === "dark" ? "%23ffffff" : "%23000000"}")`,
				);
			}
			if (menuItemDef.icon) {
				setIconProperty(iconL, menuItemDef.icon);
			}
			if (menuItemDef.subItems) {
				setIconProperty(iconR, "lucide-chevron-right");
			}

			frag.appendChild(btn);
			if (menuItemDef.subItems) {
				const subItem = $$$("div");
				subItem.classList.add("subItem", "contextMenu");
				subItem.appendChild(buildMenuItems(menuItemDef.subItems, eventTarget));
				btn.insertAdjacentElement("beforeend", subItem);
				btn.dataset.subItemActive = "off";

				function showSubItems() {
					contextMenu
						.$$<HTMLDivElement>('[data-sub-item-active="on"]')
						.forEach((el) => {
							if (!el.contains(subItem)) {
								el.dataset.subItemActive = "off";
							}
						});
					btn.dataset.subItemActive = "on";
					if (
						document.body.getBoundingClientRect().right <
						subItem.getBoundingClientRect().right
					) {
						subItem.classList.add("expandLeft");
					}
					if (
						document.body.getBoundingClientRect().bottom <
						subItem.getBoundingClientRect().bottom
					) {
						subItem.classList.add("expandTop");
					}
				}

				btn.on("mouseenter", showSubItems);
				// btn.on("click", showSubItems);
			} else if (menuItemDef.execute) {
				btn.on("click", () => {
					contextMenu.classList.add("none");
					menuItemDef.execute!(eventTarget),
						{
							once: true,
						};
				});
			}
		}
	}
	n81i.translateElement(frag);

	return frag;
}
