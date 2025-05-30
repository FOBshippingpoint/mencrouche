function getScreenSize() {
	return getComputedStyle(document.documentElement)
		.getPropertyValue("--screenSize")
		.replaceAll('"', "");
}

export function isSmallScreen() {
	return getScreenSize() === "small";
}

export function isMediumScreen() {
	return getScreenSize() === "medium";
}

export function isLargeScreen() {
	return getScreenSize() === "large";
}
