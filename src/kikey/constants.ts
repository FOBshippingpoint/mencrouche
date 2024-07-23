/**
 * Set of special keys used in key binding syntax.
 *
 * Including:
 * 1. Keys with names longer than one character (e.g., "arrowleft", "backspace").
 * 2. Single-character keys that require full name specification in bindings (i.e., "space" and "dash").
 */
export const SPECIAL_KEYS: Set<string> = new Set([
	"space",
	"dash",
	"arrowleft",
	"arrowright",
	"arrowup",
	"arrowdown",
	"backspace",
	"enter",
	"escape",
	"capslock",
	"tab",
	"home",
	"pageup",
	"pagedown",
	"end",
	"f1",
	"f2",
	"f3",
	"f4",
	"f5",
	"f6",
	"f7",
	"f8",
	"f9",
	"f10",
	"f11",
	"f12",
]);
