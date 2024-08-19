# <img width="64" height="64" src="https://raw.githubusercontent.com/FOBshippingpoint/mencrouche/main/img/icon_design.svg" /> [Mencrouche](https://fobshippingpoint.github.io/mencrouche/) 

> Your browser's new homepage.

- Embed YT, Spotify, or web pages.
- Customizable bookmark dock.
- Markdown notes.
- Dark/Light mode support.
- Rich shortcuts with sensible defaults.
- Extensible API for power user.

![screenshot](https://i.imgur.com/OMGVxTd.png)

- Artwork: https://www.pixiv.net/artworks/55632215
- Website: http://abehiroshi.la.coocan.jp/
- Video: https://www.youtube.com/watch?v=dkSeImiW1fQ
- Song: https://open.spotify.com/track/6woV8uWxn7rcLZxJKYruS1

## Getting Started

1. Install [Bun](https://bun.sh/docs/installation) (or Node.js if preferred).
2. Install dependencies:
    ```sh
    bun install
    ```
3. Start the local development server (press `o + enter` to open in the browser):
    ```sh
    bun dev-site
    ```

## Serialization Method

While JSON is effective for serializing JavaScript objects, it’s less suited for UI elements. Thus, Mencrouche uses an HTML to serialize data. However, this approach requires re-establishing interactivity. For instance, deserializing an HTML button from a string won’t automatically restore its event listeners.

### Sticky Lifecycle

A sticky can go through three different states:
- New
- Restored (from the recycle bin or deserialized from an HTML string)
- Deleted

The `mc` API provides a `registerSticky` method. Here’s a simple clock sticky example:

```javascript
let clearInterval;
function startUpdating(span) {
  clearInterval = setInterval(() => {
    span.textContent = new Date().toLocaleString();
  }, 100);
}
mc.registerSticky({
  type: "clock", // <-- Sticky type
  onNew(sticky) { // <-- Called when the sticky is newly created
    const span = $$$("span"); // Create span element
    span.classList.add("clock");
    sticky.replaceBody(span); // Inject span element into the sticky body
    startUpdating(span);
  },
  onRestore(sticky) { // <-- Called when deserialized or restored from the recycle bin
    const span = sticky.$(".clock"); // JQuery-like selectors API
    startUpdating(span);
  },
  onDelete() { // <-- Called when the sticky is deleted
    clearInterval(); // Run clean-up scripts
  },
});
```

## Dollars API ($, $$, $$$)

In my opinion, the JQuery API is more intuitive than the native DOM API, but we didn’t want to include JQuery due to its package size. So, we created our own lightweight JQuery-like tool for Mencrouche, called *Dollars*.

### From JQuery to Dollars

- A single dollar sign selects only the first matching element:
    ```javascript
    // JQuery
    $("a")[0].href = "https://youtube.com";

    // Dollars
    $("a").href = "https://youtube.com";
    ```
- Double dollar signs return an array of selected elements. There are no helper functions:
    ```javascript
    // JQuery
    $("a").addClass("link");

    // Dollars
    $$("a").forEach((el) => el.classList.add("link"));
    ```
- Triple dollar signs are an alias for `document.createElement()`:
    ```javascript
    // JQuery
    $("<div></div>");

    // Dollars
    $$$("div");
    ```
- Trailing `$` and `$$` are used for selecting elements within a subtree:
    ```javascript
    // JQuery
    $(pureDomElement, ".comment").value("Start typing");

    // Dollars
    $(pureDomElement).$(".comment").value = "Start typing";
    $(pureDomElement).$$(".comment").forEach((el) => el.value = "Start typing");
    ```

## Internationalization API (n81i)

Mencrouche has a built-in internationalization feature. Use `n81i` (the palindrome of the i18n ;) ) to translate content into different locales.

### Basic Usage

#### Adding Translations
```javascript
n81i.addTranslations({
  ja: {
    hello: {
      message: "こんにちは",
      description: "Greeting message for the nav bar.",
    },
  },
  zh_TW: {
    hello: {
      message: "你好",
      description: "Greeting message for the nav bar.",
    },
  },
});

n81i.changeLanguage("zh_TW");
console.log(n81i.t("hello")); // prints "你好"
```

#### Translating HTML Elements

Use the `data-i18n` attribute to specify a translation key. By default, it will replace the `textContent` of element. Add a `data-i18n-for` to inject translated message into a specific attribute.

```javascript
// Before: <div data-i18n="author"></div>
//  After: <div data-i18n="author">作者</div>
n81i.translateElement(div);

// Before: <input data-i18n="email" data-i18n-for="placeholder" />
//  After: <input data-i18n="email" data-i18n-for="placeholder" placeholder="電子郵件" />
n81i.translateElement(input);
```

## Apocalypse (Undo/Redo API)

The apocalypse API allowing users to revert or reapply changes. Users can trigger undo/redo actions via `Ctrl + Z` and `Ctrl + Y`.

```javascript
let bookmark;
mc.apocalypse.write({
  execute() { // <-- Execute immediately.
    bookmark = createBookmark();
  },
  undo() {
    bookmark.remove();
  },
});

apocalypse.undo(); // Undo previous changes.
apocalypse.redo(); // Redo changes.
```

## Context Menu API

You can use `mc.registerContextMenu` to create custom context menus associated with specific DOM elements. By assigning a `data-context-menu` attribute to a target element, the target element will returns for `execute` function.

```javascript
// Assign the data-context-menu attribute for DOM element as context menu target.
youtubeSticky.dataset.contextMenu = "youtube";
mc.registerContextMenu("youtube", [
  {
    name: "pause_video",
    icon: "lucide-youtube",
    execute(target) {
      // In this example, target === youtubeSticky.
      // You may have multiple youtubeStickies. In that case, the target 
      // indicates the sticky, from which the user triggers the context menu.

      target.pauseVideo();
    },
  },
]);
```

## Commands API

Use `mc.registerCommand` to register custom commands within Mencrouche. The commands will show in command palette or context menu. You can also give shortcuts for the commands (see [KikeyJS Doc](https://fobshippingpoint.github.io/kikey/) for more information).

```javascript
mc.registerCommand({
    name: "say_hi", // This string will be the key of `n81i`,
                    // you should add translations for this key.
    execute() {
      alert("Hi");
    },
    defaultShortcut: "C-A-h", // Ctrl + Alt + H
});

mc.executeCommand("say_hi");
```

## Authors

- [@FOBshippingpoint](https://github.com/FOBshippingpoint)

## License

[MIT](https://github.com/FOBshippingpoint/goocoucou-webext/blob/main/LICENSE)
