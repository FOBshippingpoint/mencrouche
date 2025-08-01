// settings.ts - Main settings module

import { createDialog } from "./generalDialog";
import { createKikey } from "kikey";
import { $, $$, $$$, n81i } from "./utils/tools";
import { anyUrlToDataUrl } from "./utils/toDataUrl";
import { keySequenceToString, shortcutManager } from "./shortcutManager";
import { getTemplate } from "./utils/getTemplate";
import { executeCommand } from "./commands";
import {
	addTodoAfterLoad,
	addTodoBeforeSave,
	dataset,
	JsonFileSource,
	loadFromSources,
	saveToSources,
} from "./dataWizard";
import {
	isCloudSyncEnabled,
	markDirtyAndSaveDocument,
	setIsCloudSyncEnabled,
} from "./lifesaver";
import type { ImageChangeDetail, ImagePicker } from "./component/imagePicker";
import type { IconToggle } from "./component/iconToggle";
import { type DockPluginRegistry } from "@mencrouche/types";
import { toBcp47LangTag } from "./utils/toBcp47LangTag";

export const AVAILABLE_LOCALES = ["en", "zh_TW", "ja"];

// -----------------------------------------------------------------------------
// Changes manager for tracking unsaved modifications
// -----------------------------------------------------------------------------
const changesManager = createChangesManager();

// -----------------------------------------------------------------------------
// DOM Element Selectors
// -----------------------------------------------------------------------------
const els = {
	settings: $<HTMLElement>("#settings")!,
	saveBtn: $<HTMLButtonElement>("#saveSettingsBtn")!,
	cancelBtn: $<HTMLButtonElement>("#cancelSettingsBtn")!,
	saveAndCloseBtn: $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!,
	settingsBtn: $<HTMLButtonElement>("#settingsBtn")!,

	// Cloud sync
	isCloudSyncEnabledCheckbox: $<HTMLInputElement>(
		'[name="isCloudSyncEnabled"]',
	)!,
	shareDataLinkBtn: $<HTMLButtonElement>("#shareDataLinkBtn")!,

	// Document management
	isAutoSaveEnabledCheckbox: $<HTMLInputElement>('[name="isAutoSaveEnabled"]')!,
	deleteDocumentBtn: $<HTMLButtonElement>("#deleteDocumentBtn")!,
	exportDocumentBtn: $<HTMLButtonElement>("#exportDocumentBtn")!,
	importDocumentBtn: $<HTMLButtonElement>("#importDocumentBtn")!,
	importDocumentFileInput: $<HTMLInputElement>("#importDocumentFileInput")!,

	// UI customization
	uiOpacityInput: $<HTMLInputElement>("#uiOpacityInput")!,
	hueWheel: $<HTMLDivElement>("#hueWheel")!,
	resetPaletteHueBtn: $<HTMLDivElement>("#setPaletteHueToDefaultBtn")!,
	backgroundImagePicker: $<ImagePicker>("image-picker")!,
	backgroundImageUrlInput: $<HTMLInputElement>("#backgroundImageUrlInput")!,
	resetBackgroundImageBtn: $<HTMLButtonElement>(
		"#setBackgroundImageToDefaultBtn",
	)!,
	themeToggle: $<IconToggle>("#themeToggle")!,
	langDropdown: $<HTMLSelectElement>("#langDropdown")!,

	// Custom code
	isScriptExecutionAllowedCheckbox: $<HTMLInputElement>(
		'[name="isScriptExecutionAllowed"]',
	)!,
	customJsTextArea: $<HTMLTextAreaElement>("#customJsTextArea")!,
	customJsSlot: $<HTMLSlotElement>("#customJsSlot")!,
	customCssTextArea: $<HTMLTextAreaElement>("#customCssTextArea")!,

	// Navigation and UI elements
	shortcutList: $<HTMLDivElement>("#shortcutList")!,
	dockAppearanceList: $<HTMLUListElement>("#dockAppearanceList")!,
	addStickyDropdownContainer: $<HTMLButtonElement>(
		"#addStickyDropdownContainer",
	)!,
	otherAddStickyBtn: $<HTMLButtonElement>(".otherAddStickyBtn")!,
	otherStickyDropdown: $<HTMLDivElement>(".dropdownButtons")!,
};

