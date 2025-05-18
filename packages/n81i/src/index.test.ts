import { describe, it, expect, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { N81i } from "./index";

const window = new Window({ url: "https://localhost:8080" });
const document = window.document;
const n81i = new N81i();

describe("n81i Internationalization Module", () => {
	beforeEach(async () => {
		await n81i.init({
			locale: "en",
			availableLocales: ["en", "ja", "zh_TW"],
			resourceLoader: async (locale: string) => {
				const messages = {
					en: {
						hello: {
							message: "Hello",
							description: "Greeting message for nav bar.",
						},
					},
					ja: {
						hello: {
							message: "こんにちは",
							description: "Greeting message for nav bar.",
						},
					},
					zh_TW: {
						hello: {
							message: "你好",
							description: "Greeting message for nav bar.",
						},
					},
				};
				return messages[locale as keyof typeof messages];
			},
			fallback: "en",
		});
	});

	it("should initialize correctly", () => {
		expect(n81i.getCurrentLocale()).toBe("en");
		expect(n81i.getAllLocales()).toEqual(["en", "ja", "zh_TW"]);
	});

	it("should translate keys correctly", () => {
		expect(n81i.t("hello")).toBe("Hello");
		expect(n81i.t("nonexistent")).toBe("nonexistent");
	});

	it("should change language", async () => {
		await n81i.changeLanguage("ja");
		expect(n81i.getCurrentLocale()).toBe("ja");
		expect(n81i.t("hello")).toBe("こんにちは");
	});

	it("should handle multiple language changes", async () => {
		expect(n81i.t("hello")).toBe("Hello");

		await n81i.changeLanguage("ja");
		expect(n81i.t("hello")).toBe("こんにちは");

		await n81i.changeLanguage("zh_TW");
		expect(n81i.t("hello")).toBe("你好");

		await n81i.changeLanguage("en");
		expect(n81i.t("hello")).toBe("Hello");
	});

	it("should translate later", () => {
		n81i.translateLater("hello", (translated) => {
			expect(translated).toBe("Hello");
		});
	});

	it("should add translations", async () => {
		await n81i.addTranslations({
			fr: {
				goodbye: { message: "Au revoir", description: "Goodbye message." },
			},
			zh_TW: {
				goodbye: { message: "再見", description: "Goodbye message." },
			},
		});

		await n81i.changeLanguage("fr");
		expect(n81i.t("goodbye")).toBe("Au revoir");

		await n81i.changeLanguage("zh_TW");
		expect(n81i.t("goodbye")).toBe("再見");
		expect(n81i.t("hello")).toBe("你好");
	});

	it("should translate HTML document", () => {
		document.body.innerHTML = `
      <div data-i18n="hello"></div>
      <input data-i18n="hello" data-i18n-for="placeholder">
    `;
		n81i.translatePage(document as any);

		const testDiv = document.querySelector("div") as unknown as HTMLDivElement;
		const testInput = document.querySelector(
			"input",
		) as unknown as HTMLInputElement;

		expect(testDiv.textContent).toBe("Hello");
		expect(testInput.getAttribute("placeholder")).toBe("Hello");
	});
});
