import {
  Sticky,
  enableFunctionality,
  initStickyEnvironment,
  registerSticky,
} from "./sticky";
import { $, $$ } from "./utils/dollars";
import {
  initCommandPalette,
  executeCommand,
  registerCommand,
  Command,
  commands,
  apocalypse,
} from "./commands";
import { initSettings } from "./settings";
import { n81i } from "./utils/n81i";
import { switchDocumentStatus } from "./documentStatus";
import { createSticky, getLatestSticky } from "./sticky";
import { dataset, saveDataset } from "./myDataset";
import { toggleSettingsPage } from "./settings";
import { standardSticky } from "./stickyPlugins/standard";
import { youtubeSticky } from "./stickyPlugins/youtube";
import { toDataUrl } from "./utils/toDataUrl";
import { addPublicApi } from "./publicApi";
import { initContextMenu, registerContextMenu } from "./contextMenu";
import "./dock";
import { initDock } from "./dock";

const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

const AVAILABLE_LOCALES = ["en", "zh_TW"];

const defaultCommands: Command[] = [
  {
    name: "toggle_settings",
    isMenuItem: false,
    execute() {
      toggleSettingsPage();
    },
    defaultShortcut: "C-,",
  },
  {
    name: "toggle_dark_mode",
    isMenuItem: false,
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
    defaultShortcut: "C-S-l",
  },
  {
    name: "open_youtube",
    isMenuItem: false,
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
    defaultShortcut: "C-o",
  },
  {
    name: "save_document",
    isMenuItem: false,
    async execute() {
      switchDocumentStatus("saving");
      let html = $(".stickyContainer")!.innerHTML;

      const urls = dataset.getItem("urls", []);
      if (urls) {
        const promises = urls.map(async ({ blobUrl }) => {
          const dataUrl = await toDataUrl(blobUrl);
          return { blobUrl, dataUrl };
        });
        const blobToDataUrlMappings = await Promise.all(promises);
        dataset.setItem("urls", blobToDataUrlMappings);
      }

      localStorage.setItem("doc", html);
      saveDataset();
      switchDocumentStatus("saved");
    },
    defaultShortcut: "C-s",
  },
  {
    name: "toggle_global_ghost_mode",
    isMenuItem: false,
    execute() {
      dataset.derivedSetItem<boolean>(
        "isGhostMode",
        (isGhostMode) => !isGhostMode,
      );
    },
    defaultShortcut: "C-A-g",
  },
  {
    name: "delete_all_stickies",
    isMenuItem: false,
    execute() {
      // TODO: use the approach like getLatestSticky()
      $$<HTMLButtonElement>(".sticky .deleteBtn")!.do((el) => el.click());
    },
    defaultShortcut: "C-A-x",
  },
  {
    name: "new_standard_sticky",
    isMenuItem: true,
    menuIconName: "lucide-plus",
    makeUndoable() {
      // TODO: merge new sticky makeUndoable
      let sticky: Sticky | null = null;
      let coord: { left: string; top: string } | null = null;

      return {
        execute() {
          if (coord) {
            sticky = createSticky("standard", { coord });
          } else {
            sticky = createSticky("standard");
          }
          coord = { left: sticky.style.left, top: sticky.style.top };
          $<HTMLDivElement>(".stickyContainer")!.append(sticky);
        },
        undo() {
          if (sticky) {
            sticky.forceDelete();
            sticky = null;
          }
        },
      };
    },
    defaultShortcut: "C-q",
  },
  {
    name: "new_youtube_sticky",
    isMenuItem: true,
    makeUndoable() {
      let sticky: Sticky | null = null;
      let coord: { left: string; top: string } | null = null;

      return {
        execute() {
          if (coord) {
            sticky = createSticky("youtube", { coord });
          } else {
            sticky = createSticky("youtube");
          }
          coord = { left: sticky.style.left, top: sticky.style.top };
          $<HTMLDivElement>(".stickyContainer")!.append(sticky);
        },
        undo() {
          if (sticky) {
            sticky.forceDelete();
            sticky = null;
          }
        },
      };
    },
    defaultShortcut: "C-A-y",
  },
  {
    name: "delete_sticky",
    isMenuItem: true,
    menuIconName: "lucide-trash",
    execute() {
      getLatestSticky()?.delete();
    },
    defaultShortcut: "A-x",
  },
  {
    name: "toggle_auto_arrange",
    isMenuItem: false,
    execute() {
      $(".stickyContainer")?.classList.toggle("autoArrange");
    },
    defaultShortcut: "A-r",
  },
  {
    name: "toggle_split_view",
    isMenuItem: true,
    menuIconName: "lucide-columns-2",
    execute() {
      getLatestSticky()?.plugin.standard?.toggleSplitView();
    },
    defaultShortcut: "A-v",
  },
  {
    name: "toggle_maximize_sticky",
    isMenuItem: true,
    menuIconName: "lucide-maximize-2",
    execute() {
      getLatestSticky()?.toggleMaximize();
    },
    defaultShortcut: "A-m",
  },
  {
    name: "toggle_sticky_edit_mode",
    isMenuItem: true,
    menuIconName: "lucide-pencil",
    execute() {
      getLatestSticky()?.plugin.standard?.toggleEditMode();
    },
    defaultShortcut: "A-e",
  },
  {
    name: "toggle_sticky_pin_mode",
    isMenuItem: true,
    menuIconName: "lucide-pin",
    execute() {
      getLatestSticky()?.togglePin();
    },
    defaultShortcut: "A-p",
  },
  {
    name: "toggle_ghost_mode",
    isMenuItem: true,
    menuIconName: "lucide-box-select",
    execute() {
      getLatestSticky()?.toggleGhostMode();
    },
    defaultShortcut: "A-g",
  },
  {
    name: "duplicate_sticky",
    isMenuItem: true,
    menuIconName: "lucide-copy",
    makeUndoable() {
      const sticky = getLatestSticky();
      let duplicated: Sticky | null = null;

      return {
        execute() {
          duplicated = sticky?.duplicate() ?? null;
        },
        undo() {
          if (duplicated) {
            duplicated?.forceDelete();
            duplicated = null;
          }
        },
      };
    },
    defaultShortcut: "C-d",
  },
];