// -----------------------------------------------------------------------------
// Constants and Configuration
// -----------------------------------------------------------------------------

const dockAppearanceConfigMap: Record<keyof DockPluginRegistry, string> = {
	clock: "isDockClockHidden",
	bookmarker: "isDockBookmarkerHidden",
};

// CSS StyleSheet for custom CSS
const customCssStyleSheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(customCssStyleSheet);

// Kikey instance for shortcut recording
const recordingKikey = createKikey();

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function createChangesManager() {
	type Todo = () => void;
	const todos = new Map<string, Todo>();
	let isDirty = false;

	return {
		isDirty() {
			return isDirty;
		},
		markDirty() {
			isDirty = true;
		},
		setChange(key: string, todo: Todo) {
			todos.set(key, todo);
			isDirty = true;
		},
		onRevert() {},
		save() {
			for (const todo of todos.values()) {
				todo();
			}
			markDirtyAndSaveDocument();
			isDirty = false;
		},
		cancel() {
			this.onRevert?.();
			todos.clear();
			isDirty = false;
		},
	};
}

function setCssProperty(name: string, value: string | null | undefined) {
	if (value === null || value === undefined) {
		document.documentElement.style.removeProperty(name);
	} else {
		document.documentElement.style.setProperty(name, value);
	}
}

function queryPrefersColorScheme(): "dark" | "light" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

async function changeBackgroundImage(url: string | undefined) {
	if (url?.startsWith("blob")) {
		url = await anyUrlToDataUrl(url);
	}
	setCssProperty(
		"--pageBackground",
		url ? `url(${url}) no-repeat center center fixed` : "unset",
	);
	if (url) {
		$("#viewport")!.classList.remove("patternBg");
	} else {
		$("#viewport")!.classList.add("patternBg");
	}
}

// -----------------------------------------------------------------------------
// Dialog Creation
// -----------------------------------------------------------------------------

const unsavedChangesAlertDialog = createDialog({
	title: "unsavedChanges",
	message: "unsavedChangesMessage",
	buttons: [
		{
			"data-i18n": "cancelSubmitBtn",
			onClick() {
				unsavedChangesAlertDialog.close();
			},
		},
		{
			"data-i18n": "saveSettingsBtn",
			onClick() {
				changesManager.save();
				closeSettingsPage();
				unsavedChangesAlertDialog.close();
			},
		},
		{
			"data-i18n": "leaveSettingsPage",
			onClick() {
				changesManager.cancel();
				closeSettingsPage();
				unsavedChangesAlertDialog.close();
			},
			type: "reset",
		},
	],
});

function createDiscardCurrentChangesDialog(file: File | undefined) {
	const dialog = createDialog({
		title: "discardCurrentChanges",
		message: "discardCurrentChangesAndLoadFileMessage",
		buttons: [
			{
				"data-i18n": "cancelSubmitBtn",
				onClick() {
					dialog.close();
				},
			},
			{
				"data-i18n": "discardBtn",
				async onClick() {
					if (file) {
						loadFromSources([new JsonFileSource(file)]);
						closeSettingsPage();
					}
					dialog.close();
				},
				type: "reset",
			},
		],
	});
	return dialog;
}

function createConfirmReloadDialog(customJs: string) {
	const dialog = createDialog({
		title: "reloadNeeded",
		message: "reloadNeededMessage",
		buttons: [
			{
				"data-i18n": "okBtn",
				onClick() {
					dataset.setItem("customJs", customJs);
					dialog.close();
				},
			},
			{
				"data-i18n": "reloadPageBtn",
				onClick() {
					dataset.setItem("customJs", customJs);
					location.reload();
				},
				type: "reset",
			},
		],
		onClose() {
			dialog.close();
		},
	});
	return dialog;
}

