## Development

```sh
# Use `just` tool to start dev server and open webpage in browser.
just
```

## TODOs

- [x] Maximize
- [x] Pin sticky
- [x] Toggle edit/view mode button on sticky controls.
- [x] Split view
- [x] Redo/Undo
- [x] Find a way to disable contextmenu when user pressing shift + right click. (works on ff by default)
- [x] Context menu with focus element.
- [x] Spotify sticky
- [x] Color theme
- [x] Sub menus
- [x] Dock preference always on top.
- [x] Sync
- [x] {impossible} Spotify border radius adjust.
    - Spotify embedded content already had border-radius, unless we can get the background color, we cannot get rid of that border.j
- [x] Dropdown add sticky.
- [x] Add nav for settings.
- [x] Add javascript customization textarea.
- [x] Add css customization textarea.
- [x] Remove flexbox-based autoArrange
- [x] Import document
- [x] Undo/redo for movement and resizing.
- [x] Drag bookmark dock item.
- [x] zooming
    - Separate the dock level to immune from sticky container scaling.
- [ ] Toolbar for mobile.
- [ ] iframe sticky
- [ ] declarativeNetRequest -> unblock iframe
- [ ] Blockly
- [ ] Web extension version.
- [ ] Workspace
    - Should looks like Arc's Space, switching between *work*, *school* etc.
- [ ] Layout Managing
    - easy: fixed layouts.
    - moderate: adjusting size
- [ ] WYSIWYG text editor
    - Idk I think user won't like/know markdown, they just want an easy-to-use ui for editing rich text. Candidates:
    - [TipTap](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)
    - [Quill](https://quilljs.com/)
    - [Editor.js](https://editorjs.io/)

## BUGS

- [x] The background image cannot restore from localstorage.
- [x] The sticky blob image cannot restore from localstorage.
- [x] sticky out of bound when resizing window.
- [x] create sticky on the bottom or right cuz the container size change.
- [x] Context menu will not translate when language switched.
