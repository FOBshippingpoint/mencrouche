// The `url:` prefix is a custom prefix defined in .parcelrc.
// see https://github.com/parcel-bundler/parcel/issues/1080#issuecomment-557240449
// for more information
import en from "url:../_locales/en/messages.json";
import zh_TW from "url:../_locales/zh_TW/messages.json";

const urls = { en, zh_TW };

interface Message {
  message: string;
  description: string;
}

interface MessagesJson {
  [key: string]: Message;
}

interface N81iInitOptions {
  locale: string;
  availableLocales: string[];
  fallback?: string;
}

interface N81iResource {
  [key: string]: Record<string, Message>;
}

let _locale = "en";
let fallback = "en";
let availableLocales = ["en"];
let isInitialized = false;

const localeAndMessagesJson = new Map<string, MessagesJson>();
const messageMap = new Map<string, string>();

type Todo = () => void;
const todos: Todo[] = [];

function mergeMessagesJson(locale: string, json: MessagesJson) {
  const exisitingMessagesJson = localeAndMessagesJson.get(locale) ?? {};
  localeAndMessagesJson.set(locale, Object.assign(exisitingMessagesJson, json));
}

// see also: https://www.w3.org/International/questions/qa-choosing-language-tags

/**
 * A simple internationalization (i18n) module that provides functionalities
 * for loading language files, translating text, and managing multiple locales.
 */
export const n81i = {
  /**
   * Loads the language file for the specified locale and caches it.
   * @see {@link https://developer.chrome.com/docs/extensions/reference/api/i18n}
   * for acceptable locales.
   * @param locale - The locale to load (e.g., "en", "fr").
   */
  async loadLanguage(locale: string) {
    if (!localeAndMessagesJson.has(locale)) {
      const response = await fetch((urls as any)[locale]);
      const json = await response.json();
      mergeMessagesJson(locale, json);
    }
  },
  /**
   * Initializes the i18n module with the specified options.
   * This method should be called before any translation occurs.
   * @param options - Configuration options for initialization.
   * @param options.locale - The initial locale to set (default is "en").
   * @param options.availableLocales - Array of available locales.
   * @param options.fallback - (Optional) Fallback locale if a key is not found.
   * @returns The initialized i18n module.
   */
  async init(
    options: N81iInitOptions = {
      locale: "en",
      availableLocales: ["en"],
    },
  ) {
    await this.changeLanguage(options.locale);
    if (options.fallback) {
      fallback = options.fallback;
      await this.loadLanguage(fallback);
    }
    if (options.availableLocales) {
      availableLocales = options.availableLocales;
    }
    isInitialized = true;
    while (todos.length > 0) {
      todos.pop()!();
    }
    return this;
  },
  /**
   * Changes the current language by loading the appropriate language file
   * and updating the internal message map.
   * @param locale - The locale to switch to.
   */
  async changeLanguage(locale: string) {
    _locale = locale;
    await this.loadLanguage(locale);
    for (const [key, value] of Object.entries(
      localeAndMessagesJson.get(locale)!,
    )) {
      messageMap.set(`${locale}@${key}`, (value as Message).message);
    }
  },
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
  t(key: string) {
    if (!isInitialized) {
      throw Error("Please call .init() first or use `translateLater`.");
    } else {
      // TODO: maybe notify user the key does not exists?
      return (
        messageMap.get(`${_locale}@${key}`) ??
        messageMap.get(`${fallback}@${key}`) ??
        key
      );
    }
  },
  /**
   * Translates a key asynchronously. If the module is not yet initialized,
   * the translation will be performed later when initialization is complete.
   * @param key - The translation key.
   * @param onComplete - A callback function that receives the translated
   * string.
   *
   * @example
   * ```typescript
   * n81i.translateLater("hello", (msg) => {
   *   console.log(msg); // "你好"
   * })
   * ```
   */
  translateLater(
    key: string,
    onComplete: (translated: string) => void = () => {},
  ) {
    if (isInitialized) {
      onComplete(this.t(key));
    } else {
      todos.push(() => onComplete(this.t(key)!));
    }
  },
  /**
   * Translates an HTML element and its children based on the `data-i18n` attribute.
   * The attribute `data-i18n-for` can be used to specify which attribute to set the translation to.
   * @param element - The HTML element to translate.
   */
  translateElement(element: HTMLElement | DocumentFragment) {
    const children = element.querySelectorAll("[data-i18n]");
    for (const el of [...children, element]) {
      const { i18n, i18nFor } = el.dataset ?? {};
      if (i18n) {
        this.translateLater(i18n, (message) => {
          if (i18nFor) {
            (el as any).setAttribute(i18nFor, message);
          } else {
            el.textContent = message;
          }
        });
      }
    }
  },
  /**
   * Translates the entire page by translating all elements with the `data-i18n` attribute.
   */
  translatePage() {
    for (const el of document.querySelectorAll("[data-i18n]")) {
      this.translateElement(el as HTMLElement);
    }
  },
  /**
   * Adds additional translations to the i18n module.
   * @param resource - A resource object containing translations for multiple locales.
   *
   * @example
   * ```typescript
   * n81i.addTranslations({
   *   ja: {
   *     hello: {
   *       message: "こんにちは",
   *       description: "Greeting message for nav bar.",
   *     },
   *   },
   *   zh_TW: {
   *     hello: {
   *       message: "你好",
   *       description: "Greeting message for nav bar.",
   *     },
   *   },
   * });
   * ````
   */
  addTranslations(resource: N81iResource) {
    for (const [locale, json] of Object.entries(resource)) {
      if (availableLocales.indexOf(locale) === -1) {
        availableLocales.push(locale);
      }
      mergeMessagesJson(locale, json);
    }
  },
  /**
   * Returns the list of all available locales.
   * @returns An array of available locale strings.
   */
  getAllLocales() {
    return availableLocales;
  },
  /**
   * Returns the current active locale.
   * @returns The current locale string.
   */
  getCurrentLocale() {
    return _locale;
  },
};
