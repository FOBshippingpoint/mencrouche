import { createKikey } from "kikey";
import { initShortcutManager } from "./settings";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { apocalypse } from "./apocalypse";

export interface Command {
  name: string;
  execute: () => void;
  defaultShortcut?: string;
}

export const commands: Command[] = [];

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
        // TODO: multi language search
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
    let idx = items.findIndex((item) => {
      item.dataset.commandName === keyboardSelectedCommandName;
    });
    if (idx !== -1) {
      items[idx]!.setAttribute("aria-selected", "false");
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

export function executeCommand(commandName: string) {
  const command = commands.find(({ name }) => name === commandName);
  if (!command) {
    throw Error(
      `Command '${commandName}' not found. Please call 'registerCommand' first.`,
    );
  }
  command.execute();
}

export function registerCommand(command: Command) {
  if (commands.find(({ name }) => command.name === name)) {
    throw Error(
      `Command '${command.name}' already exists. Please try another name.`,
    );
  }

  if (command.defaultShortcut) {
    initShortcutManager().on(command.name, command.defaultShortcut, () =>
      executeCommand(command.name),
    );
  }
  commands.push(command);
}