async function createScriptPermissionDialog(): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const dialog = createDialog({
			title: "allowScriptExecution",
			message: "allowScriptExecutionMessage",
			buttons: [
				{
					"data-i18n": "doNotAllowScriptExecutionBtn",
					onClick() {
						dialog.close();
						resolve(false);
					},
				},
				{
					"data-i18n": "allowScriptExecutionBtn",
					onClick() {
						dialog.close();
						resolve(true);
					},
					type: "reset",
				},
			],
			onClose() {
				resolve(false);
			},
		});
		dialog.open();
	});
}

// -----------------------------------------------------------------------------
// Settings Page Open/Close
// -----------------------------------------------------------------------------

function openSettingsPage() {
	// Initialize states
	els.isAutoSaveEnabledCheckbox.checked = dataset.getOrSetItem(
		"isAutoSaveEnabled",
		true,
	);
	els.isScriptExecutionAllowedCheckbox.checked =
		localStorage.getItem("isScriptExecutionAllowed") === "true";
	els.isCloudSyncEnabledCheckbox.checked = isCloudSyncEnabled();

	// Initialize dock appearance checkboxes
	for (const [dockType, dockConfigName] of Object.entries(
		dockAppearanceConfigMap,
	)) {
		for (const dock of $$(`.dock.${dockType}`)) {
			const isDockHidden = dock.isHidden;
			$$<HTMLInputElement>(`[name="${dockConfigName}"]`).forEach(
				(input) => (input.checked = isDockHidden),
			);
		}
	}

	els.settings.show();

	// Backup attributes for possible revert
	const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
	const paletteHue = dataset.getItem("paletteHue") as string;
	const backgroundImageUrl = dataset.getItem("backgroundImageUrl");
	const locale = dataset.getItem("locale") as string;

	changesManager.onRevert = () => {
		dataset.setItem("uiOpacity", uiOpacity);
		dataset.setItem("paletteHue", paletteHue);
		dataset.setItem("backgroundImageUrl", backgroundImageUrl);
		dataset.setItem("locale", locale);
		els.langDropdown.value = locale;
	};
}

function closeSettingsPage() {
	els.settings.hide();
	els.backgroundImagePicker.$<HTMLDivElement>(
		".dropzone",
	)!.style.backgroundImage = "unset";
	els.backgroundImageUrlInput.value = "";
}

export function toggleSettingsPage() {
	if (els.settings.isHidden) {
		openSettingsPage();
	} else {
		changesManager.cancel();
		closeSettingsPage();
	}
}

// -----------------------------------------------------------------------------
// Feature: Script Execution Management
// -----------------------------------------------------------------------------

let isFirstJsLoad = true;

export function isScriptExecutionAllowed(): boolean {
	return localStorage.getItem("isScriptExecutionAllowed") === "true";
}

export async function grantScriptPermission() {
	const isScriptExecutionAllowed = await createScriptPermissionDialog();
	localStorage.setItem(
		"isScriptExecutionAllowed",
		isScriptExecutionAllowed ? "true" : "false",
	);
}

export function allowScriptExecutionIfNotYetSet() {
	if (localStorage.getItem("isScriptExecutionAllowed") === null) {
		localStorage.setItem("isScriptExecutionAllowed", "true");
	}
}

// -----------------------------------------------------------------------------
// Feature: Dock Appearance Management
// -----------------------------------------------------------------------------

export function createDockAppearanceItem(type: keyof DockPluginRegistry) {
	const li = getTemplate<HTMLLIElement>("dockAppearanceItem");
	const input = li.$("input")!;
	const span = li.$("span")!;
	const inputName = dockAppearanceConfigMap[type]!;

	span.dataset.i18n = inputName;
	input.name = inputName;

	input.on("change", () => {
		changesManager.setChange(inputName, () => {
			$$(`.${type}`).forEach((dock) =>
				dock.classList.toggle("none", input.checked),
			);
		});
	});

	n81i.translateElement(li);
	els.dockAppearanceList.appendChild(li);
}

// -----------------------------------------------------------------------------
// Feature: Shortcut Management
// -----------------------------------------------------------------------------

