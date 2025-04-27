# Context Menu API

The Context Menu API allows you to **register custom context menus** (via right-click or long-press) for specific DOM elements.

![](/img/context-menu-api/context_menu.webp)

## Introduction

Create context menus by calling:

```javascript
registerContextMenu(name, menuItems);
```

Basic Usage:

```javascript
// Register a "youtube" context menu with one menu item
registerContextMenu("youtube", [
  {
    name: "pauseVideo",
    icon: "lucide-youtube",
    execute(target) {
      target.pauseVideo();
    },
  },
]);
```

To activate the context menu, add a `data-context-menu` attribute to the HTML element:

```html
<div data-context-menu="youtube">
  <!-- YouTube video embed -->
</div>
```

You can also set the attribute dynamically:

```javascript
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
element.dataset.contextMenu = "youtube";
```

**Note**: You can assign multiple context menus to the same element by separating names with spaces:

```html
<div data-context-menu="youtube downloadOptions">
  <!-- Has two context menus combined -->
</div>
```

If you don't want to trigger context menu under an element (and it's children), you can add `data-context-menu="disabled"` for it.

## Menu Item

Each item inside `menuItems` can be a menu item object, menu item object builder function, or a literal string `"hr"` (horizontal rule).

### 1. Menu Item Object

```javascript
{
  name: "copyLink", // n81i key for menu text
  icon: "lucide-link", // (Optional) Iconify icon name, see: https://icon-sets.iconify.design/
  execute: (target) => { // (Optional) callback when clicked
    const url = target.href;
    navigator.clipboard.writeText(url);
  },
}
```

### 2. Menu Item Builder

A function returning a MenuItem at runtime.
Useful for conditional menus based on the element status:

```javascript
(file) => {
  if (file.dataset.locked === "true") {
    return null; // Skip showing this item
  } else {
    return {
      name: "unlock",
      icon: "lucide-unlock",
      execute: () => unlockFile(file),
    };
  }
}
```

---

### 3. "hr" (Horizontal Rule)

Adds a visual separator (`<hr>`) between groups of menu items:

## Submenus

You can create **nested menus** using the `subItems` field:

Example:

```javascript
registerContextMenu("settingsMenu", [
  {
    name: "settings",
    icon: "lucide-settings",
    subItems: [
      { name: "generalSettings", execute: openGeneralSettings },
      { name: "privacySettings", execute: openPrivacySettings },
    ],
  },
]);
```

Hovering over "Settings" will show a submenu with "General Settings" and "Privacy Settings."
