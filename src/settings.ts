import { createDialog } from "./generalDialog";
import { createKikey } from "kikey";
import { $, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
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
import { openDB } from "idb";
import {
	isCloudSyncEnabled,
	markDirtyAndSaveDocument,
	setIsCloudSyncEnabled,
} from "./lifesaver";
import type { ImageChangeDetail, ImagePicker } from "./component/imagePicker";
import type { IconToggle } from "./component/iconToggle";

const changesManager = (() => {
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
})();

// awk '{ print length($2), $0 }' asdf | /usr/bin/sort -n | cut -d ' ' -f2- > asdfasdf
const saveBtn = $<HTMLButtonElement>("#saveSettingsBtn")!;
const hueWheel = $<HTMLDivElement>("#hueWheel")!;
const settings = $<HTMLElement>("#settings")!;
const cancelBtn = $<HTMLButtonElement>("#cancelSettingsBtn")!;
const settingsBtn = $<HTMLButtonElement>("#settingsBtn")!;
const isCloudSyncEnabledCheckbox = $<HTMLInputElement>(
	'[name="isCloudSyncEnabled"]',
)!;
// const syncRemoteAuthKeyInput = $<HTMLInputElement>( '[name="syncRemoteAuthKey"]',)!;
const shortcutList = $<HTMLDivElement>("#shortcutList")!;
const uiOpacityInput = $<HTMLInputElement>("#uiOpacityInput")!;
const saveAndCloseBtn = $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!;
const shareDataLinkBtn = $<HTMLButtonElement>("#shareDataLinkBtn")!;
const isAutoSaveEnabledCheckbox = $<HTMLInputElement>(
	'[name="isAutoSaveEnabled"]',
)!;
const deleteDocumentBtn = $<HTMLButtonElement>("#deleteDocumentBtn")!;
const exportDocumentBtn = $<HTMLButtonElement>("#exportDocumentBtn")!;
const importDocumentBtn = $<HTMLButtonElement>("#importDocumentBtn")!;
const resetPaletteHueBtn = $<HTMLDivElement>("#setPaletteHueToDefaultBtn")!;
const isScriptExecutionAllowedCheckbox = $<HTMLInputElement>(
	'[name="isScriptExecutionAllowed"]',
)!;
const customJsTextArea = $<HTMLTextAreaElement>("#customJsTextArea")!;
const customJsSlot = $<HTMLSlotElement>("#customJsSlot")!;
const customCssTextArea = $<HTMLTextAreaElement>("#customCssTextArea")!;
const backgroundImagePicker = $<ImagePicker>("image-picker")!;
const backgroundImageUrlInput = $<HTMLInputElement>(
	"#backgroundImageUrlInput",
)!;
const importDocumentFileInput = $<HTMLInputElement>(
	"#importDocumentFileInput",
)!;
const resetBackgroundImageBtn = $<HTMLButtonElement>(
	"#setBackgroundImageToDefaultBtn",
)!;

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

settingsBtn.on("click", () => {
	if (changesManager.isDirty()) {
		unsavedChangesAlertDialog.open();
	} else {
		toggleSettingsPage();
	}
});

isCloudSyncEnabledCheckbox.on("input", () => {
	changesManager.setChange("setIsCloudSyncEnabled", () => {
		setIsCloudSyncEnabled(isCloudSyncEnabledCheckbox.checked);
	});
});
// syncRemoteAuthKeyInput.value = localStorage.getItem("syncRemoteAuthKey") ?? "";
// syncRemoteAuthKeyInput.on("input", () => {
//   changesManager.setChange("setStorageSyncRemoteAuthKey", () => {
//     localStorage.setItem("syncRemoteAuthKey", syncRemoteAuthKeyInput.value);
//   });
// });
shareDataLinkBtn.on("click", () => {
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
				shareDataLinkBtn.textContent = n81i.t("copied");
				shareDataLinkBtn.on(
					"pointerleave",
					() => n81i.translateElement(shareDataLinkBtn),
					{ once: true },
				);
			})
			.catch((err) => console.error(err.name, err.message));
	} else {
		alert("Cannot share the data.");
	}
});