export function createShortcutItem({
	actionName,
	keySequence,
}: {
	actionName: string;
	keySequence: string;
}) {
	const label = getTemplate<HTMLLabelElement>("shortcutListItem");
	const input = label.$("input")!;
	const span = label.$("span")!;
	const recordBtn = label.$<HTMLButtonElement>(".recordBtn")!;
	const resetBtn = label.$<HTMLButtonElement>(".resetBtn")!;

	label.htmlFor = actionName;
	span.dataset.i18n = actionName;
	input.value = keySequence;
	input.dataset.actionName = actionName;
	recordBtn.dataset.i18n = "recordShortcutBtn";
	resetBtn.dataset.i18n = "resetBtn";

	n81i.translateElement(label);
	els.shortcutList.appendChild(label);
}

function handleShortcutAction(btn: HTMLButtonElement, input: HTMLInputElement) {
	const actionName = input.dataset.actionName!;

	if (btn.classList.contains("recordBtn")) {
		if (!btn.classList.contains("recording")) {
			// Start recording
			btn.textContent = n81i.t("stopRecordShortcutBtn");
			recordingKikey.startRecord();
			input.value = "...";
		} else {
			// Stop recording
			btn.textContent = n81i.t("recordShortcutBtn");
			const newSequence = recordingKikey.stopRecord();
			if (newSequence) {
				changesManager.setChange(actionName, () => {
					shortcutManager.update(actionName, newSequence);
				});
				input.value = keySequenceToString(newSequence);
			} else {
				input.value = shortcutManager.getKeySequence(actionName);
			}
		}
		btn.classList.toggle("recording");
	} else if (btn.classList.contains("resetBtn")) {
		changesManager.setChange(actionName, () =>
			shortcutManager.restore(actionName),
		);
		input.value = shortcutManager.getDefaultKeySequence(actionName);
	}
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

function setupEventListeners() {
	// Settings page navigation
	els.settingsBtn.on("click", () => {
		if (changesManager.isDirty()) {
			unsavedChangesAlertDialog.open();
		} else {
			toggleSettingsPage();
		}
	});

	els.saveBtn.on("click", () => {
		changesManager.save();
	});

	els.saveAndCloseBtn.on("click", () => {
		changesManager.save();
		closeSettingsPage();
	});

	els.cancelBtn.on("click", () => {
		changesManager.cancel();
		closeSettingsPage();
	});

	// Cloud sync options
	els.isCloudSyncEnabledCheckbox.on("input", () => {
		changesManager.setChange("setIsCloudSyncEnabled", () => {
			setIsCloudSyncEnabled(els.isCloudSyncEnabledCheckbox.checked);
		});
	});

	els.shareDataLinkBtn.on("click", shareDataLink);

	// Document management
	els.isAutoSaveEnabledCheckbox.on("input", () => {
		changesManager.setChange("setIsAutoSaveEnabled", () => {
			dataset.setItem(
				"isAutoSaveEnabled",
				els.isAutoSaveEnabledCheckbox.checked,
			);
		});
		changesManager.markDirty();
	});

	els.deleteDocumentBtn.on("click", handleDeleteDocument);
	els.exportDocumentBtn.on("click", () => saveToSources(new JsonFileSource()));
	els.importDocumentBtn.on("click", () => {
		els.importDocumentFileInput.click();
	});

	els.importDocumentFileInput.on("change", () => {
		const file = els.importDocumentFileInput.files?.[0];
		createDiscardCurrentChangesDialog(file).open();
	});

	// UI Customization
	els.uiOpacityInput.on("input", () => {
		const uiOpacity = els.uiOpacityInput.valueAsNumber / 100;
		dataset.setItem("uiOpacity", uiOpacity);
		changesManager.markDirty();
	});

	els.backgroundImagePicker.listenToPaste(els.backgroundImageUrlInput);
	els.backgroundImagePicker.on("imageChange", (e) => {
		const event = e as CustomEvent<ImageChangeDetail>;
		dataset.setItem("backgroundImageUrl", event.detail.url);
		changesManager.markDirty();
	});

	els.resetBackgroundImageBtn.on("click", () => {
		els.backgroundImagePicker.$<HTMLDivElement>(
			".dropzone",
		)!.style.backgroundImage = "unset";
		els.backgroundImageUrlInput.value = "";
		dataset.setItem("backgroundImageUrl", null);
	});

	// Palette hue wheel
	els.hueWheel.on("pointerdown", () =>
		els.hueWheel.on("pointermove", adjustPaletteHue),
	);
	els.hueWheel.on("pointerup", () =>
		els.hueWheel.off("pointermove", adjustPaletteHue),
	);
	els.resetPaletteHueBtn.on("click", () => {
		setCssProperty("--palette-hue", null);
	});

	// Theme toggle
	els.themeToggle.on("change", () => {
		const theme = (els.themeToggle as any).checked ? "light" : "dark";
		dataset.setItem("theme", theme);
	});

	// Shortcut management
	els.shortcutList.on("click", (e) => {
		if ((e.target as HTMLElement).matches("button")) {
			const btn = e.target as HTMLButtonElement;
			const input = btn.closest("label")!.querySelector("input")!;
			handleShortcutAction(btn, input);
		}
	});

	// Custom code
	els.customCssTextArea.on("input", () => {
		changesManager.setChange("customCss", () => {
			dataset.setItem("customCss", els.customCssTextArea.value);
		});
	});

	els.customJsTextArea.on("input", () => {
		changesManager.setChange("customJs", () => {
			const customJs = els.customJsTextArea.value;
			createConfirmReloadDialog(customJs).open();
		});
	});

	els.isScriptExecutionAllowedCheckbox.on("input", () => {
		changesManager.setChange("setIsScriptExecutionAllowed", () => {
			localStorage.setItem(
				"isScriptExecutionAllowed",
				els.isScriptExecutionAllowedCheckbox.checked ? "true" : "false",
			);
		});
	});

	// Add sticky dropdown
	setupAddStickyDropdown();
}

function setupAddStickyDropdown() {
	els.otherAddStickyBtn.on("click", () => {
		els.otherStickyDropdown.toggleHidden();
	});

	els.addStickyDropdownContainer.on("click", (e) => {
		const command = (
			(e.target as Element)?.closest("[data-command]") as HTMLElement
		)?.dataset?.command;
		if (command) {
			executeCommand(command);
			els.otherStickyDropdown.hide();
		}
	});

	document.body.on("click", (e) => {
		if (
			!(e.target as Element).closest(".dropdownButtons") &&
			!(e.target as Element).closest(".otherAddStickyBtn")
		) {
			els.otherStickyDropdown.hide();
		}
	});
}

function adjustPaletteHue(e: MouseEvent) {
	const rect = els.hueWheel.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const x = e.clientX - centerX;
	const y = e.clientY - centerY;

	const angle = Math.atan2(y, x) * (180 / Math.PI);
	const paletteHue = Math.round(angle).toString();

	setCssProperty("--palette-hue", paletteHue);
	dataset.setItem("paletteHue", paletteHue);
	changesManager.markDirty();
}

async function handleDeleteDocument() {
	if (confirm(n81i.t("confirmDeleteDocument"))) {
		localStorage.clear();
		try {
			// TODO: should use constant to avoid duplicates string.
			// PS same in `/src/dataWizard.ts`
			const request = indexedDB.open("mencrouche");
			request.onupgradeneeded = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains("data")) {
					db.deleteObjectStore("data");
				}
			};
			alert("Deleted! Please refresh the page.");
		} catch (error) {
			console.log("An error occurred when deleting IndexedDB", error);
			alert("Failed to delete data");
		}
	}
}

