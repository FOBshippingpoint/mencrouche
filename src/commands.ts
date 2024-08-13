import { createKikey } from "./kikey";
import { initShortcutManager } from "./settings";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

const contextMenuItemTemplate = $<HTMLTemplateElement>("#menuItem")!;
const contextMenu = $<HTMLDivElement>("#contextMenu")!;

function getIcon(icon: string) {
  const menuItemIconsContainer = (
    $<HTMLTemplateElement>("#menuItemIcons")!.content.cloneNode(true) as any
  ).firstElementChild as HTMLDivElement;
  return menuItemIconsContainer.getElementsByClassName(icon)[0];
}

interface Undoable {
  execute: () => void;
  undo: () => void;
}

export interface Command {
  name: string;
  isMenuItem: boolean;
  menuIconName?: string;
  execute?: () => void;
  makeUndoable?: () => Undoable;
  defaultShortcut?: string;
}

const commands: Command[] = [];

// Cuz 'history' already exists in Web API.
class Apocalypse {
  private arr: Undoable[] = [];
  private cur: number = -1;

  redo() {
    if (this.cur < this.arr.length - 1) {
      this.cur++;
      this.arr[this.cur].execute();
    }
  }
  undo() {
    if (this.cur >= 0) {
      this.arr[this.cur].undo();
      this.cur--;
    }
  }
  write(undoable: Undoable) {
    // If we're in the middle of the stack, remove all "future" commands
    if (this.cur < this.arr.length - 1) {
      this.arr.splice(this.cur + 1);
    }

    this.arr.push(undoable);
    this.cur++;
    undoable.execute();
  }
}
export const apocalypse: Apocalypse = new Apocalypse();

export function initCommandPalette() {
  const shortcutManager = initShortcutManager();
  const commandPalette = $<HTMLDivElement>("#commandPalette")!;
  const searchInput = $<HTMLInputElement>("#searchInput")!;
  const commandList = $<HTMLUListElement>("#commandList")!;
  const commandListItemTemplate = $<HTMLTemplateElement>("#commandListItem")!;

  let keyboardSelectedCommandName: string | null = null;

  const searchKikey = createKikey(searchInput);

  function openCommandPalette() {
    updateFilteredCommands();
    commandPalette.hidden = false;
    searchInput.focus();
  }

  function closeCommandPalette() {
    searchInput.value = "";
    commandPalette.hidden = true;
  }

  function toggleCommandPalette() {
    commandPalette.hidden ? openCommandPalette() : closeCommandPalette();
  }

  function updateFilteredCommands() {
    keyboardSelectedCommandName = null;
    commandList.innerHTML = "";

    const query = searchInput.value.toLowerCase();

    let filteredCommands: Command[];
    if (query === "") {
      filteredCommands = commands;
    } else {
      filteredCommands = commands.filter(({ name }) =>
        name.toLowerCase().includes(query),
      );
    }

    const frag = document.createDocumentFragment();
    for (const { name } of filteredCommands) {
      const li = $(
        (commandListItemTemplate.content.cloneNode(true) as any)
          .firstElementChild,
      );
      li.dataset.commandName = name;
      li.$("span").textContent = n81i.t(name);
      if (shortcutManager.has(name)) {
        li.$("kbd").textContent = shortcutManager.getKeySequence(name);
      } else {
        li.$("kbd").remove();
      }
      li.on("click", () => {
        closeCommandPalette();
        executeCommand(name);
      });
      frag.appendChild(li);
    }

    // Default select first command.
    if (frag.firstElementChild) {
      frag.firstElementChild!.setAttribute("aria-selected", "true");
      keyboardSelectedCommandName = (frag.firstElementChild! as HTMLLIElement)
        .dataset.commandName!;
    }

    commandList.appendChild(frag);
  }

  function selectCommand(direction: "up" | "down") {
    const items = [...commandList.children] as HTMLLIElement[];
    let idx = items.findIndex(
      (item) => item.dataset.commandName === keyboardSelectedCommandName,
    );
    if (idx !== -1) {
      items[idx].setAttribute("aria-selected", "false");
    }

    if (direction === "down") {
      idx = (idx + 1) % items.length;
    } else {
      idx = (idx - 1 + items.length) % items.length;
    }

    const selectedItem = items[idx];
    selectedItem?.setAttribute("aria-selected", "true");
    selectedItem?.scrollIntoView({ block: "nearest" });
    keyboardSelectedCommandName = selectedItem?.dataset.commandName!;
  }

  function executeKeyboardSelectedCommand() {
    if (keyboardSelectedCommandName) {
      executeCommand(keyboardSelectedCommandName);
    }
  }

  // Initialize key bindings
  for (const command of commands) {
    if (command.defaultShortcut) {
      shortcutManager.on(command.name, command.defaultShortcut, () =>
        executeCommand(command.name),
      );
    }
  }

  shortcutManager.on("toggle_command_palette", "C-.", toggleCommandPalette);
  searchKikey.on("escape", closeCommandPalette);
  searchKikey.on("arrowup", (e) => {
    e.preventDefault();
    selectCommand("up");
  });
  searchKikey.on("arrowdown", (e) => {
    e.preventDefault();
    selectCommand("down");
  });
  searchKikey.on("enter", () => {
    closeCommandPalette();
    executeKeyboardSelectedCommand();
  });

  // Initialize event listeners
  searchInput.on("input", updateFilteredCommands);

  shortcutManager.on(
    "undo",
    "C-z",
    (e) => {
      if (!e.target.matches("input,textarea")) {
        apocalypse.undo();
      }
    },
    { shouldPreventDefault: false },
  );
  shortcutManager.on(
    "redo",
    "C-y",
    (e) => {
      if (!e.target.matches("input,textarea")) {
        apocalypse.redo();
      }
    },
    {
      shouldPreventDefault: false,
    },
  );
}

