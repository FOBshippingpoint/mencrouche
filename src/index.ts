import {
  Sticky,
  enableFunctionality,
  initStickyEnvironment,
  registerSticky,
} from "./sticky";
import { $, $$ } from "./utils/dollars";
import {
  initCommandPalette,
  triggerCommand,
  registerCommand,
  Command,
} from "./commands";
import { initSettings } from "./settings";
import { n81i } from "./utils/n81i";
import { switchDocumentStatus } from "./documentStatus";
import { createSticky, getLatestSticky } from "./sticky";
import { dataset, saveDataset } from "./myDataset";
import { toggleSettingsPage } from "./settings";
import { standardSticky } from "./stickyPlugins/standard";
import { toDataUrl } from "./utils/toDataUrl";

const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

const AVAILABLE_LOCALES = ["en", "zh-Hant"];

const defaultCommands: Command[] = [
  {
    name: "toggle_settings",
    isMenuItem: false,
    execute() {
      toggleSettingsPage();
    },
  },
  {
    name: "toggle_dark_mode",
    isMenuItem: false,
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
  },
  {
    name: "open_youtube",
    isMenuItem: false,
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
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
  },
  {
    name: "delete_all_stickies",
    isMenuItem: false,
    execute() {
      // TODO: use the approach like getLatestSticky()
      $$<HTMLButtonElement>(".sticky .deleteBtn")!.do((el) => el.click());
    },
  },
  {
    name: "new_sticky",
    isMenuItem: true,
    menuIconName: "lucide-plus",
    makeUndoable() {
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
  },
  {
    name: "delete_sticky",
    isMenuItem: true,
    menuIconName: "lucide-trash",
    makeUndoable() {
      const sticky = getLatestSticky();
      return {
        execute() {
          sticky?.delete();
        },
        undo() {
          sticky?.recover();
        },
      };
    },
  },
  {
    name: "toggle_auto_arrange",
    isMenuItem: false,
    execute() {
      $(".stickyContainer")?.classList.toggle("autoArrange");
    },
  },
  {
    name: "toggle_split_view",
    isMenuItem: true,
    menuIconName: "lucide-columns-2",
    execute() {
      getLatestSticky()?.plugin.standard?.toggleSplitView();
    },
  },
  {
    name: "toggle_maximize_sticky",
    isMenuItem: true,
    menuIconName: "lucide-maximize-2",
    execute() {
      getLatestSticky()?.toggleMaximize();
    },
  },
  {
    name: "toggle_sticky_edit_mode",
    isMenuItem: true,
    menuIconName: "lucide-pencil",
    execute() {
      getLatestSticky()?.plugin.standard?.toggleEditMode();
    },
  },
  {
    name: "toggle_sticky_pin_mode",
    isMenuItem: true,
    menuIconName: "lucide-pin",
    execute() {
      getLatestSticky()?.togglePin();
    },
  },
  {
    name: "toggle_ghost_mode",
    isMenuItem: true,
    menuIconName: "lucide-box-select",
    execute() {
      getLatestSticky()?.toggleGhostMode();
    },
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
  },
];

function getUserPreferredLanguage() {
  if (navigator.language === "zh-TW") {
    return "zh-Hant";
  } else if (
    /* If supports user language */
    AVAILABLE_LOCALES.includes(navigator.language)
  ) {
    return navigator.language;
  } else {
    return "en";
  }
}

async function init() {
  // TODO: seperate dataset and dom
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

  initStickyEnvironment();
  initSettings();

  $("#newStickyBtn")!.on("click", () => {
    triggerCommand("new_sticky");
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

  registerSticky(standardSticky);
  restoreStickies();
  initCommandPalette();
}

function restoreStickies() {
  $$<HTMLDivElement>(".sticky").forEach((sticky) => {
    enableFunctionality(sticky);
  });
}

init();