function shareDataLink() {
	const syncUrl = localStorage.getItem("syncUrl");
	const syncResourceId = localStorage.getItem("syncResourceId");
	const encryptionKey = localStorage.getItem("encryptionKey");

	if (syncUrl && syncResourceId && encryptionKey) {
		const url = new URL(window.location.origin);
		url.hash = window.btoa(
			JSON.stringify({
				syncUrl,
				syncResourceId,
				encryptionKey,
			}),
		);

		navigator.clipboard
			.writeText(url.href)
			.then(() => {
				els.shareDataLinkBtn.textContent = n81i.t("copied");
				els.shareDataLinkBtn.on(
					"pointerleave",
					() => n81i.translateElement(els.shareDataLinkBtn),
					{ once: true },
				);
			})
			.catch((err) => console.error(err.name, err.message));
	} else {
		alert("Cannot share the data.");
	}
}

// -----------------------------------------------------------------------------
// Data bindings and observers
// -----------------------------------------------------------------------------

function setupDataObservers() {
	// Background image
	dataset.on<string>("backgroundImageUrl", (_, url) => {
		changeBackgroundImage(url);
	});

	// Language
	dataset.on<string[]>("availableLocales", (_, locales) => {
		if (locales) {
			setupLanguageDropdown(locales);
		}
	});

	dataset.on<string>("locale", async (_, locale) => {
		if (!locale) return;
		(
			els.langDropdown.$(`option[value="${locale}"]`) as HTMLOptionElement
		).selected = true;
		if (n81i.isInitialized()) {
			await n81i.changeLanguage(locale);
			n81i.translatePage();
			document.documentElement.lang = toBcp47LangTag(locale);
		}
	});

	// Theme
	dataset.on<"light" | "dark">("theme", (_, theme) => {
		document.documentElement.setAttribute("data-theme", theme as string);
		els.themeToggle.checked = theme === "light";
		localStorage.setItem("theme", theme as string);
		markDirtyAndSaveDocument();
	});
	dataset.getOrSetItem(
		"theme",
		localStorage.getItem("theme") ?? queryPrefersColorScheme(),
	);

	// UI Opacity
	dataset.on<number>("uiOpacity", (_, uiOpacity) => {
		if (uiOpacity !== undefined) {
			setCssProperty("--uiOpacity", uiOpacity.toString());
			els.uiOpacityInput.style.opacity = uiOpacity.toString();
			els.uiOpacityInput.value = (uiOpacity * 100).toString();
		}
	});

	// Palette Hue
	dataset.on<string>("paletteHue", (_, paletteHue) => {
		setCssProperty("--palette-hue", paletteHue);
	});

	// Ghost Mode
	dataset.on("isGhostMode", (_, isGhostMode) => {
		$(".crate")!.classList.toggle("ghost", !!isGhostMode);
	});

	// Custom CSS
	dataset.on<string>("customCss", (_, css) => {
		if (typeof css === "string") {
			customCssStyleSheet.replaceSync(css);
		}
	});

	// Custom JS
	dataset.on<string>("customJs", (_, js) => {
		// Inject JavaScript
		if (isFirstJsLoad && isScriptExecutionAllowed()) {
			isFirstJsLoad = false;
			if (js) {
				const frag = document
					.createRange()
					.createContextualFragment(`<script>${js}</script>`);
				els.customJsSlot.replaceChildren(frag);
			}
		}
	});
}

