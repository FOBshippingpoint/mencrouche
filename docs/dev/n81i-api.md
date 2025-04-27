# n81i API

The n81i API is a internationalization module for Mencrouche, allowing you to translate content into different languages.

## Introduction

Access the API through the `n81i` object (n81i is the palindrome of i18n):

```javascript
mc.n81i.t("welcomeMessage"); // t = translate
```

Basic Usage:

```javascript
// Adding translations
mc.n81i.addTranslations({
  en: {
    welcomeMessage: {
      message: "Welcome to Mencrouche",
      description: "Main greeting on homepage"
    }
  },
  fr: {
    welcomeMessage: {
      message: "Bienvenue à Mencrouche",
      description: "Main greeting on homepage"
    }
  }
});

// Switching language
await mc.n81i.changeLanguage("fr");

// Using translations
console.log(mc.n81i.t("welcomeMessage")); // Prints "Bienvenue à Mencrouche"
```

## Translation Methods

### `n81i.addTranslations(translations)`

Adds translation definitions for multiple languages.
The `description` property is not needed, just a metadata for the translation itself.

```javascript
mc.n81i.addTranslations({
  ja: {
    hello: {
      message: "こんにちは",
      description: "Greeting message for the nav bar."
    }
  },
  zh_TW: {
    hello: {
      message: "你好",
      description: "Greeting message for the nav bar."
    }
  }
});
```

### `n81i.changeLanguage(locale)`

Changes the active language. Returns a Promise that resolves when the language change is complete.

```javascript
await mc.n81i.changeLanguage("zh_TW");
```

### `mc.n81i.t(key)`

Returns the translated string for the given key in the current language.

```javascript
console.log(mc.n81i.t("hello")); // Returns "你好" if current language is zh_TW
```

### `mc.n81i.translateLater(key, callback)`

Used when n81i might not be fully loaded. The callback will be executed with the translated message once ready.

```javascript
mc.n81i.translateLater("hello", (message) => {
  console.log(message); // "你好" if current language is zh_TW
});
```

### `mc.n81i.translateElement(element)`

Translates an element and it's children based on `data-i18n` attribute.

```javascript
// Before: <div data-i18n="hello"></div>
mc.n81i.translateElement(div); 
//  After: <div data-i18n="hello">你好</div>
```

## HTML Translation Attributes

Add these attributes to elements for automatic translation:

- **`data-i18n`**: Specifies the translation key
- **`data-i18n-for`**: (Optional) Specifies which attribute to translate, defaults to `textContent`

Example:

```html
<!-- Translates textContent -->
<!-- Before -->
<div data-i18n="pleaseSupportCashiering"></div>
<!-- After  -->
<div data-i18n="pleaseSupportCashiering">請支援收銀</div>

<!-- Translates the placeholder attribute -->
<!-- Before -->
<input data-i18n="emailField" data-i18n-for="placeholder">
<!-- After  -->
<input data-i18n="emailField" data-i18n-for="placeholder" placeholder="伊媚兒">
```
