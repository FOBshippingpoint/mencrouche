# [Mencrouche](https://mencrouche.com)

![feature_image](https://github.com/user-attachments/assets/2ff6f50b-6183-4ff2-9411-e2f2e5e81c90)

> Homepage for you.

- Highly customizable
- YouTube, Spotify, web page integration
- Sane defaults
- Extensible API for power user

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

**Sticky** is the core feature of mencrouche, allowing you to drag, resize, pin, or hide the border of stickies. You can also extend sticky functionality to fit your needs, such as creating RSS feed sticky, weather sticky, etc. 

Mencrouche provides rich API for extensions:
- [Sticky](#create-the-clock-sticky)
- [Selector Shorthands](#dollars-api----h)
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
mc.workspace.create({ type: "clock" });
```

After executing the code, you should see a sticky appended to the workspace:

![動畫](https://github.com/user-attachments/assets/7746b05e-caac-4572-88ba-3187183f0201)

Functions with `on` prefix are sticky life cycle hooks:

![圖片](https://github.com/user-attachments/assets/0211c6c0-6edc-490c-b24d-dd0735d90246)

#### Improving the Clock Sticky

The previous code snippet does not clean up the `setInterval` callback. If you close the sticky, the callback continues to run, leading to unnecessary calculations. Below is an improved version:

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
mc.workspace.create({ type: "clock" });
```

In this version, "update time" is printed every 100ms. After closing the sticky, the `onDelete` will call, to clear interval callback.

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
mc.workspace.create({ type: "clock" });
```

Ta-da!

![動畫](https://github.com/user-attachments/assets/2d25d439-d308-4f1d-a153-b61ad8adc099)

The new version refactored the DOM elements initialization, and established interactivity into one `enableClock` function. The `onSave` function returns an object containing the color property, which is stored in a JSON file. During `onRestore`, we retrieve and apply this saved color using the pluginConfig parameter.

## Dollars API ($ $$ $$$ h)

Dollars is a JQuery-like API, or more accurately, shorthands for most-used functions.

### Summary

| Function/Alias | Syntax | Purpose | Returns | Example |
|-------------|---------|---------|----------|---------|
| `$` | `$("selector")` | Select first matching element | Single element | `$("a").href = "url"` |
| `$$` | `$$("selector")` | Select all matching elements | Array of elements | `$$("a").forEach(el => ...)` |
| `$$$` | `$$$("tagName")` | Create new element | New element | `$$$("div")` |
| Element.`$` | `element.$("selector")` | Select first match within element | Single element | `myDiv.$(".item").value = "text"` |
| Element.`$$` | `element.$$("selector")` | Select all matches within element | Array of elements | `myDiv.$$(".item").forEach(...)` |
| `on` | `element.on("event", handler)` | Add event listener | - | `button.on("click", () => ...)` |
| `off` | `element.off("event", handler)` | Remove event listener | - | `button.off("click", handler)` |
| `h` | `h("html string")` | Convert HTML string to element | New element | `h("<div>Hello</div>")` |

### From JQuery to Dollars

- A single dollar sign selects only the first matching element:
    ```javascript
    // JQuery
    $("a")[0].href = "https://youtube.com";

    // Dollars
    mc.$("a").href = "https://youtube.com";
    ```
- Double dollar signs return an *array* of selected elements. There are no helper functions:
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
    $(pureDomElement, ".comment").val("Start typing");

    // Dollars
    // There is no need to wrap element with $() because $ and $$ are prototype functions.
    pureDomElement.$(".comment").value = "Start typing";
    pureDomElement.$$(".comment").forEach((el) => el.value = "Start typing");
    ```
- `on`, `off` for add or remove event listeners:
    ```javascript
    // JQuery
    $(button).click(function() { alert("hello"); });

    // Dollars
    button.on("click", function() { alert("hello"); });
    ```
- `h` are a HTML string to Element constructor:
    ```javascript
    // JQuery
    $.parseHTML("<div></div>");

    // Dollars
    mc.h("<div></div>");
    ```

### Practical Example

We can combine previous [clock example](#adding-color-to-the-clock) with Dollars API:

```javascript
function enableClock(sticky, color) {
  const clockBody = mc.h(`
                      <span ${color ? `style="color: ${color}` : ""}></span>
                      <button type="button">
                        Change Color
                      </button>
                      `);
  const timeElement = clockBody.$("time");
  const randomColorBtn = clockBody.$("button");
  sticky.replaceBody(clockBody);

  randomColorBtn.on("click", () => {
    const color = "#" + (~~(Math.random() * (1 << 24))).toString(16);
    timeElement.style.color = color;
    sticky.plugin.color = color;
  });

  sticky.plugin.intervalId = setInterval(() => {
    timeElement.textContent = new Date().toLocaleString();
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
    enableClock(sticky, pluginConfig.color);
  },
});
mc.workspace.create({ type: "clock" });
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

// Use `translateLater` when n81i is not ready
mc.n81i.translateLater("hello", (msg) => {
  console.log(msg); // "你好"
})
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

Apocalypse API allowing users to revert or reapply changes. Users can trigger undo/redo actions via `Ctrl + Z` and `Ctrl + Y`.

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
document.querySelectorAll(".youtubeSticky")
        .forEach(s => s.dataset.contextMenu = "youtube");
        // The dataset property will map to HTML data-context-menu
mc.registerContextMenu("youtube", [
  {
    name: "pause_video",
    icon: "lucide-youtube",
    execute(target) {
      // target = the youtube sticky that user right-click on
      target.pauseVideo();
    },
  },
]);
```

## Commands API

Use `mc.registerCommand` to register custom commands within Mencrouche. The commands will show in command palette or context menu. You can also give shortcuts for the commands (see [KikeyJS Doc](https://fobshippingpoint.github.io/kikey/) for more information).

```javascript
mc.registerCommand({
    name: "sayHi", // This string will be the key of `n81i`,
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
