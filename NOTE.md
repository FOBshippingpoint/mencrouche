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
    - :: NOTE: Debug zooming is hard, but I found that by comparing the arguments (width, height, x, y etc.) and their combination, it is more easy to find the correct formula.
- [x] zooming reset by ctrl 0
- [ ] Zooming UI
- [x] Fix the default position on top left instead of central problem.
- [ ] Toolbar for mobile.
- [ ] iframe sticky
- [ ] declarativeNetRequest -> unblock iframe
- [ ] Blockly
- [ ] Web extension version.
- [x] Workspace
    - Should looks like Arc's Space, switching between *work*, *school* etc. :: we have the workspace class now, but currently just one instance at time, but it provide the possiblity to implement this feature.
- [ ] Layout Managing
    - easy: fixed layouts.
    - moderate: adjusting size
- [ ] (WIPP::complete the element lifecycle) WYSIWYG text editor
    - Idk I think user won't like/know markdown, they just want an easy-to-use ui for editing rich text. Candidates:
    - [TipTap](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)
    - [Quill](https://quilljs.com/)
    - [Editor.js](https://editorjs.io/)
    - [manigandham/rich-text-html-editors.md](https://gist.github.com/manigandham/65543a0bc2bf7006a487)
- [ ] A11y
- [ ] (WIP) Grant user permission for custom js and css
- [ ] Create intro video and tutorial for end user.

## BUGS

- [x] The background image cannot restore from localstorage.
- [x] The sticky blob image cannot restore from localstorage.
- [x] sticky out of bound when resizing window.
- [x] create sticky on the bottom or right cuz the container size change.
- [x] Context menu will not translate when language switched.
- [x] When sticky is maximized, drag to shrink is working, but the center point is not correct.
- [x] (::because the button trigger "drag to back to normal size", need to find a way to prevent "handle" trigger for it's button child.) When a maximize sticky turn back to normal size by click button, it will lose original y position.
