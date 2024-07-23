// import platform from "./platform";
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

// You know, i18n :)
export const n81i = (function () {
  let _locale = "en";
  let _fallback = "en";
  const localeAndMessagesJson = new Map<string, MessagesJson>();
  const messageMap = new Map<string, string>();
  let isInitialized = false;

  return {
    init(
      options = {
        locale: "en",
        fallback: null,
      },
    ) {
      this.switchLanguage(options.locale);
      if (options.fallback) {
        _fallback = options.fallback;
      }
      isInitialized = true;
      return this;
    },
    async switchLanguage(locale: string) {
      _locale = locale;
      if (!localeAndMessagesJson.has(locale)) {
        const response = await fetch("/_locales/en/messages.json");
        const json = await response.json();
        localeAndMessagesJson.set(locale, json);
      }
      for (const [key, value] of Object.entries(
        localeAndMessagesJson.get(locale)!,
      )) {
        messageMap.set(`${locale}@${key}`, (value as Message).message);
      }
    },
    t(key: string) {
      if (!isInitialized) {
        throw Error("Please call i18n.init() to load default locale file.");
      }
      // TODO: maybe notify user the key does not exists?
      return (
        messageMap.get(`${_locale}@${key}`) ??
        messageMap.get(`${_fallback}@${key}`) ??
        key
      );
    },
  };
})();
