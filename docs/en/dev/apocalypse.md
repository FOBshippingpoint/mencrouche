# Apocalypse

The apocalypse API provides undo/redo functionality, user can trigger with <kbd>Ctrl</kbd> + <kbd>Z</kbd> and <kbd>Ctrl</kbd> + <kbd>Y</kbd> shortcuts. Didn't name it History API because it is already taken by [standard Web API](https://developer.mozilla.org/en-US/docs/Web/API/History_API).

## Introduction

Access the API through the `mc.apocalypse` object:

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

## Core Methods

### `apocalypse.write(undoable)`

Records an undoable operation in the history stack and executes it immediately.

```javascript
let originalColor = document.body.style.backgroundColor;
mc.apocalypse.write({
  execute() { // <-- Execute immediately.
    document.body.style.backgroundColor = "blue";
  },
  undo() {
    document.body.style.backgroundColor = originalColor;
  }
});
```

### `apocalypse.undo()`

Undoes the most recent operation in the history stack.

```javascript
mc.apocalypse.undo(); // Reverts the last change
```

### `apocalypse.redo()`

Reapplies a previously undone operation.

```javascript
mc.apocalypse.redo(); // Reapplies a previously undone change
```