isAutoSaveEnabledCheckbox.on("input", () => {
	changesManager.setChange("setIsAutoSaveEnabled", () => {
		dataset.setItem("isAutoSaveEnabled", isAutoSaveEnabledCheckbox.checked);
	});
	changesManager.markDirty();
});
deleteDocumentBtn.on("click", async () => {
	if (confirm(n81i.t("confirmDeleteDocument"))) {
		localStorage.clear();
		try {
			// TODO: should use constant to avoid duplicates string.
			// PS same in `/src/dataWizard.ts`
			const db = await openDB("mencrouche");
			db.deleteObjectStore("data");
		} catch (error) {
			console.log("An error occurred when deleting IndexedDB", error);
			alert("Failed to delete data");
		}
		alert("Deleted! Please refresh the page.");
	}
});

exportDocumentBtn.on("click", () => saveToSources(new JsonFileSource()));
importDocumentBtn.on("click", () => {
	importDocumentFileInput.click();
});
importDocumentFileInput.on("change", () => {
	const file = importDocumentFileInput.files?.[0];
	const discardCurrentChangesDialog = createDialog({
		title: "discardCurrentChanges",
		message: "discardCurrentChangesAndLoadFileMessage",
		buttons: [
			{
				"data-i18n": "cancelSubmitBtn",
				onClick() {
					discardCurrentChangesDialog.close();
				},
			},
			{
				"data-i18n": "discardBtn",
				async onClick() {
					if (file) {
						loadFromSources([new JsonFileSource(file)]);
						closeSettingsPage();
					}
					discardCurrentChangesDialog.close();
				},
				type: "reset",
			},
		],
	});
	discardCurrentChangesDialog.open();
});

saveBtn.on("click", () => {
	changesManager.save();
});
saveAndCloseBtn.on("click", () => {
	changesManager.save();
	closeSettingsPage();
});
cancelBtn.on("click", () => {
	changesManager.cancel();
	closeSettingsPage();
});

backgroundImagePicker.listenToPaste(backgroundImageUrlInput);
backgroundImagePicker.on("imageChange", (e) => {
	const event = e as CustomEvent<ImageChangeDetail>;
	dataset.setItem("backgroundImageUrl", event.detail.url);
	changesManager.markDirty();
});

resetBackgroundImageBtn.on("click", () => {
	backgroundImagePicker.$<HTMLDivElement>(".dropzone")!.style.backgroundImage =
		"unset";
	backgroundImageUrlInput.value = "";
	dataset.setItem("backgroundImageUrl", null);
});

// TODO: somehow laggy? maybe we need throttle?
uiOpacityInput.on("input", () => {
	const uiOpacity = uiOpacityInput.valueAsNumber / 100;
	dataset.setItem("uiOpacity", uiOpacity);
	changesManager.markDirty();
});

function openSettingsPage() {
	isAutoSaveEnabledCheckbox.checked = dataset.getOrSetItem(
		"isAutoSaveEnabled",
		true,
	);
	isScriptExecutionAllowedCheckbox.checked =
		localStorage.getItem("isScriptExecutionAllowed") === "on";
	isCloudSyncEnabledCheckbox.checked = isCloudSyncEnabled();
	settings.classList.remove("none");

	// Backup attributes.
	const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
	const paletteHue = dataset.getItem("paletteHue") as string;
	const backgroundImageUrl = dataset.getItem("backgroundImageUrl");
	const locale = dataset.getItem("locale") as string;
	changesManager.onRevert = () => {
		dataset.setItem("uiOpacity", uiOpacity);
		dataset.setItem("paletteHue", paletteHue);
		dataset.setItem("backgroundImageUrl", backgroundImageUrl);
		dataset.setItem("locale", locale);
		langDropdown.value = locale;
	};
}

function closeSettingsPage() {
	settings.classList.add("none");
	backgroundImagePicker.$<HTMLDivElement>(".dropzone")!.style.backgroundImage =
		"unset";
	backgroundImageUrlInput.value = "";
}

export function toggleSettingsPage() {
	if (settings.classList.contains("none")) {
		openSettingsPage();
	} else {
		changesManager.cancel();
		closeSettingsPage();
	}
}

// Initialize background image.
dataset.on<string>("backgroundImageUrl", (_, url) => {
	changeBackgroundImage(url);
});
async function changeBackgroundImage(url: string | undefined) {
	if (url?.startsWith("blob")) {
		url = await anyUrlToDataUrl(url);
	}
	setCssProperty(
		"--page-background",
		url ? `url(${url}) no-repeat center center fixed` : "unset",
	);
	if (url) {
		$("#viewport")!.classList.remove("patternBg");
	} else {
		$("#viewport")!.classList.add("patternBg");
	}
}

