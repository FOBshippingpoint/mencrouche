import { createSticky, getLatestSticky } from "./createSticky";
import { dataset } from "./dataset";
import { switchDocumentStatus } from "./documentStatus";
import { createKikey } from "./kikey";
import { initShortcutManager, toggleSettingsPage } from "./settings";
import { $, $$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";

const contextMenuItemTemplate = $<HTMLTemplateElement>("#menuItem")!;
const contextMenu = $<HTMLDivElement>("#contextMenu")!;
const menuItemIconsContainer = (
  $<HTMLTemplateElement>("#menuItemIcons")!.content.cloneNode(true) as any
).firstElementChild as HTMLDivElement;

function getIcon(icon: string) {
  return menuItemIconsContainer.getElementsByClassName(icon)[0];
}

interface Command {
  name: string;
  isMenuItem: boolean;
  menuIconName?: string;
  execute: () => void;
}

type CommandName = string;

// TODO: Maybe we can use simple key = name, value = execute structure.
const commandMap: Record<string, Command> = {
  toggle_settings: {
    name: "toggle_settings",
    isMenuItem: false,
    execute() {
      toggleSettingsPage();
    },
  },
  toggle_dark_mode: {
    name: "toggle_dark_mode",
    isMenuItem: false,
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
  },
  open_youtube: {
    name: "open_youtube",
    isMenuItem: false,
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
  },
  save_document: {
    name: "save_document",
    isMenuItem: false,
    async execute() {
      switchDocumentStatus("saving");
      let html = $(".stickyContainer")!.innerHTML;

      const urlMap = dataset.getItem("urls", []);
      if (urlMap) {
        const promises = urlMap.map(async ({ blobUrl }) => {
          const dataUrl = await toDataUrl(blobUrl);
          return { blobUrl, dataUrl };
        });
        const blobToDataUrlMappings = await Promise.all(promises);
        dataset.setItem("urls", blobToDataUrlMappings);
      }

      localStorage.setItem("doc", html);
      switchDocumentStatus("saved");
    },
  },
  toggle_global_ghost_mode: {
    name: "toggle_global_ghost_mode",
    isMenuItem: false,
    execute() {
      dataset.derivedSetItem<boolean>(
        "isGhostMode",
        (isGhostMode) => !isGhostMode,
      );
    },
  },
  delete_all_stickies: {
    name: "delete_all_stickies",
    isMenuItem: false,
    execute() {
      // TODO: use the approach like getLatestSticky()
      $$<HTMLButtonElement>(".sticky .deleteBtn")!.do((el) => el.click());
    },
  },
  new_sticky: {
    name: "new_sticky",
    isMenuItem: true,
    menuIconName: "lucide-plus",
    execute() {
      const sticky = createSticky();
      $(".stickyContainer")?.append(sticky);
      sticky.$("textarea")?.focus();
    },
  },
  delete_sticky: {
    name: "delete_sticky",
    isMenuItem: true,
    menuIconName: "lucide-trash",
    execute() {
      getLatestSticky()?.delete();
    },
  },
  toggle_auto_arrange: {
    name: "toggle_auto_arrange",
    isMenuItem: false,
    execute() {
      $(".stickyContainer")?.classList.toggle("autoArrange");
    },
  },
  toggle_split_view: {
    name: "toggle_split_view",
    isMenuItem: true,
    menuIconName: "lucide-columns-2",
    execute() {
      getLatestSticky()?.custom.toggleSplitView?.();
    },
  },
  toggle_maximize_sticky: {
    name: "toggle_maximize_sticky",
    isMenuItem: true,
    menuIconName: "lucide-maximize-2",
    execute() {
      getLatestSticky()?.toggleMaximize();
    },
  },
  toggle_sticky_edit_mode: {
    name: "toggle_sticky_edit_mode",
    isMenuItem: true,
    menuIconName: "lucide-pencil",
    execute() {
      getLatestSticky()?.custom.toggleEditMode?.();
    },
  },
  toggle_sticky_pin_mode: {
    name: "toggle_sticky_pin_mode",
    isMenuItem: true,
    menuIconName: "lucide-pin",
    execute() {
      getLatestSticky()?.togglePin();
    },
  },
  toggle_ghost_mode: {
    name: "toggle_ghost_mode",
    isMenuItem: true,
    menuIconName: "lucide-box-select",
    execute() {
      getLatestSticky()?.toggleGhostMode();
    },
  },
  duplicate_sticky: {
    name: "duplicate_sticky",
    isMenuItem: true,
    menuIconName: "lucide-copy",
    execute() {
      getLatestSticky()?.duplicate();
    },
  },
};

export function initCommandPalette() {
  const shortcutManager = initShortcutManager();
  const commandPalette = $<HTMLDivElement>("#commandPalette")!;
  const searchInput = $<HTMLInputElement>("#searchInput")!;
  const commandList = $<HTMLUListElement>("#commandList")!;
  const commandListItemTemplate = $<HTMLTemplateElement>("#commandListItem")!;

  let keyboardSelectedCommandName: CommandName | null = null;

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
    let commands = Object.values(commandMap);
    if (query !== "") {
      commands = commands.filter(({ name }) =>
        name.toLowerCase().includes(query),
      );
    }

    const frag = document.createDocumentFragment();
    for (const command of commands) {
      const li = $(
        commandListItemTemplate.content.cloneNode(true).firstElementChild,
      );
      li.dataset.commandName = command.name;
      li.$("span").textContent = n81i.t(command.name);
      li.$("kbd").textContent = shortcutManager.getKeySequence(command.name);
      li.on("click", () => {
        closeCommandPalette();
        executeCommand(command.name);
      });
      frag.appendChild(li);
    }

    // Default select first command.
    frag.firstElementChild!.setAttribute("aria-selected", "true");
    keyboardSelectedCommandName = frag.firstElementChild!.dataset.commandName;

    commandList.appendChild(frag);
  }

  function selectCommand(direction: "up" | "down") {
    const items = [...commandList.children];
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
  searchInput.addEventListener("input", updateFilteredCommands);
}

const frag = document.createDocumentFragment();
const menuItems = Object.values(commandMap).filter(
  ({ isMenuItem }) => isMenuItem,
);
for (const menuItem of menuItems) {
  const menuBtn = $<HTMLDivElement>(
    (contextMenuItemTemplate.content.cloneNode(true) as any).firstElementChild,
  )!;
  const span = menuBtn.$<HTMLSpanElement>("span")!;
  span.dataset.i18n = menuItem.name;
  const icon = getIcon(menuItem.menuIconName);
  if (icon) {
    menuBtn.insertAdjacentElement("beforeend", icon);
  }
  n81i.translateElement(menuBtn.$<HTMLSpanElement>("span")!);
  menuBtn.on("click", () => {
    commandMap[menuItem.name].execute();
    contextMenu.classList.add("none");
  });
  frag.appendChild(menuBtn);
}
contextMenu.replaceChildren(frag);

document.addEventListener("contextmenu", (e) => {
  if (!$("#settings")!.classList.contains("none")) return;

  e.preventDefault();
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.style.left = `${Math.min(e.clientX, document.body.getBoundingClientRect().width - 200)}px`;
  contextMenu.classList.remove("none");
});

document.addEventListener("click", (e) => {
  if (e.target.offsetParent != contextMenu) {
    contextMenu.classList.add("none");
  }
});

export function triggerCommand(commandName: string) {
  commandMap[commandName].execute();
}
