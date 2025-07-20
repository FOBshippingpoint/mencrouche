import "./component/iconToggle";
import "./component/imagePicker";
import { workspace, getStickyPluginModelByType } from "./sticky/sticky";
import { $, n81i } from "./utils/tools";
import {
	allowScriptExecutionIfNotYetSet,
	AVAILABLE_LOCALES,
	createDockAppearanceItem,
	createShortcutItem,
	grantScriptPermission,
	isScriptExecutionAllowed,
	toggleSettingsPage,
} from "./settings";
import { addPublicApi } from "./publicApi";
import { initMarkdownSticky } from "./stickyPlugins/markdown";
import { initSpotifySticky } from "./stickyPlugins/spotify";
import { initYouTubeSticky } from "./stickyPlugins/youtube";
import { registerContextMenu } from "./contextMenu";
import type { MenuItem } from "@mencrouche/types";
import { shortcutManager } from "./shortcutManager";
import { loadDocument, saveDocument } from "./lifesaver";
import { addTodoAfterLoad, dataset } from "./dataWizard";
import { executeCommand, registerCommand } from "./commands";
import type { Command } from "@mencrouche/types";
import { initNoteSticky } from "./stickyPlugins/note";
import { initIFrameSticky } from "./stickyPlugins/iframe";
import { initClockDock } from "./dockPlugins/clock";
import { initBookmarkDock } from "./dockPlugins/bookmarker";
import { isSmallScreen } from "./utils/screenSize";
import { createDock, getDockPluginTypes } from "./dock/dock";
import { initImageSticky } from "./stickyPlugins/image";

const defaultCommands: Command[] = [
	{
		name: "toggleSettings",
		execute() {
			toggleSettingsPage();
		},
		defaultShortcut: "C-,",
	},
	{
		name: "toggleDarkMode",
		execute() {
			dataset.derivedSetItem("theme", (theme) =>
				theme === "light" ? "dark" : "light",
			);
		},
		defaultShortcut: "C-S-l",
	},
	{
		name: "openYoutube",
		execute() {
			window.open("https://youtube.com", "_blank")!.focus();
		},
		defaultShortcut: "C-o",
	},
	{
		name: "saveDocument",
		execute() {
			saveDocument();
		},
		defaultShortcut: "C-s",
	},
	{
		name: "toggleGlobalGhostMode",
		execute() {
			dataset.derivedSetItem<boolean>(
				"isGhostMode",
				(isGhostMode) => !isGhostMode,
			);
		},
		defaultShortcut: "C-A-g",
	},
	{
		name: "deleteAllStickies",
		execute() {
			workspace.deleteAll();
		},
		defaultShortcut: "C-A-x",
	},
	{
		name: "markdown__addSticky",
		execute() {
			workspace.createSticky({ type: "markdown" });
		},
		defaultShortcut: "C-A-m",
	},
	{
		name: "youtube__addSticky",
		execute() {
			workspace.createSticky({ type: "youtube" });
		},
		defaultShortcut: "C-A-y",
	},
	{
		name: "spotify__addSticky",
		execute() {
			workspace.createSticky({ type: "spotify" });
		},
		defaultShortcut: "C-A-s",
	},
	{
		name: "iframe__addSticky",
		execute() {
			workspace.createSticky({ type: "iframe" });
		},
		defaultShortcut: "C-A-w",
	},
	{
		name: "note__addSticky",
		execute() {
			workspace.createSticky({ type: "note" });
		},
		defaultShortcut: "C-A-n",
	},
	{
		name: "image__addSticky",
		defaultShortcut: "C-A-i",
		execute() {
			workspace.createSticky({ type: "image" });
		},
	},
	{
		name: "deleteSticky",
		execute() {
			workspace.deleteLatest();
		},
		defaultShortcut: "A-w",
	},
	{
		name: "toggleAutoArrange",
		execute() {
			workspace.arrange();
		},
		defaultShortcut: "A-r",
	},
	{
		name: "toggleSplitView",
		execute() {
			workspace.getLatestStickyByType("markdown")?.plugin.toggleSplitView();
		},
		defaultShortcut: "A-v",
	},
	{
		name: "toggleMaximizeSticky",
		execute() {
			workspace.getLatestSticky()?.toggleMaximize();
		},
		defaultShortcut: "A-m",
	},
	{
		name: "toggleStickyEditMode",
		execute() {
			workspace.getLatestStickyByType("markdown")?.plugin.toggleEditMode();
		},
		defaultShortcut: "A-e",
	},
	{
		name: "toggleStickyPinMode",
		execute() {
			workspace.getLatestSticky()?.togglePin();
		},
		defaultShortcut: "A-p",
	},
	{
		name: "toggleGhostMode",
		execute() {
			workspace.getLatestSticky()?.toggleGhostMode();
		},
		defaultShortcut: "A-g",
	},
	{
		name: "duplicateSticky",
		execute() {
			workspace.duplicateLatest();
		},
		defaultShortcut: "C-d",
	},
	{
		name: "zoomIn",
		execute() {
			workspace.zoomable.zoomIn();
		},
		defaultShortcut: "C-=", // C + plus key
	},
	{
		name: "zoomOut",
		execute() {
			workspace.zoomable.zoomOut();
		},
		defaultShortcut: "C-dash", // `-` is `dash` in kikey lib
	},
	{
		name: "zoomReset",
		execute() {
			workspace.zoomable.zoomReset();
		},
		defaultShortcut: "C-0",
	},
];

