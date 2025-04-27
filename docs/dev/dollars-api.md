# Dollars API

The Dollars API provides a set of convenient shorthands for common DOM manipulation and selection. While not a full replacement for libraries like [jQuery](https://jquery.com/), it offers a similar feel with minimal overhead when interacting with the DOM.

## Introduction

The goal of the Dollars API is to simplify frequently used DOM operations. It provides several functions under the `mc` global object (`mc.$`, `mc.$$`, `mc.$$$`, `mc.h`) and extends native DOM elements with methods (`.$`, `.$$`, `.on`, `.off`) for selecting subtree elements and handling events.

- `$`: selects only the *first* matching element.
- `$$`: selects *all* matching elements and returns them as an array.
- `$$$`: alias for `document.createElement`.
- `h`: constructs HTML elements or a DocumentFragment from a string. (imagine using `innerHTML` for construction)
- `.$`: alias for `element.querySelector`.
- `.$$`: similar to `element.querySelectorAll`, but returns an array.
- `.on`: alias for `element.addEventListener`.
- `.off`: alias for `element.removeEventListener`.

> [!NOTE]
> Browsers also provide `$` and `$$` in devtool consoles [natively](https://developer.chrome.com/docs/devtools/console/utilities/), so don't confuse these with the Dollars API.

## Comparison to jQuery

| jQuery                               | Dollars API                             | Notes                                                                 |
| :------------------------------------- | :-------------------------------------- | :-------------------------------------------------------------------- |
| `$("selector")` (returns collection)   | `$("selector")` (returns first element) | Just like `document.querySelector("selector")` |
| `$("selector").method(...)`            | `$$("selector").forEach(el => el.method(...))` | Dollars returns a native Array; iterate and use native DOM methods.   |
| `$(htmlString)`                        | `h(htmlString)` or `$$$("tagName")`     | Different functions for creating from string vs. tag name.          |
| `$(parent).find("selector")`          | `parent.$("selector")` or `parent.$$("selector")` | Dollars methods are directly on the element, no need to wrap it.    |
| `$(element).on("event", handler)`      | `element.on("event", handler)`          | Direct method on the element.                                         |

## Example Usage

Remember the [Clock Sticky Tutorial](/dev/clock-sticky-tutorial)? Here is a rewritten version that makes use of the Dollars API:

```javascript
mc.registerSticky({
  type: "clock",
  onMount(sticky, origin) {
    let color;
    if (origin === "restore") {
      color = sticky.pluginConfig.color;
    }
    const clockBody = mc.h(`
                        <time ${color ? `style="color: ${color}"` : ""}></time>
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
    });

    sticky.plugin.intervalId = setInterval(() => {
      timeElement.textContent = new Date().toLocaleString();
    }, 1000);
  },
  onSave(sticky) {
    return {
      color: sticky.$("time").style.color,
    };
  },
  onDelete(sticky) {
    clearInterval(sticky.plugin.intervalId);
  },
  css: `.stickyBody { display: grid; place-items: center; }`,
});

mc.workspace.createSticky({ type: "clock" });
```
