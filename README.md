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

**Sticky** is the core feature of mencrouche, allowing you to drag, resize, pin, or hide the border of stickies. You can also extend sticky functionality to fit your needs, such as creating Markdown sticky, YouTube sticky, or Spotify sticky.

Mencrouche provides rich API for extensions:
- [Sticky](#create-the-clock-sticky)
- [Selector Shorthands](#dollars-api---)
- [Internationalization](#internationalization-api-n81i)
- [Undo/Repo](#undoredo-api-apocalypse)
- [Context Menu](#context-menu-api)
- [Commands](#commands-api)

### Create the _Clock Sticky_

Let's create a Clock sticky that displays the current time. We'll add a `span` element inside the sticky body and update the time using `setInterval`. Paste the following code into the browser console:

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

After executing the code, you should see a sticky appended to the workspace:

![動畫](https://github.com/user-attachments/assets/7746b05e-caac-4572-88ba-3187183f0201)

The `on` functions are sticky life cycles:

![圖片](https://github.com/user-attachments/assets/0211c6c0-6edc-490c-b24d-dd0735d90246)

#### Improving the Clock Sticky

The previous code snippet does not clean up the `setInterval` callback. If you close the sticky, the callback continues to run, leading to unnecessary calculations. Below is an improved version (remember to refresh the page before pasting):

```javascript
mc.registerSticky({
  type: "clock",
  onCreate(sticky) {
    const span = document.createElement("span");
    sticky.replaceBody(span);

    // Store in `sticky.plugin` to prevent name collision.
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

In this version, "update time" is printed every 100ms. After closing the sticky, the message will no longer appear.

#### Adding Color to the Clock

Next, we'll add a feature to change the clock's color.

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
    // Save the color to use later in `onRestore`
    return {
      color: sticky.plugin.color,
    };
  },
  onDelete(sticky) {
    clearInterval(sticky.plugin.intervalId);
  },
  onRestore(sticky, pluginConfig) {
    enableClock(sticky);
    sticky.querySelector("span").style.color = pluginConfig.color;
  },
});
mc.stickyManager.create({ type: "clock" });
```

Ta-da!

![動畫](https://github.com/user-attachments/assets/2d25d439-d308-4f1d-a153-b61ad8adc099)

The new version refactored the DOM elements initialization, and established interactivity into one `enableClock` function. The `onSave` function returns an object containing the color property, which is stored in a JSON file. During `onRestore`, we retrieve and apply this saved color using the pluginConfig parameter.

## Dollars API ($ $$ $$$)

In my opinion, the JQuery API is more intuitive than the native DOM API, but we didn’t want to include JQuery due to its package size. So, we created our own lightweight JQuery-like tool for Mencrouche, called *Dollars*.

### From JQuery to Dollars

- A single dollar sign selects only the first matching element:
    ```javascript
    // JQuery
    $("a")[0].href = "https://youtube.com";

    // Dollars
    mc.$("a").href = "https://youtube.com";
    ```
- Double dollar signs return an array of selected elements. There are no helper functions:
    ```javascript
    // JQuery
    $("a").addClass("link");

    // Dollars
    mc.$$("a").forEach((el) => el.classList.add("link"));
    ```
- Triple dollar signs are an alias for `document.createElement()`:
    ```javascript
    // JQuery
    $("<div></div>");

    // Dollars
    mc.$$$("div");
    ```
- Trailing `$` and `$$` are used for selecting elements within a subtree:
    ```javascript
    // JQuery
    $(pureDomElement, ".comment").value("Start typing");

    // Dollars
    mc.$(pureDomElement).$(".comment").value = "Start typing";
    mc.$(pureDomElement).$$(".comment").forEach((el) => el.value = "Start typing");
    ```

## Internationalization API (n81i)

Mencrouche has a built-in internationalization feature. Use `mc.n81i` (the palindrome of the i18n ;) ) to translate content into different locales.

### Basic Usage

#### Adding Translations
```javascript
mc.n81i.addTranslations({
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

await mc.n81i.changeLanguage("zh_TW");
console.log(mc.n81i.t("hello")); // prints "你好"
```

#### Translating HTML Elements

Use the `data-i18n` attribute to specify a translation key. By default, it will replace the `textContent` of element. Add a `data-i18n-for` to inject translated message into a specific attribute.

```javascript
// Before: <div data-i18n="author"></div>
//  After: <div data-i18n="author">作者</div>
mc.n81i.translateElement(div);

// Before: <input data-i18n="email" data-i18n-for="placeholder" />
//  After: <input data-i18n="email" data-i18n-for="placeholder" placeholder="電子郵件" />
mc.n81i.translateElement(input);
```

## Undo/Redo API (apocalypse)

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

mc.apocalypse.undo(); // Undo previous changes.
mc.apocalypse.redo(); // Redo changes.
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
