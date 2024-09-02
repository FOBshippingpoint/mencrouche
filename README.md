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

<!-- ## For Users -->
<!---->
<!-- See the intro video. -->
<!---->
<!-- ## For Developers -->

## Installation

1. Install [Bun](https://bun.sh/docs/installation) (or Node.js if preferred).
2. Install dependencies:
    ```sh
    bun install
    ```
3. Start local development server, will automatically open the page.
    ```sh
    bun dev-site
    ```
4. Have fun!

## Overview

![2024-09-03_02-26](https://github.com/user-attachments/assets/a7e7d3b3-3a51-46e6-99c6-62773bcd5ea7)

**Sticky** is the soul of mencrouche, you can drag, resize, pin, or hide border.
Beyond the basic functionality, you can extend sticky to match your needs.
Just like Markdown sticky, YouTube sticky, and Spotify sticky.

### Create the _Clock Sticky_

Let's create a Clock sticky that shows the current time.
We need to add an `span` element inside sticky body, and update time via `setInterval`.
You can paste following code sample into browser console.

```javascript
mc.registerSticky({
  type: "clock",
  onCreate(sticky) {
    const span = document.createElement("span");
    sticky.replaceBody(span);
    setInterval(() => {
      span.textContent = new Date().toLocaleString();
    }, 100);
  },
  onSave() {},
  onDelete() {},
  onRestore() {},
});
mc.stickyManager.create({ type: "clock" });
```

You should see a sticky appended to the workspace:

![動畫](https://github.com/user-attachments/assets/7746b05e-caac-4572-88ba-3187183f0201)

The `on` functions are **sticky life cycles** as shown below:

![圖片](https://github.com/user-attachments/assets/08d8441b-ffc0-4b07-bba3-2f4c641382ac)

First, we focus on the `onDelete`. The previous snippets did not clean up the `setInterval` callback,
if you close the sticky, callback still exists, which leads to an unnecessary calculation.

Here is the new version (remember to refresh page before paste!):

```javascript
mc.registerSticky({
  type: "clock",
  onCreate(sticky) {
    const span = document.createElement("span");
    sticky.replaceBody(span);

    // Store in sticky.plugin to prevent name collision.
    sticky.plugin.intervalId = setInterval(() => {
      console.log("update time");
      span.textContent = new Date().toLocaleString();
    }, 100);
  },
  onSave() {},
  onDelete(sticky) {
    clearInterval(sticky.plugin.intervalId);
  },
  onRestore() {},
});
mc.stickyManager.create({ type: "clock" });
```

In the new version, you can see "update time" prints every 100ms. After close sticky, you won't see "update time" again.

How about add some color for our clock?

```javascript
function enableClock(sticky) {
  const span = document.createElement("span");
  const randomColorBtn = document.createElement("button");
  randomColorBtn.textContent = "Change color";
  randomColorBtn.addEventListener("click", () => {
    const color = "#" + (~~(Math.random() * (1 << 24))).toString(16);
    span.style.color = color;
    sticky.plugin.color = color;
  });
  sticky.replaceBody(span, randomColorBtn);

  sticky.plugin.intervalId = setInterval(() => {
    span.textContent = new Date().toLocaleString();
  }, 100);
}
mc.registerSticky({
  type: "clock",
  onCreate(sticky) {
    enableClock(sticky);
  },
  onSave(sticky) {
    // Use later in `onRestore`
    return {
      color: sticky.plugin.color,
    };
  },
  onDelete(sticky) {
    clearInterval(sticky.plugin.intervalId);
  },
  onRestore(sticky, pluginConfig) {
    enableClock(sticky);
    span.style.color = pluginConfig.color;
  },
});
mc.stickyManager.create({ type: "clock" });
```

Ta-da!

![動畫](https://github.com/user-attachments/assets/2d25d439-d308-4f1d-a153-b61ad8adc099)

The new `enableClock` function is used for initializing dom elements and intractability. We need to do that on creation and restoration, so it is good to define a function for that.In the `onSave` function, we return an object that contains single property 'color' to construct a JSON file, so that we can restore the stickies based on the saved states.
In `onRestore`, we use the extra argument `pluginConfig` to get saved properties from JSON file.


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
