export interface StickyPluginRegistry extends Record<string, StickyPlugin> {
	default: StickyPlugin;
}

export type StickyPluginKey = keyof StickyPluginRegistry;

type GetStickyPluginType<K extends StickyPluginKey> = Omit<
	StickyPluginRegistry[K],
	"config"
>;

type GetStickyConfigType<K extends StickyPluginKey> =
	StickyPluginRegistry[K]["config"];

export interface StickyPlugin {
	config: Record<string, unknown>;
}
export interface StickyConfig<K extends StickyPluginKey = "default"> {
	id?: string;
	type?: K | string;
	rect?: Rectangle;
	zIndex?: number;
	className?: string;
	pluginConfig?: GetStickyConfigType<K>;
	dataset?: Record<string, unknown>;
}
export interface Sticky<K extends StickyPluginKey = "default">
	extends HTMLDivElement {
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
	save: () => StickyConfig<K>;
	plugin: GetStickyPluginType<K>;
	pluginConfig?: GetStickyConfigType<K>;
}
export interface StickyPluginModel<K extends StickyPluginKey> {
	type: K;
	css?: string;
	onSave(sticky: Sticky<K>): GetStickyConfigType<K> | void;
	onDelete(sticky: Sticky<K>): void;
	onMount(sticky: Sticky<K>, origin: "create" | "restore"): void;
	meta?: {
		contextMenuIcon?: string;
	};
}
export interface WorkspaceConfig {
	/** CSS transform for crate. */
	transform: Transform;
	/** Offset left and offset top for crate. */
	offset: Offset;
	/** All stickies inside workspace. */
	stickies: StickyConfig[];
}

/**
 * NaN means that there is the cursor point is not initialized.
 * Since we need crate to be append first to get the width and height.
 * TODO: We use this ugly approach to judge whether the point is ready for use.
 *
 * :: I avoid (number | null) since it will cause more type issue. However, current approach is inconsist.
 * e.g. the Rectangle type accept null.
 */
export type CursorPoint = [number, number];

export declare class Workspace {
	refreshHighestZIndex(): void;
	restoreAndReplaceAll(stickies: StickyConfig[]): void;
	delete(sticky: Sticky): void;
	deleteLatest(): void;
	forceDelete(sticky: Sticky): void;
	forceDeleteAll(): void;
	deleteAll(): void;
	saveSticky(sticky: Sticky): StickyConfig<"default">;
	saveAllStickies(): StickyConfig<"default">[];
	/**
	 * Save stickies and workspace attributes.
	 * Use when serializing workspace.
	 */
	saveWork(): WorkspaceConfig;
	duplicate(sticky: Sticky): void;
	toggleMaximize(sticky: Sticky): void;
	duplicateLatest(): void;
	moveToTop(sticky: Sticky): void;
	arrange(): void;
	getLatestSticky(): Sticky<"default"> | undefined;
	getLatestStickyByType<K extends StickyPluginKey>(type: K): Sticky<K> | null;
	getAllStickies(): readonly Sticky[];
	createSticky(options: StickyConfig): void;
	getById(id: string): Sticky<"default"> | undefined;
	isCursorOutside(): boolean;
	getCenterPoint(): CursorPoint;
}

export declare function registerSticky<K extends StickyPluginKey>(
	model: StickyPluginModel<K>,
): void;
export declare function getStickyPluginModel<K extends StickyPluginKey>(
	sticky: HTMLDivElement | Sticky<K>,
): StickyPluginModel<K> | undefined;
export declare function getStickyPluginTypes(): (keyof import("@mencrouche/types").StickyPluginRegistry)[];
export declare function getStickyPluginModelByType<K extends StickyPluginKey>(
	type: K,
): StickyPluginModel<K> | undefined;

export type Rectangle = [
	left: number | null,
	top: number | null,
	width: number | null,
	height: number | null,
];

export interface Offset {
	offsetLeft: number;
	offsetTop: number;
}

export interface Transform {
	translateX: number;
	translateY: number;
	scale: number;
}

interface BaseCommand {
	name: string;
	defaultShortcut?: string;
	show?: () => boolean;
}
export interface NoArgCommand extends BaseCommand {
	execute: () => void;
}
export interface ArgCommand extends BaseCommand {
	execute: (argument: string) => void;
	argName: string;
}
export type Command = NoArgCommand | ArgCommand;

export interface MencroucheFileFormat extends Record<string, unknown> {
	mencroucheFileFormatVersion: number;
	timestamp: string;
}

interface MencroucheFileFormatVersion1 extends MencroucheFileFormat {
	mencroucheFileFormatVersion: 1;
	locale: string;
	isGhostMode: boolean;
	/**
	 * base64 url or other like imgur url.
	 */
	backgroundImageUrl: string;
	paletteHue: string;
	theme: "light" | "dark";
	workspace: WorkspaceConfig;
}

export interface MencroucheFileFormatVersionRegistry
	extends Record<number, MencroucheFileFormat> {
	1: MencroucheFileFormatVersion1;
}

/**
 * @interface MenuItemDefinition
 * @property {string} name - The display name of the menu item, used as a n18i key.
 * @property {string} [icon] - Optional icon name for the menu item (uses iconify format). You can go to https://icon-sets.iconify.design and copy "icon name" you like. (e.g., "ic:baseline-account-circle")
 * @property {Function} [execute] - Optional callback function executed when the menu item is clicked.
 * @property {MenuItem[]} [subMenus] - Optional array of sub-menu items for nested menus.
 */