// Initialize language dropdown.
function toBCP47LangTag(chromeLocale: string) {
	return chromeLocale.replaceAll("_", "-");
}
const langDropdown = $<HTMLSelectElement>("#langDropdown")!;
dataset.on<string[]>("availableLocales", (_, locales) => {
	if (locales) {
		langDropdown.replaceChildren();
		for (const locale of locales) {
			const option = $$$("option");
			if (dataset.getItem("locale") === locale) {
				option.selected = true;
			}
			option.value = locale;
			const bcp47 = toBCP47LangTag(locale);
			const translatedLocaleName = new Intl.DisplayNames([bcp47], {
				type: "language",
			}).of(bcp47);
			if (translatedLocaleName) {
				option.textContent = `${translatedLocaleName} - ${locale}`;
			} else {
				option.textContent = locale;
			}
			langDropdown.append(option);
		}
		langDropdown.on("change", async () => {
			n81i.loadLanguage(langDropdown.value);
			dataset.setItem("locale", langDropdown.value);
			changesManager.markDirty();
			await n81i.changeLanguage(langDropdown.value);
			n81i.translatePage();
		});
	}
});

// Initialize language
dataset.on<string>("locale", async (_, locale) => {
	if (!locale) return;
	if (n81i.isInitialized()) {
		await n81i.changeLanguage(locale);
		n81i.translatePage();
	}
});

function queryPrefersColorScheme() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

// Initialize theme.
const themeToggle = $<IconToggle>("#themeToggle")!;
const defaultTheme = dataset.getOrSetItem("theme", queryPrefersColorScheme());
document.documentElement.setAttribute("data-theme", defaultTheme);
dataset.on<"light" | "dark">("theme", (_, theme) => {
	document.documentElement.setAttribute("data-theme", theme as string);
	themeToggle.checked = theme === "light";
	markDirtyAndSaveDocument();
});
themeToggle.on("change", () => {
	const theme = (themeToggle as any).checked ? "light" : "dark";
	dataset.setItem("theme", theme);
});

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
	shortcutList.appendChild(label);
}

