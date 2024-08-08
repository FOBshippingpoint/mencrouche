import { $$ } from "./dollars";

export function translate() {
  for (const el of $$("[data-i18n]")) {
    el.textContent = platform.i18n.getMessage(el.dataset.i18n);
  }
}

interface Message {
  message: string;
  description: string;
}

interface MessagesJson {
  [key: string]: Message;
}

interface N81iInitOption {
  locale: string;
  availableLocales: string[];
  fallback?: string;
}

// You know, i18n :)
// see also: https://www.w3.org/International/questions/qa-choosing-language-tags
export const n81i = (() => {
  let _locale = "en";
  let _fallback = "en";
  let _availableLocales = ["en"];
  let isInitialized = false;

  const localeAndMessagesJson = new Map<string, MessagesJson>();
  const messageMap = new Map<string, string>();

  type Todo = () => void;
  const todos: Todo[] = [];

  return {
    async loadLanguage(locale: string) {
      if (!localeAndMessagesJson.has(locale)) {
        // Warning: Muse use ./ to write path. If not, it will use
        // http://localhost:5173/_locales/en/messages.json instead of
        // http://localhost:5173/mencrouche/en/messages.json
        const response = await fetch(`./_locales/${locale}/messages.json`);
        const json = await response.json();
        localeAndMessagesJson.set(locale, json);
      }
    },
    async init(
      options: N81iInitOption = {
        locale: "en",
        availableLocales: ["en"],
      },
    ) {
      await this.switchLocale(options.locale);
      if (options.fallback) {
        _fallback = options.fallback;
        await this.loadLanguage(_fallback);
      }
      if (options.availableLocales) {
        _availableLocales = options.availableLocales;
      }
      isInitialized = true;
      while (todos.length > 0) {
        todos.pop()!();
      }
      return this;
    },
    async switchLocale(locale: string) {
      _locale = locale;
      await this.loadLanguage(locale);
      for (const [key, value] of Object.entries(
        localeAndMessagesJson.get(locale)!,
      )) {
        messageMap.set(`${locale}@${key}`, (value as Message).message);
      }
    },
    t(key: string) {
      if (!isInitialized) {
        throw Error("Please call .init() first or use `translateLater`.");
      } else {
        // TODO: maybe notify user the key does not exists?
        return (
          messageMap.get(`${_locale}@${key}`) ??
          messageMap.get(`${_fallback}@${key}`) ??
          key
        );
      }
    },
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
    translateElement(element: HTMLElement) {
      const { i18n, i18nFor } = element.dataset;
      if (i18n) {
        this.translateLater(i18n, (message) => {
          if (i18nFor) {
            element.setAttribute(i18nFor, message);
          } else {
            element.textContent = message;
          }
        });
      }
    },
    translatePage() {
      for (const el of document.querySelectorAll("[data-i18n]")) {
        this.translateElement(el as HTMLElement);
      }
    },
    getAllLocales() {
      return _availableLocales;
    },
    getCurrentLocale() {
      return _locale;
    },
  };
})();
