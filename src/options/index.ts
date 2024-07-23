import platform from "../utils/platform";
import { defaultSettings } from "../settings/defaultSettings";
import { Settings } from "../types/index";
import { translate } from "../utils/translate";
import { log } from "../utils/log";
import { loadSettings } from "../utils/settings";
import { $, $$ } from "../utils/dollars";

translate();

// init settings
loadSettings((settings) => {
	$$<HTMLInputElement>("#tab-shortcuts input").forEach((el) => {
		const command = el.id;
		el.value = settings.shortcuts[command];
	});
	const newShortcuts = settings.shortcuts;
	shortcutsSettings(newShortcuts, settings);
	otherSettings(settings);
});

function shortcutsSettings(
	newShortcuts: Settings["shortcuts"],
	settings: Settings,
) {
	$$<HTMLInputElement>("#tab-shortcuts input").forEach((el) => {
		el.addEventListener("keydown", (e) => {
			if (e.key === "Tab") return;
			e.preventDefault();
			const input = e.target as HTMLInputElement;
			newShortcuts[input.id] = "";
			input.value = newShortcuts[input.id];
		});
	});

	// reset shortcut
	$$<HTMLButtonElement>("#tab-shortcuts .reset").forEach((el) => {
		el.addEventListener("click", () => {
			const input = el.previousSibling as HTMLInputElement;

			const command = input.id;
			input.value = defaultSettings.shortcuts[command];
		});
	});

	// save shortcuts
	$<HTMLFormElement>("form")!.addEventListener("submit", () => {
		platform.storage.local
			.set({ settings: { ...settings, shortcuts: newShortcuts } })
			.then(() => log("new shortcuts set: ", newShortcuts), alertError);
	});
}

function otherSettings(settings: Settings) {
	const otherSettings = settings.other_settings;
	// init other settings
	// init style of selected settings
	$<HTMLInputElement>("#" + otherSettings.sokoban_style)!.checked = true;

	// style settings
	$$<HTMLInputElement>("[name=sokoban_style]").forEach((el) => {
		el.addEventListener("change", () => {
			otherSettings.sokoban_style =
				el.value as Settings["other_settings"]["sokoban_style"];
			saveOtherSettings();
		});
	});

	// reset all settings
	$<HTMLButtonElement>("#reset_all")!.addEventListener("click", () => {
		const result = confirm(platform.i18n.getMessage("confirm_reset_all"));
		if (result) {
			platform.storage.local
				.set({ settings: defaultSettings })
				.then(() => log("reset all settings ok"), alertError);
		}
	});

	// debug mode
	$<HTMLInputElement>("#debug_checkbox")!.addEventListener("change", (e) => {
		otherSettings.debug_mode = (e.target as HTMLInputElement).checked;
		saveOtherSettings();
	});

	function saveOtherSettings() {
		platform.storage.local
			.set({
				settings: {
					...settings,
					other_settings: otherSettings,
				},
			})
			.then(() => log("other settings saved: ", otherSettings), alertError);
	}
}

function alertError(err: unknown) {
	alert(platform.i18n.getMessage("error_while_saving"));
	console.log(err);
}
