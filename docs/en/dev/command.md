# Command

The Command API allows you to **register custom commands** that can be executed via the Command Palette, keyboard shortcuts, or programmatically.

![](/media/command/command_palette.webp)

## Introduction

Create commands by calling:

```javascript
mc.registerCommand(command);
```

Basic Usage:

```javascript
// Register a "sayHello" command with a keyboard shortcut
mc.registerCommand({
  name: "sayHello", // Unique identifier. Will be used as a key for `n81i` translations.
  execute() {       // Function that executes when the command is triggered.
    alert("Hello, world!");
  },
  defaultShortcut: "C-h", // Ctrl + H, see https://fobshippingpoint.github.io/kikey/
});
```

To execute a registered command programmatically:

```javascript
mc.executeCommand("sayHello");
```

**Note**: You can open the Command Palette with `Ctrl + .` to search and execute all registered commands.