function getUserPreferredLanguage() {
  // e.g. zh-TW => zh_TW to fit chrome webextension locales
  // see also: https://developer.chrome.com/docs/extensions/reference/api/i18n
  const lang = navigator.language.replaceAll("-", "_");
  if (
    /* If supports user language */
    AVAILABLE_LOCALES.includes(lang)
  ) {
    return lang;
  } else {
    return "en";
  }
}

async function init() {
  let stickyContainerHtml = localStorage.getItem("doc");
  if (stickyContainerHtml) {
    const urls =
      dataset.getItem<{ blobUrl: string; dataUrl: string }[]>("urls") ?? [];
    const promises = urls.map(async ({ blobUrl, dataUrl }) => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return [blobUrl, URL.createObjectURL(blob)];
    });
    for (const [oldUrl, newUrl] of await Promise.all(promises)) {
      stickyContainerHtml = stickyContainerHtml.replaceAll(oldUrl, newUrl);
    }
    dataset.removeItem("urls");

    const fragment = document
      .createRange()
      .createContextualFragment(stickyContainerHtml);
    $(fragment)!.$$(".deleted").kill();
    stickyContainer.replaceChildren(fragment);
  }

  await n81i.init({
    locale: dataset.getOrSetItem<string>(
      "language",
      getUserPreferredLanguage(),
    ),
    availableLocales: AVAILABLE_LOCALES,
  });
  n81i.translatePage();

  $("#newStickyBtn")!.on("click", () => {
    executeCommand("new_standard_sticky");
  });

  switchDocumentStatus("saved");
  new MutationObserver(() => {
    switchDocumentStatus("unsaved");
  }).observe(stickyContainer, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  // Register default commands.
  for (const command of defaultCommands) {
    registerCommand(command);
  }

  const menuItems = [];
  for (const command of defaultCommands) {
    if (command.isMenuItem) {
      const menuItem = {
        name: command.name,
        icon: command.menuIconName,
        execute() {
          if (command.execute) {
            command.execute();
          } else if (command.makeUndoable) {
            apocalypse.write(command.makeUndoable());
          }
        },
      };
      menuItems.push(menuItem);
    }
  }
  document.body.dataset.contextMenu = "main";
  registerContextMenu("main", menuItems);

  initStickyEnvironment();
  initContextMenu();
  initSettings();
  initDock();
  registerSticky(standardSticky);
  registerSticky(youtubeSticky);
  restoreStickies();
  initCommandPalette();
}

function restoreStickies() {
  $$<HTMLDivElement>(".sticky").forEach((sticky) => {
    enableFunctionality(sticky);
  });
}

init();
addPublicApi();