const recordingKikey = createKikey();
shortcutList.on("click", (e) => {
	if ((e.target as HTMLElement).matches("button")) {
		const btn = e.target as HTMLButtonElement;
		const input = btn.closest("label")!.querySelector("input")!;
		const actionName = input.dataset.actionName!;

		if (btn.classList.contains("recordBtn")) {
			if (!btn.classList.contains("recording")) {
				// Start
				btn.textContent = n81i.t("stopRecordShortcutBtn");
				recordingKikey.startRecord();
				input.value = "...";
			} else {
				// Stop
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
});

// initialize ui opacity
dataset.on<number>("uiOpacity", (_, uiOpacity) => {
	if (uiOpacity !== undefined) {
		setCssProperty("--ui-opacity", uiOpacity.toString());
		uiOpacityInput.style.opacity = uiOpacity.toString();
		uiOpacityInput.value = (uiOpacity * 100).toString();
	}
});

// Initialize palette hue
dataset.on<string>("paletteHue", (_, paletteHue) => {
	setCssProperty("--palette-hue", paletteHue);
});
hueWheel.on("pointerdown", () => hueWheel.on("pointermove", adjustPaletteHue));
hueWheel.on("pointerup", () => hueWheel.off("pointermove", adjustPaletteHue));
resetPaletteHueBtn.on("click", () => {
	setCssProperty("--palette-hue", null);
});
function adjustPaletteHue(e: MouseEvent) {
	const rect = hueWheel.getBoundingClientRect();
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

// Reflecting to global ghost mode configuration.
dataset.on("isGhostMode", (_, isGhostMode) => {
	$(".crate")!.classList.toggle("ghost", !!isGhostMode);
});

// Initialize add sticky dropdown buttons at navbar.
const addStickyDropdownContainer = $<HTMLButtonElement>(
	"#addStickyDropdownContainer",
)!;
const addOtherStickyBtn = $<HTMLButtonElement>(".addOtherStickyBtn")!;
const otherStickyDropdown = $<HTMLDivElement>(".dropdownButtons")!;
addOtherStickyBtn.on("click", () => {
	otherStickyDropdown.classList.toggle("none");
});
addStickyDropdownContainer.on("click", (e) => {
	const command = (
		(e.target as Element)?.closest("[data-command]") as HTMLElement
	)?.dataset?.command;
	if (command) {
		executeCommand(command);
		otherStickyDropdown.classList.add("none");
	}
});
document.body.on("click", (e) => {
	if (
		!(e.target as Element).closest(".dropdownButtons") &&
		!(e.target as Element).closest(".addOtherStickyBtn")
	) {
		otherStickyDropdown.classList.add("none");
	}
});

function setCssProperty(name: string, value: string | null | undefined) {
	if (value === null || value === undefined) {
		document.documentElement.style.removeProperty(name);
	} else {
		document.documentElement.style.setProperty(name, value);
	}
}

const customCssStyleSheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(customCssStyleSheet);
dataset.on<string>("customCss", (_, css) => {
	if (typeof css === "string") {
		customCssStyleSheet.replaceSync(css);
	}
});
customCssTextArea.on("input", () => {
	changesManager.setChange("customCss", () => {
		dataset.setItem("customCss", customCssTextArea.value);
	});
});

let isFirstJsLoad = true;
dataset.on<string>("customJs", (_, js) => {
	// Inject JavaScript
	if (isFirstJsLoad && isScriptExecutionAllowed()) {
		isFirstJsLoad = false;
		const frag = document
			.createRange()
			.createContextualFragment(`<script>${js}</script>`);
		customJsSlot.replaceChildren(frag);
	}
});
customJsTextArea.on("input", () => {
	changesManager.setChange("customJs", () => {
		const customJs = customJsTextArea.value;
		changesManager.setChange("setCustomJs", () => {
			const confirmReloadDialog = createDialog({
				title: "reloadNeeded",
				message: "reloadNeededMessage",
				buttons: [
					{
						"data-i18n": "okBtn",
						onClick() {
							changesManager.cancel();
							isFirstJsLoad = false;
							dataset.setItem("customJs", customJs);
							confirmReloadDialog.close();
						},
					},
				],
				onClose() {
					confirmReloadDialog.close();
				},
			});
			confirmReloadDialog.open();
		});
	});
});

isScriptExecutionAllowedCheckbox.on("input", () => {
	changesManager.setChange("setIsScriptExecutionAllowed", () => {
		localStorage.setItem(
			"isScriptExecutionAllowed",
			isScriptExecutionAllowedCheckbox.value,
		);
	});
});
export async function grantScriptPermission() {
	const isScriptExecutionAllowed = await new Promise<boolean>((resolve) => {
		const allowScriptExecutionDialog = createDialog({
			title: "allowScriptExecution",
			message: "allowScriptExecutionMessage",
			buttons: [
				{
					"data-i18n": "doNotAllowScriptExecutionBtn",
					onClick() {
						allowScriptExecutionDialog.close();
						resolve(false);
					},
				},
				{
					"data-i18n": "allowScriptExecutionBtn",
					onClick() {
						allowScriptExecutionDialog.close();
						resolve(true);
					},
					type: "reset",
				},
			],
			onClose() {
				resolve(false);
			},
		});
		allowScriptExecutionDialog.open();
	});
	localStorage.setItem(
		"isScriptExecutionAllowed",
		isScriptExecutionAllowed ? "on" : "off",
	);
}
export function isScriptExecutionAllowed() {
	return localStorage.getItem("isScriptExecutionAllowed") === "on";
}
export function allowScriptExecutionIfNotYetSet() {
	if (localStorage.getItem("isScriptExecutionAllowed") === null) {
		localStorage.setItem("isScriptExecutionAllowed", "on");
	}
}

addTodoBeforeSave(async () => {
	const url = dataset.getItem<string>("backgroundImageUrl");
	if (url?.startsWith("blob")) {
		const dataUrl = await anyUrlToDataUrl(url);
		dataset.setItem("backgroundImageUrl", dataUrl);
	}
});
addTodoAfterLoad(() => {
	customCssTextArea.value = dataset.getItem("customCss") ?? "";
	customJsTextArea.value = dataset.getItem("customJs") ?? "";
});
