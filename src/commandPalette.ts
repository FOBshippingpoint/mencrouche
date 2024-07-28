import { dataset } from "./dataset";
import { createKikey } from "./kikey";
import { shortcutManager, toggleSettingsPage } from "./settings";
import { $, $$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

interface Command {
  name: string;
  execute: () => void;
}

type CommandName = string;

// TODO: Maybe we can use simple key = name, value = execute structure.
const commandMap: Record<string, Command> = {
  toggle_settings: {
    name: "toggle_settings",
    execute() {
      toggleSettingsPage();
    },
  },
  toggle_dark_mode: {
    name: "toggle_dark_mode",
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
  },
  open_youtube: {
    name: "open_youtube",
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
  },
  save_document: {
    name: "save_document",
    execute() {
      localStorage.setItem("body", document.body.innerHTML);
    },
  },
  toggle_ghost_mode: {
    name: "toggle_ghost_mode",
    execute() {
      dataset.derivedSetItem<boolean>(
        "isGhostMode",
        (isGhostMode) => !isGhostMode,
      );
    },
  },
  remove_all_stickies: {
    name: "remove_all_stickies",
    execute() {
      $$<HTMLButtonElement>(".sticky .removeBtn")!.do((el) => el.click());
    },
  },
};

export function initCommandPalette() {
  const commandPalette = $<HTMLDivElement>("#commandPalette")!;
  const searchInput = $<HTMLInputElement>("#searchInput")!;
  const resultsList = $<HTMLUListElement>("#resultsList")!;

  let keyboardSelectedCommandName: CommandName | null = null;

  const searchKikey = createKikey(searchInput);

  function openCommandPalette() {
    updateResults();
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

  function updateResults() {
    keyboardSelectedCommandName = null;
    resultsList.innerHTML = "";

    const query = searchInput.value.toLowerCase();
    let commands = Object.values(commandMap);
    if (query !== "") {
      commands = commands.filter(({ name }) =>
        name.toLowerCase().includes(query),
      );
    }
    commands.forEach((command, i) => {
      const li = document.createElement("li");
      li.dataset.commandName = command.name;
      console.log(shortcutManager.getKeySequence(command.name));
      li.innerHTML = `
        <span class="commandText">${n81i.t(command.name)}</span>
        <kbd>${shortcutManager.getKeySequence(command.name)}</kbd>
      `;
      // Select first command by default.
      if (i === 0) {
        li.setAttribute("aria-selected", "true");
        keyboardSelectedCommandName = command.name;
      }
      resultsList.append(li);
      li.addEventListener("click", () => {
        closeCommandPalette();
        executeCommand(command.name);
      });
    });
  }

  function selectCommand(direction: "up" | "down") {
    const items = [...resultsList.children];
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
    keyboardSelectedCommandName = selectedItem?.dataset.commandName!;
  }

  function executeCommand(commandName: CommandName) {
    commandMap[commandName].execute();
  }

  function executeKeyboardSelectedCommand() {
    if (keyboardSelectedCommandName) {
      executeCommand(keyboardSelectedCommandName);
    }
  }

  // Initialize key bindings
  for (const command of Object.values(commandMap)) {
    shortcutManager.on(command.name, command.execute);
  }

  shortcutManager.on("toggle_command_palette", toggleCommandPalette);

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
  searchInput.addEventListener("input", updateResults);
}
