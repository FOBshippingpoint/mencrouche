This file is a note to write down anything trivial.

I found this is useful for tracking bugs or ideas, and can edit without any build step.
Hence, this note is inside git repository, would be cool to see how idea/bug changes.

## Development

### Design Decision Q&A

- Q: Why use camelCase instead of kebab-case for HTML/CSS class/id/variables and Typescript file name?
- A: Actually Mencrouche starts with kebab-case, but I found that is hard to select via double-click, and kebab-case is not a valid JavaScript variable name, so for example an element with HTML `id=custom-js-textarea`, I need to create another variable `customJsTextArea`, it is too annoying for me, and hard to search and replace, you will likely to miss occurrences.
- Q: Why not using default export?
- A: Because named export gives you great LSP auto-import, and I don't want to name things twice.
- Q: Why name things like `Apocalypse` instead of `UndoRedoHistory` or something?
- A: Because I like to name something unique, unlikely to conflict with other libraries or standard Web API. Also, `apocalypse` sounds cooler than `history`, and `lifesafer` is funnier compared to `saveUtil`.

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
- [x] iframe sticky
- [ ] declarativeNetRequest -> unblock iframe
- [ ] Blockly
- [x] Web extension version.
- [ ] Expose traytip API and write doc
- [ ] Add global "paste" event register (for example, pasting youtube link should create a youtube sticky etc.)
- [x] Workspace
    - Should looks like Arc's Space, switching between *work*, *school* etc. :: we have the workspace class now, but currently just one instance at time, but it provide the possiblity to implement this feature.
- [ ] Layout Managing
    - easy: fixed layouts.
    - moderate: adjusting size
- [x] WYSIWYG text editor
    - Idk I think user won't like/know markdown, they just want an easy-to-use ui for editing rich text. Candidates:
        - [TipTap](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)
        - [Quill](https://quilljs.com/)
        - [Editor.js](https://editorjs.io/)
        - [manigandham/rich-text-html-editors.md](https://gist.github.com/manigandham/65543a0bc2bf7006a487)
- [ ] A11y
- [ ] Create intro video and tutorial for end user.
- [x] Grant user permission for custom js and css
- [x] Persist zoom and canvas position, also the original size of maximized sticky.
- [x] Context menu two-side icon to match browser convention.
- [x] Redesign dock api.
- [x] Add setting option for disabling script execution.
- [x] Add ability to configure dock appearance (hide/show, placement, grow).
- [x] Add opengraph metadata.
    - https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Ftweakpane.github.io%2Fdocs%2Fix
    - https://poker.line.naver.jp/
    - https://www.freecodecamp.org/news/what-is-open-graph-and-how-can-i-use-it-for-my-website/
    - https://ogp.me/
- [ ] Ask filename to save (or unnamed.png?) for image sticky.
- [x] Auto adjust aspect ratio for image sticky.

## BUGS

- [ ] Hint is causing overflow in dialog.
- [ ] Popout will be hidden by sticky (e.g., quill link editing).
- [ ] Shortcut changes didn't reflect in command palette
- [x] (::move dock slot into workspace) Can not right-click on dock when alwaysOnTop is disabled.
- [x] Languages dropdown showing nothing.
- [x] Using navbar add sticky, the sticky position should at center instead of top-right.
- [x] Copy sticky is not copying position.
- [x] When drag maximized sticky, header are not centered at cursor.
- [x] Remove note sticky padding.
- [x] It might overwrite the existing idb document if changed offline -> close tab -> back online, cuz we always read remote source first right now. We should compare two documents date.
- [x] Auto arrange not working as expected, the container setting seems weird.
- [x] divider breaks markdown sticky preview.
- [x] Bookmak looks inconsist for different title length
- [x] Custom bookmark image bot working
- [x] Palette hue not reset when leaving without saving.
- [x] Sometimes toggle the settings page, some stickies will reset position.
- [x] Markdown extra whitespace
- [x] Tab not working in markdown sticky
- [x] Script and html not work as expected if use tab :: cannot reproduce :(
- [x] If save maximized sticky, when restore from saved document, the original size will not available.
- [x] Fix maximize not working as expected bug due to crate didn't have w and h
- [x] Quill Editor undo should not trigger mencrouche undo.
- [x] The background image cannot restore from localstorage.
- [x] The sticky blob image cannot restore from localstorage.
- [x] sticky out of bound when resizing window.
- [x] create sticky on the bottom or right cuz the container size change.
- [x] Context menu will not translate when language switched.
- [x] When sticky is maximized, drag to shrink is working, but the center point is not correct.
- [x] (::because the button trigger "drag to back to normal size", need to find a way to prevent "handle" trigger for it's button child.) When a maximize sticky turn back to normal size by click button, it will lose original y position.
