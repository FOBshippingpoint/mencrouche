import { createKikey } from "./kikey";
import { $ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

const commandPalette = $<HTMLDivElement>("#commandPalette")!;
const searchInput = $<HTMLInputElement>("#searchInput")!;
const resultsList = $<HTMLUListElement>("#resultsList")!;

interface Command {
  key: string;
  name: string;
  shortcut: string;
  execute: Function;
}

const commandMap: Record<string, Command> = {
  setBackgroundImage: {
    key: "setBackgroundImage",
    name: "set_background_image",
    shortcut: "Ctrl+O",
    execute() {
      console.log("set background");
    },
  },
  toggleDarkMode: {
    key: "toggleDarkMode",
    name: "toggle_dark_mode",
    execute() {

    }
  },
} as const;

type CommandKey = keyof typeof commandMap;
let keyboardSelectedCommandKey: CommandKey | null;

function openCommandPalette() {
  updateResults();
  commandPalette.hidden = false;
  searchInput.focus();
}

function closeCommandPalette() {
  searchInput.value = "";
  commandPalette.hidden = true;
}

function updateResults() {
  // clear current selectedCommandKey
  keyboardSelectedCommandKey = null;
  resultsList.innerHTML = "";

  const query = searchInput.value.toLowerCase();
  let commands = Object.values(commandMap);
  if (query !== "") {
    // Filter command by query.
    commands = commands.filter(({ name }) =>
      name.toLowerCase().includes(query),
    );
  }
  commands.forEach((command) => {
    const li = document.createElement("li");
    li.dataset.commandKey = command.key;
    li.innerHTML = `
      <span class="commandText">${n81i.t(command.name)}</span>
      <kbd>${command.shortcut}</kbd>
    `;
    resultsList.append(li);
    li.on("click", () => {
      executeCommand(command.key);
      closeCommandPalette();
    });
  });
}

function selectCommand(direction: "up" | "down") {
  const items = [...resultsList.children];
  let idx = items.findIndex(
    (item) => item.dataset.commandKey === keyboardSelectedCommandKey,
  );
  console.log("current selected index: ", idx, items[idx]);

  // Set the current item to not selected
  if (idx !== -1) {
    items[idx].setAttribute("aria-selected", "false");
  }

  // Calculate the new index based on direction
  if (direction === "down") {
    idx = (idx + 1) % items.length;
  } else {
    console.log("up -1");
    idx = (idx - 1 + items.length) % items.length;
  }

  // Set the new item to selected
  const selectedItem = items[idx];
  selectedItem?.setAttribute("aria-selected", "true");

  // Update the selectedCommandKey
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

const kikey = createKikey();
// TODO: f1 is default help shortcut in chrome.
kikey.on("f1", () => {
  openCommandPalette();
  kikey.once("escape", closeCommandPalette);
});
const searchKikey = createKikey(searchInput);
searchKikey.on("arrowup", (e) => {
  e.preventDefault();
  selectCommand("up");
});
searchKikey.on("arrowdown", (e) => {
  e.preventDefault();
  selectCommand("down");
});
searchKikey.on("enter", () => {
  executeKeyboardSelectedCommand();
  closeCommandPalette();
});

searchInput.addEventListener("input", updateResults);
