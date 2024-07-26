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

  async function loadLanguage(locale: string) {
    if (!localeAndMessagesJson.has(locale)) {
      const response = await fetch(`/_locales/${locale}/messages.json`);
      const json = await response.json();
      localeAndMessagesJson.set(locale, json);
    }
  }

  return {
    async init(
      options: N81iInitOption = {
        locale: "en",
        availableLocales: ["en"],
      },
    ) {
      await this.switchLocale(options.locale);
      if (options.fallback) {
        _fallback = options.fallback;
        await loadLanguage(_fallback);
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
      console.log("loadlang", locale);
      await loadLanguage(locale);
      console.log(localeAndMessagesJson);
      for (const [key, value] of Object.entries(
        localeAndMessagesJson.get(locale)!,
      )) {
        messageMap.set(`${locale}@${key}`, (value as Message).message);
      }
      console.log(messageMap);
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
    translatePage() {
      for (const el of document.querySelectorAll("[data-i18n]")) {
        this.translateLater(el.dataset.i18n, (message) => {
          if (el.dataset.i18nForAttr) {
            el.setAttribute(el.dataset.i18nForAttr, message);
          } else {
            el.textContent = message;
          }
        });
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