function updateContextMenu() {
  const frag = document.createDocumentFragment();
  for (const command of commands) {
    if (command.isMenuItem) {
      const menuBtn = $<HTMLDivElement>(
        (contextMenuItemTemplate.content.cloneNode(true) as any)
          .firstElementChild,
      )!;
      const span = menuBtn.$<HTMLSpanElement>("span")!;
      span.dataset.i18n = command.name;
      if (command.menuIconName) {
        const icon = getIcon(command.menuIconName);
        menuBtn.insertAdjacentElement("beforeend", icon);
      }
      n81i.translateElement(menuBtn.$<HTMLSpanElement>("span")!);
      menuBtn.on("click", () => {
        executeCommand(command.name);
        contextMenu.classList.add("none");
      });
      frag.appendChild(menuBtn);
    }
  }
  contextMenu.replaceChildren(frag);
}

document.on("contextmenu", (e) => {
  if (!$("#settings")!.classList.contains("none")) return;

  e.preventDefault();
  contextMenu.classList.remove("none");
  contextMenu.style.top = `${Math.min(e.clientY, document.body.getBoundingClientRect().height - contextMenu.getBoundingClientRect().height)}px`;
  contextMenu.style.left = `${Math.min(e.clientX, document.body.getBoundingClientRect().width - contextMenu.getBoundingClientRect().width)}px`;
});

document.on("click", (e) => {
  if ((e as any).target.offsetParent != contextMenu) {
    contextMenu.classList.add("none");
  }
});

export function executeCommand(commandName: string) {
  const command = commands.find(({ name }) => name === commandName);
  if (command) {
    if (command.makeUndoable) {
      // Undoable commands.
      apocalypse.write(command.makeUndoable!());
    } else {
      // Non-undoable commands.
      command.execute!();
    }
  }
}

export function registerCommand(command: Command) {
  if (commands.find(({ name }) => command.name === name)) {
    throw Error(
      `Command '${command.name}' already exists. Please try another name.`,
    );
  }

  commands.push(command);
  updateContextMenu();
}
