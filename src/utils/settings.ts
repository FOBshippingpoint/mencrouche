import { defaultSettings } from "../settings/defaultSettings";
import type { Settings } from "../types/index";
import platform from "./platform";

export function loadSettings(callback: (settings: Settings) => any) {
	platform.storage.local.get({ settings: defaultSettings }).then(
		(value) => {
			if (value.settings.other_settings.debug_mode) {
				console.log("getSettings:", value);
			}
			callback(value.settings);
		},
		(err) => {
			console.log("getSettings:", err);
		},
	);
}
