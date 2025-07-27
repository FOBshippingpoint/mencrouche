export interface Message {
	message: string;
	description?: string;
}

export interface MessagesJson {
	[key: string]: Message;
}

export type LocaleResourceLoader = (locale: string) => Promise<MessagesJson>;

export interface N81iInitOptions {
	locale: string;
	availableLocales: string[];
	resourceLoader: LocaleResourceLoader;
	fallback?: string;
}

export interface N81iResource {
	[key: string]: Record<string, Message>;
}

type Todo = () => void;

export class N81i {
	private _locale: string = "en";
	private _fallback: string = "en"; // Renamed from 'fallback' in module scope to avoid potential naming conflicts
	private _availableLocales: string[] = ["en"];
	private _isInitialized: boolean = false; // Internal state for isInitialized status
	private _resourceLoader!: LocaleResourceLoader; // Definite assignment in init

	private readonly localeAndMessagesJson = new Map<string, MessagesJson>();
	private readonly messageMap = new Map<string, string>();
	private readonly todos: Todo[] = [];

	constructor() {
		// Constructor can be left empty if all initialization occurs in `init`
		// and properties are initialized at their declaration.
	}

	private mergeMessagesJson(locale: string, json: MessagesJson): void {
		const exisitingMessagesJson = this.localeAndMessagesJson.get(locale) ?? {};
		this.localeAndMessagesJson.set(
			locale,
			Object.assign(exisitingMessagesJson, json),
		);

		for (const [key, value] of Object.entries(
			this.localeAndMessagesJson.get(locale)!,
		)) {
			this.messageMap.set(`${locale}@${key}`, (value as Message).message);
		}
	}

	/**
	 * Loads the language file for the specified locale and caches it.
	 * @see {@link https://developer.chrome.com/docs/extensions/reference/api/i18n}
	 * for acceptable locales.
	 * @param locale - The locale to load (e.g., "en", "fr").
	 */
	public async loadLanguage(locale: string): Promise<void> {
		if (!this.localeAndMessagesJson.has(locale)) {
			// Ensure _resourceLoader is available, which init() should guarantee
			if (!this._resourceLoader) {
				// This case implies init() was not called or not completed as expected.
				// The original code didn't explicitly handle this at this spot,
				// as resourceLoader was a module-level variable.
				// Throwing an error here might be more robust, but to stay faithful:
				console.error(
					"N81i: resourceLoader not available in loadLanguage. Was init called?",
				);
				return;
			}
			const json = await this._resourceLoader(locale);
			this.mergeMessagesJson(locale, json);
		}
	}

	/**
	 * Initializes the i18n module with the specified options.
	 * This method should be called before any translation occurs.
	 * @param options - Configuration options for initialization.
	 * @returns The initialized i18n module.
	 */
	public async init(options: N81iInitOptions): Promise<this> {
		this._resourceLoader = options.resourceLoader;
		await this.changeLanguage(options.locale); // `this` correctly refers to class instance methods
		if (options.fallback) {
			this._fallback = options.fallback;
			await this.loadLanguage(this._fallback); // Pass the stored fallback
		}
		if (options.availableLocales) {
			this._availableLocales = options.availableLocales;
		}
		this._isInitialized = true;
		while (this.todos.length > 0) {
			const todo = this.todos.pop();
			if (todo) {
				// Ensure todo is not undefined
				todo();
			}
		}
		return this;
	}

	/**
	 * Changes the current language by loading the appropriate language file
	 * and updating the internal message map.
	 * @param locale - The locale to switch to.
	 */
	public async changeLanguage(locale: string): Promise<void> {
		this._locale = locale;
		await this.loadLanguage(locale);
	}

	/**
	 * "Translates" a key to the current locale's message.
	 * If the key is not found in the current locale, it falls back to the
	 * fallback locale.
	 * If even the fallback locale does not have translation, Then the 'key'
	 * itself will return.
	 * @param key - The translation key.
	 * @returns The translated message or the key if not found.
	 * @throws Error if n81i is not initialized.
	 */
	public t(key: string): string {
		if (!this._isInitialized) {
			throw Error("Please call .init() first or use `translateLater`.");
		} else {
			// TODO: maybe notify user the key does not exists? (Original TODO)
			return (
				this.messageMap.get(`${this._locale}@${key}`) ??
				this.messageMap.get(`${this._fallback}@${key}`) ??
				key
			);
		}
	}