export interface MenuItemDefinition {
	name: string;
	icon?: string;
	execute?: (eventTarget: EventTarget) => void;
	subMenus?: MenuItem[];
}

export type MenuItemBuilder = (
	eventTarget: EventTarget,
) => MenuItemDefinition | null | "hr";

export type MenuItem = MenuItemDefinition | MenuItemBuilder | "hr";

export interface DockPluginRegistry extends Record<string, DockPlugin> {
	default: DockPlugin;
}
export type DockPluginKey = keyof DockPluginRegistry;

type GetDockPluginType<K extends DockPluginKey> = Omit<
	DockPluginRegistry[K],
	"config"
>;

type GetDockConfigType<K extends DockPluginKey> =
	DockPluginRegistry[K]["config"];

export interface DockPlugin {
	config: Record<string, unknown>;
}
export interface DockConfig<K extends DockPluginKey = "default"> {
	id?: string;
	type?: K | string;
	zIndex?: number;
	className?: string;
	pluginConfig?: GetDockConfigType<K>;
	dataset?: Record<string, unknown>;
	placement?: Placement;
	grow?: boolean;
}

export interface Dock<K extends DockPluginKey = "default">
	extends HTMLDivElement {
	type: string;
	replaceBody: (...nodes: (Node | string)[]) => void;
	save: () => GetDockConfigType<K>;
	plugin: GetDockPluginType<K>;
	pluginConfig?: GetDockConfigType<K>;
	placeAt(placement: Placement, grow: boolean): void;
}

export interface DockPluginModel<K extends DockPluginKey> {
	type: K;
	css?: string;
	onSave(dock: Dock<K>): GetDockConfigType<K> | void;
	onDelete(dock: Dock<K>): void;
	onMount(dock: Dock<K>, origin: "create" | "restore"): void;
}

export type Placement =
	| "center"
	| "topLeft"
	| "top"
	| "topRight"
	| "right"
	| "bottomRight"
	| "bottom"
	| "bottomLeft"
	| "left";

export declare function executeCommand(commandName: string): void;
export type ExecuteCommand = typeof executeCommand;
export declare function registerCommand(command: Command): void;

import type { N81i } from "@mencrouche/n81i";
import type { $, $$, $$$, addCss } from "@mencrouche/dollars";
import type { Apocalypse } from "@mencrouche/apocalypse";

export declare function registerSticky<K extends StickyPluginKey>(
	model: StickyPluginModel<K>,
): void;
export declare function getStickyPluginModel<K extends StickyPluginKey>(
	sticky: HTMLDivElement | Sticky<K>,
): StickyPluginModel<K> | undefined;
export declare function getStickyPluginTypes(): (keyof import("@mencrouche/types").StickyPluginRegistry)[];
export declare function getStickyPluginModelByType<K extends StickyPluginKey>(
	type: K,
): StickyPluginModel<K> | undefined;

export interface TrayTipOptions {
	title?: string;
	message?: string;
	type?: "info" | "success" | "warning" | "error";
	onClose?: () => void;
	durationMs?: number;
}
/**
 * Displays a notification
 *
 * ```typesctip
 * trayTip({ title: "Copied", message: "Text copied to the clipboard." });
 * ```
 *
 * @returns - Control function to close the trayTip
 */
export declare function trayTip(options: TrayTipOptions): () => void;

export declare function createDock(options: DockConfig): Dock<"default">;

/**
 * Registers a context menu (right-click menu) for elements with the specified data attribute.
 *
 * @param {string} name - The name identifier for the context menu. Elements with
 * `data-contextmenu="{name}"` attribute will trigger this menu on right-click.
 * Multiple context menus can be registered for the same element using whitespace separator.
 *
 * @param {MenuItem[]} menuItems - Array of menu items to display in the context menu.
 * Menu items can be:
 * - `MenuItemDefinition` objects (with name, icon, execute function, and/or subMenus)
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
export declare function registerContextMenu(
	name: string,
	menuItems: MenuItem[],
): void;

declare global {
	interface Window {
		mc: {
			$: typeof $;
			$$: typeof $$;
			$$$: typeof $$$;
			n81i: typeof N81i;
			addCss: typeof addCss;
			dataset: {
				getItem<T extends unknown = unknown>(key: string): T | undefined;
				getItem<T>(key: string, defaultValue: T): T;
				getOrSetItem<T>(key: string, defaultValue: T): T;
				setItem<T>(key: string, value: T): void;
				derivedSetItem<T>(
					key: string,
					func: (oldValue: T | undefined) => T,
				): void;
				removeItem(key: string): void;
				on<T = unknown>(
					key: string,
					callback: (oldValue: T | undefined, newValue: T | undefined) => void,
				): () => void;
				off<T = unknown>(
					key: string,
					callback: (oldValue: T | undefined, newValue: T | undefined) => void,
				): void;
			};
			apocalypse: typeof Apocalypse;
			registerSticky: typeof registerSticky;
			trayTip: typeof trayTip;
			workspace: typeof Workspace;
			createDock: typeof createDock;
			executeCommand: typeof executeCommand;
			registerCommand: typeof registerCommand;
			getStickyPluginModel: typeof getStickyPluginModel;
			registerContextMenu: typeof registerContextMenu;
			getStickyPluginTypes: typeof getStickyPluginTypes;
		};
	}
}
