import "./component/iconToggle";
import "./component/imagePicker";
import { workspace } from "./sticky/sticky";
import { $, h } from "./utils/dollars";
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
import { n81i } from "./utils/n81i";
import { registerContextMenu } from "./contextMenu";
import { shortcutManager } from "./shortcutManager";
import { loadDocument, saveDocument } from "./lifesaver";
import { addTodoAfterLoad, dataset } from "./dataWizard";
// The `url:` prefix is a custom prefix defined in `.parcelrc`.
// Which aims to get the url of transformed resource, in raw format.
// see https://github.com/parcel-bundler/parcel/issues/1080#issuecomment-557240449
// for more information
// TODO:
// Currently, this approach increase bundle size in webextension mode, we should
// find another way to dynamic import the url based on the current parcel
// command (website or ext).
// @ts-ignore
import en from "url:./_locales/en/messages.json";
// @ts-ignore
import zh_TW from "url:./_locales/zh_TW/messages.json";
// @ts-ignore
import ja from "url:./_locales/ja/messages.json";
import { executeCommand, registerCommand, type Command } from "./commands";
import { initNoteSticky } from "./stickyPlugins/note";
import { initIFrameSticky } from "./stickyPlugins/iframe";
import { initClockDock } from "./dockPlugins/clock";
import { initBookmarkDock } from "./dockPlugins/bookmarker";
import { isSmallScreen } from "./utils/screenSize";
import { createDock, getDockPluginTypes } from "./dock/dock";
import { initImageSticky } from "./stickyPlugins/image";

const urls = { en, zh_TW, ja };

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
		name: "addMarkdownSticky",
		execute() {
			workspace.createSticky({ type: "markdown" });
		},
		defaultShortcut: "C-A-m",
	},
	{
		name: "addYoutubeSticky",
		execute() {
			workspace.createSticky({ type: "youtube" });
		},
		defaultShortcut: "C-A-y",
	},
	{
		name: "addSpotifySticky",
		execute() {
			workspace.createSticky({ type: "spotify" });
		},
		defaultShortcut: "C-A-s",
	},
	{
		name: "addIFrameSticky",
		execute() {
			workspace.createSticky({ type: "iframe" });
		},
		defaultShortcut: "C-A-w",
	},
	{
		name: "addNoteSticky",
		execute() {
			workspace.createSticky({ type: "note" });
		},
		defaultShortcut: "C-A-n",
	},
	{
		name: "addImageSticky",
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
	const lang = navigator.language.replaceAll("-", "_");
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
		let url: string;
		if (window.browser) {
			url = `./_locales/${locale}/messages.json`;
		} else {
			url = (urls as any)[locale];
		}
		const response = await fetch(url);
		return await response.json();
	},
});
n81i.translatePage();

async function main() {
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

	const menuItems = [
		{
			name: "addNoteSticky",
			icon: "lucide-plus",
			execute() {
				executeCommand("addNoteSticky");
			},
		},
		{
			name: "addOtherStickyGroup",
			subItems: [
				{
					name: "addYoutubeSticky",
					icon: "lucide-youtube",
					execute() {
						executeCommand("addYoutubeSticky");
					},
				},
				{
					name: "addSpotifySticky",
					icon: "mdi:spotify",
					execute() {
						executeCommand("addSpotifySticky");
					},
				},
				{
					name: "addMarkdownSticky",
					icon: "ri:markdown-fill",
					execute() {
						executeCommand("addMarkdownSticky");
					},
				},
				{
					name: "addIFrameSticky",
					icon: "lucide:globe",
					execute() {
						executeCommand("addIFrameSticky");
					},
				},
				{
					name: "addImageSticky",
					icon: "lucide:image",
					execute() {
						executeCommand("addImageSticky");
					},
				},
			],
		},
	];
	workspace.outerCrate.dataset.contextMenu = "main";
	registerContextMenu("main", menuItems);

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
if (process.env.IS_DEV_MODE !== "true" && process.env.UMAMI_WEBSITE_ID) {
	const tag = document.createElement("script");
	tag.src = "https://cloud.umami.is/script.js";
	tag.defer = true;
	tag.dataset.websiteId = process.env.UMAMI_WEBSITE_ID;
	const firstScriptTag = document.getElementsByTagName("script")[0];
	firstScriptTag?.parentNode!.insertBefore(tag, firstScriptTag);
}