function getUserPreferredLanguage() {
	// e.g. zh-TW => zh_TW to fit chrome webextension locales.
	// See also: https://developer.chrome.com/docs/extensions/reference/api/i18n
	const lang = (navigator.language as any).replaceAll("-", "_");
	if (
		/* If supports user language */
		AVAILABLE_LOCALES.includes(lang)
	) {
		return lang;
	} else {
		return "en";
	}
}

n81i.init({
	locale: dataset.getOrSetItem<string>("locale", getUserPreferredLanguage()),
	availableLocales: AVAILABLE_LOCALES,
	fallback: "en",
	resourceLoader: async (locale: string) => {
		const url = `/_locales/${locale}/messages.json`;
		const response = await fetch(url);
		return await response.json();
	},
});
n81i.translatePage();

async function main() {
	// Register menu items
	const menuItems = [
		{
			name: "note__addSticky",
			icon: "lucide:plus",
			execute() {
				executeCommand("note__addSticky");
			},
		},
		(() => {
			const otherAddStickyMenuItem: MenuItem = {
				name: "otherAddStickyGroup",
				subMenus: [],
			};
			window.on("registerSticky", (e) => {
				const modelType: string = (e as CustomEvent).detail.type;
				if (modelType !== "note") {
					// skip note since we add it before.
					const model = getStickyPluginModelByType(modelType)!;
					otherAddStickyMenuItem.subMenus?.push({
						name: `${modelType}__addSticky`,
						icon: model.meta?.contextMenuIcon,
						execute() {
							executeCommand(`${modelType}__addSticky`);
						},
					});
				}
			});

			return () => otherAddStickyMenuItem;
		})(),
	];

	workspace.outerCrate.dataset.contextMenu = "main";
	registerContextMenu("main", menuItems);

	// Register custom stickies.
	initMarkdownSticky();
	initSpotifySticky();
	initYouTubeSticky();
	initNoteSticky();
	initIFrameSticky();

	// Register custom docks.
	initClockDock();
	initBookmarkDock();
	initImageSticky();

	try {
		await loadDocument();
		allowScriptExecutionIfNotYetSet();
		// if (isScriptExecutionAllowed()) {
		// 	// Make sure user want to execute script from third party.
		// 	await grantScriptPermission();
		// }
	} catch (error) {
		console.log(error);
	}
	$("#workspaceSlot")!.appendChild(workspace.outerCrate);
	workspace.outerCrate.dispatchEvent(
		new CustomEvent("workspaceConnected", { bubbles: true }),
	);

	// Register default commands.
	for (const command of defaultCommands) {
		registerCommand(command);
	}
	// Create shortcut editor DOM
	for (const action of shortcutManager.getAllActions()) {
		createShortcutItem(action);
	}
	// Create dock appearance DOM
	for (const dockType of getDockPluginTypes()) {
		createDockAppearanceItem(dockType);
	}

	if (!$(".dock.bookmarker")) {
		if (isSmallScreen()) {
			createDock({ type: "bookmarker", placement: "bottom", grow: true });
		} else {
			createDock({ type: "bookmarker", placement: "right" });
		}
	}
	if (!$(".dock.clock")) {
		createDock({ type: "clock", placement: "bottomLeft" });
	}
}

addPublicApi();
main();

// Tracking...
if (
	import.meta.env.IS_DEV_MODE !== "true" &&
	import.meta.env.UMAMI_WEBSITE_ID
) {
	const tag = document.createElement("script");
	tag.src = "https://cloud.umami.is/script.js";
	tag.defer = true;
	tag.dataset.websiteId = import.meta.env.UMAMI_WEBSITE_ID;
	const firstScriptTag = document.getElementsByTagName("script")[0];
	firstScriptTag?.parentNode!.insertBefore(tag, firstScriptTag);
}
