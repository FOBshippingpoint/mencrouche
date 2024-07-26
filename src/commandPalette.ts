import { dataset } from "./dataset";
import { createKikey } from "./kikey";
import type { KeyBinding } from "./kikey/parseBinding";
import { toggleSettingsPage } from "./settings";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

interface Command {
  key: string;
  name: string;
  keySequence: KeyBinding[];
  execute: () => void;
}

type CommandKey = string;

const commandMap: Record<string, Command> = {
  toggleSettings: {
    key: "toggleSettings",
    name: "toggle_settings",
    keySequence: [
      {
        ctrlKey: true,
        key: ",",
      },
    ],
    execute() {
      toggleSettingsPage();
    },
  },
  toggleDarkMode: {
    key: "toggleDarkMode",
    name: "toggle_dark_mode",
    keySequence: [
      {
        ctrlKey: true,
        shiftKey: true,
        key: "l",
      },
    ],
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
  },
  openYouTube: {
    key: "openYouTube",
    name: "open_youtube",
    keySequence: [
      {
        ctrlKey: true,
        key: "o",
      },
    ],
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
  },
  saveDocument: {
    key: "saveDocument",
    name: "save_document",
    keySequence: [
      {
        ctrlKey: true,
        altKey: true,
        key: "d",
      },
    ],
    execute() {
      localStorage.setItem("body", document.body.innerHTML);
    },
  },
  toggleTransparentWindow: {
    key: "toggleTransparentWindow",
    name: "toggle_transparent_window",
    keySequence: [
      {
        altKey: true,
        key: "g",
      },
    ],
    execute() {
      dataset.derivedSetItem<boolean>(
        "isGhostMode",
        (isGhostMode) => !isGhostMode,
      );
    },
  },
};

export function initCommandPalette() {
  const commandPalette = $<HTMLDivElement>("#commandPalette")!;
  const searchInput = $<HTMLInputElement>("#searchInput")!;
  const resultsList = $<HTMLUListElement>("#resultsList")!;

  let keyboardSelectedCommandKey: CommandKey | null = null;

  const kikey = createKikey();
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
    keyboardSelectedCommandKey = null;
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
      li.dataset.commandKey = command.key;
      li.innerHTML = `
        <span class="commandText">${n81i.t(command.name)}</span>
        <kbd>${keySequenceToString(command.keySequence)}</kbd>
      `;
      // Select first command by default.
      if (i === 0) {
        li.setAttribute("aria-selected", "true");
        keyboardSelectedCommandKey = command.key;
      }
      resultsList.append(li);
      li.addEventListener("click", () => {
        closeCommandPalette();
        executeCommand(command.key);
      });
    });
  }

  function selectCommand(direction: "up" | "down") {
    const items = [...resultsList.children];
    let idx = items.findIndex(
      (item) => item.dataset.commandKey === keyboardSelectedCommandKey,
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
    keyboardSelectedCommandKey = selectedItem?.dataset.commandKey!;
  }

  function executeCommand(commandKey: CommandKey) {
    commandMap[commandKey].execute();
  }

  function executeKeyboardSelectedCommand() {
    if (keyboardSelectedCommandKey) {
      executeCommand(keyboardSelectedCommandKey);
    }
  }

  // Initialize key bindings
  for (const command of Object.values(commandMap)) {
    kikey.on(command.keySequence, command.execute);
  }

  kikey.on("C-.", toggleCommandPalette);
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

function keyBindingToString(binding: KeyBinding, isMac = false): string {
  const modifiers = [
    { key: "ctrlKey", default: "Ctrl", mac: "⌘" },
    { key: "shiftKey", default: "Shift", mac: "⇧" },
    { key: "altKey", default: "Alt", mac: "⌥" },
    { key: "metaKey", default: "Meta", mac: "⌃" },
  ];

  const parts = modifiers
    .filter((mod) => binding[mod.key as keyof KeyBinding])
    .map((mod) => (isMac ? mod.mac : mod.default));

  let key = binding.key;
  const arrowKeys: { [key: string]: string } = {
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  key = arrowKeys[key.toLowerCase()] ?? key;

  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join("+");
}
function keySequenceToString(sequence: KeyBinding[]) {
  return sequence.map((b) => keyBindingToString(b)).join(", ");
}
