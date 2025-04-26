export function toBcp47LangTag(chromeLocale: string): string {
	return chromeLocale.replaceAll("_", "-");
}