	/**
	 * Translates a key asynchronously. If the module is not yet initialized,
	 * the translation will be performed later when initialization is complete.
	 * @param key - The translation key.
	 * @param onComplete - A callback function that receives the translated string.
	 */
	public translateLater(
		key: string,
		onComplete: (translated: string) => void = () => {},
	): void {
		if (this._isInitialized) {
			onComplete(this.t(key));
		} else {
			this.todos.push(() => onComplete(this.t(key)!)); // Original use of '!'
		}
	}

	/**
	 * Translates an HTML element and its children based on the `data-i18n` attribute.
	 * The attribute `data-i18n-for` can be used to specify which attribute to set the translation to.
	 * @param node - The HTML element to translate.
	 */
	public translateElement(node: ParentNode): void {
		const children = node.querySelectorAll("[data-i18n]");
		// Original logic: iterate children then the node itself.
		// Note: If 'node' itself matches querySelectorAll('[data-i18n]') and is a child of another element,
		// it might be processed by an outer call to translateElement/translatePage first as a child,
		// then by this specific call to translateElement if 'node' is passed directly.
		// And if 'node' is in 'children', it would be processed twice by this single call.
		// However, querySelectorAll gets descendants, so 'node' wouldn't be in 'children' of itself.
		// The original [...children, node] iterates all matching descendants, and then the parent 'node' itself.
		for (const el of [...Array.from(children), node]) {
			// Ensure 'children' (NodeListOf<Element>) is an array for spread
			// TODO: dup code in translateElement and translatePage (Original TODO)
			// But I don't want to expose method that translate without children
			// Also, if we use translateElement inside translatePage,
			// It would trigger unnecessary queries.

			// Ensure 'el' is an HTMLElement to safely access 'dataset'.
			// The original code casts directly to HTMLElement.
			// If 'el' (which could be 'node') is not an HTMLElement (e.g. DocumentFragment),
			// .dataset would be undefined.
			// For faithfulness, we keep the original cast, assuming 'el' will be an HTMLElement in practice
			// for elements with 'data-i18n' attributes.
			const { i18n, i18nFor } = (el as HTMLElement).dataset ?? {};
			if (i18n) {
				this.translateLater(i18n, (message: string) => {
					if (i18nFor) {
						(el as HTMLElement).setAttribute(i18nFor, message);
					} else {
						// If el is a DocumentFragment (a ParentNode but not HTMLElement), textContent is fine.
						// If el is an Element, textContent is also fine.
						el.textContent = message;
					}
				});
			}
		}
	}

	/**
	 * Translates the entire page by translating all elements with the `data-i18n` attribute.
	 */
	public translatePage(document: Document = window.document): void {
		for (const el of Array.from(document.querySelectorAll("[data-i18n]"))) {
			// Iterate over NodeListOf
			const { i18n, i18nFor } = (el as HTMLElement).dataset ?? {};
			if (i18n) {
				this.translateLater(i18n, (message: string) => {
					if (i18nFor) {
						(el as HTMLElement).setAttribute(i18nFor, message);
					} else {
						el.textContent = message;
					}
				});
			}
		}
	}

	/**
	 * Adds additional translations to the i18n module.
	 * @param resource - A resource object containing translations for multiple locales.
	 */
	public async addTranslations(resource: N81iResource): Promise<void> {
		for (const [locale, json] of Object.entries(resource)) {
			if (this._availableLocales.indexOf(locale) === -1) {
				this._availableLocales.push(locale);
			} else {
				// If locale is already in availableLocales, original code implies it might need loading
				// if not already loaded. The `loadLanguage` method itself checks if it's already loaded.
				await this.loadLanguage(locale);
			}
			this.mergeMessagesJson(locale, json);
		}
	}

	/**
	 * Returns the list of all available locales.
	 * @returns An array of available locale strings.
	 */
	public getAllLocales(): readonly string[] {
		return this._availableLocales;
	}

	/**
	 * Returns the current active locale.
	 * @returns The current locale string.
	 */
	public getCurrentLocale(): string {
		return this._locale;
	}

	/**
	 * Method to check if the service is initialized.
	 * Kept the same name as in the original object.
	 * @returns boolean
	 */
	public isInitialized(): boolean {
		return this._isInitialized;
	}
}
