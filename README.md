# Mencrouche - Your browser's new homepage.

![screenshot](https://i.imgur.com/SnR5gHO.png)

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

## Architecture

Mencrouche is built using standard HTML, CSS, and vanilla JavaScript (Web API), without relying on any UI framework. While this approach might slightly reduce DX, it’s beneficial for those who are familiar with web standards. Additionally, you can write plugins using any framework.

The program is designed with extensibility in mind. Mencrouche provides a robust API that allows users and developers to create custom plugins. The core component in Mencrouche is the "sticky," a draggable, scalable `div` element, similar to an application window. You can add HTML content to the sticky body or a control widget in the sticky header, as illustrated below:

```text
.sticky
|_ .stickyHeader
|_ .stickyBody
```

## Serialization Approach

Mencrouche uses an HTML document to serialize data. While JSON is effective for serializing JavaScript objects, it’s less suited for UI elements. However, deserialization involves not just restoring static content but also re-establishing interactivity. For instance, deserializing an HTML button from a string won’t automatically restore its event listeners.

### Sticky Lifecycle

A sticky can go through three different states:
- New
- Restored (from the recycle bin or deserialized from an HTML string)
- Deleted

The `mc` API provides a `registerSticky` method. Here’s a simple clock sticky example:

```javascript
let clearInterval;
function startUpdating() {
  clearInterval = setInterval(() => {
    span.textContent = new Date().toLocaleString();
  }, 100);
}
mc.registerSticky({
  type: "clock", // <-- Sticky type
  onNew(sticky) { // <-- Called when the sticky is newly created
    const span = $$$("span");
    span.classList.add("clock");
    sticky.replaceBody(span); // <-- Inject span element into the sticky body
    startUpdating();
  },
  onRestore(sticky) { // <-- Called when deserialized or restored from the recycle bin
    const span = sticky.$(".clock"); // <-- JQuery-like selectors API
    startUpdating();
  },
  onDelete() { // <-- Called when the sticky is deleted
    clearInterval(); // <-- Run clean-up scripts
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

## Authors

- [@FOBshippingpoint](https://github.com/FOBshippingpoint)

## License

[MIT](https://github.com/FOBshippingpoint/goocoucou-webext/blob/main/LICENSE)
