import { SPECIAL_KEYS } from "./constants";

/**
 * @param {string} binding - key binding string, e.g. 「C-s」 or 「a」
 */
export function parseBinding(binding: string): KeyBinding {
	let ctrlKey = false;
	let shiftKey = false;
	let altKey = false;
	let metaKey = false;
	let key = "";

	for (const c of binding.split("-")) {
		if (c.length === 1) {
			ctrlKey = c === "C" || ctrlKey;
			shiftKey = c === "S" || shiftKey;
			altKey = c === "A" || altKey;
			metaKey = c === "M" || metaKey;
			key = c;
		} else if (SPECIAL_KEYS.has(c)) {
			key = c === "space" ? " " : c === "dash" ? "-" : c;
		} else {
			throw Error("Invalid binding.");
		}
	}

	if (binding.length === 1) {
		if (ctrlKey) {
			key = "control";
		} else if (shiftKey) {
			key = "shift";
		} else if (altKey) {
			key = "alt";
		} else if (metaKey) {
			key = "meta";
		}
	}

	return { ctrlKey, shiftKey, altKey, metaKey, key };
}

/**
 * The key binding.
 *
 * For example, `Ctrl + S` or `Alt + Shift + K`.
 */
export interface KeyBinding {
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	key: string;
}
