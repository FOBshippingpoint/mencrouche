// Yeah it is "bowser" not "browser"
// Cuz I like mario
export const bowser = globalThis.chrome ?? globalThis.browser;

export function isInExtensionContext() {
	return (
		typeof bowser !== "undefined" &&
		typeof bowser?.runtime !== "undefined" &&
		typeof bowser?.runtime?.id === "string"
	);
}