function setupLanguageDropdown(locales: string[]) {
	els.langDropdown.replaceChildren();

	for (const locale of locales) {
		const option = $$$("option");
		option.value = locale;

		const bcp47 = toBcp47LangTag(locale);
		const translatedLocaleName = new Intl.DisplayNames([bcp47], {
			type: "language",
		}).of(bcp47);

		if (translatedLocaleName) {
			option.textContent = `${translatedLocaleName} - ${locale}`;
		} else {
			option.textContent = locale;
		}

		els.langDropdown.append(option);
	}

	els.langDropdown.on("change", async () => {
		n81i.loadLanguage(els.langDropdown.value);
		dataset.setItem("locale", els.langDropdown.value);
		changesManager.markDirty();
		await n81i.changeLanguage(els.langDropdown.value);
		n81i.translatePage();
	});
}

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

function initializeSettings() {
	setupLanguageDropdown(AVAILABLE_LOCALES);
	setupEventListeners();
	setupDataObservers();

	// Set up data lifecycle hooks
	addTodoBeforeSave(async () => {
		const url = dataset.getItem<string>("backgroundImageUrl");
		if (url?.startsWith("blob")) {
			const dataUrl = await anyUrlToDataUrl(url);
			dataset.setItem("backgroundImageUrl", dataUrl);
		}
	});

	addTodoAfterLoad(() => {
		els.customCssTextArea.value = dataset.getItem("customCss") ?? "";
		els.customJsTextArea.value = dataset.getItem("customJs") ?? "";
	});
}

// Initialize when module is loaded
initializeSettings();
