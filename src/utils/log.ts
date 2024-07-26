import { loadSettings } from "./settings";

let debug = false;

loadSettings((settings) => {
	debug = settings.other_settings.debug_mode;
});

export function log(message?: unknown, ...args: unknown[]) {
	debug && console.log(message, ...args);
}
