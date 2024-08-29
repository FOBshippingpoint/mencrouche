import {
  CreateStickyOptions,
  Sticky,
  initStickyEnvironment,
  registerSticky,
  stickyManager,
} from "./sticky";
import { $ } from "./utils/dollars";
import {
  initCommandPalette,
  executeCommand,
  registerCommand,
  Command,
} from "./commands";
import { initSettings } from "./settings";
import { n81i } from "./utils/n81i";
import { saveDocument, switchDocumentStatus } from "./documentStatus";
import { createSticky } from "./sticky";
import { dataset } from "./myDataset";
import { toggleSettingsPage } from "./settings";
import { youtubeSticky } from "./stickyPlugins/youtube";
import { addPublicApi } from "./publicApi";
import { initContextMenu, registerContextMenu } from "./contextMenu";
import "./dock";
import { initDock } from "./dock";
import { spotifySticky } from "./stickyPlugins/spotify";
import { initStandardSticky } from "./stickyPlugins/standard";

function newSticky(type: string) {
  let sticky: Sticky | null = null;
  let options: CreateStickyOptions | null = null;

  if (options) {
    sticky = createSticky(type, options);
  } else {
    sticky = createSticky(type);
  }
  options = {
    coord: {
      left: sticky.offsetLeft,
      top: sticky.offsetTop,
    },
    size: {
      width: sticky.offsetWidth,
      height: sticky.offsetHeight,
    },
  };

  return sticky;
}

const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

const AVAILABLE_LOCALES = ["en", "zh_TW"];

const defaultCommands: Command[] = [
  {
    name: "toggle_settings",
    execute() {
      toggleSettingsPage();
    },
    defaultShortcut: "C-,",
  },
  {
    name: "toggle_dark_mode",
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
    defaultShortcut: "C-S-l",
  },
  {
    name: "open_youtube",
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
    defaultShortcut: "C-o",
  },
  {
    name: "save_document",
    async execute() {
      stickyManager.saveAll();
      saveDocument();
    },
    defaultShortcut: "C-s",
  },
  {
    name: "toggle_global_ghost_mode",
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
    execute() {
      stickyManager.deleteAll();
    },
    defaultShortcut: "C-A-x",
  },
  {
    name: "add_standard_sticky",
    execute() {
      const sticky = newSticky("standard");
      stickyManager.add(sticky);
    },
    defaultShortcut: "C-q",
  },
  {
    name: "add_youtube_sticky",
    execute() {
      const sticky = newSticky("youtube");
      sticky.plugin.youtube.onSubmit = () => {
        stickyManager.add(sticky);
      };
    },
    defaultShortcut: "C-A-y",
  },
  {
    name: "add_spotify_sticky",
    execute() {
      const sticky = newSticky("spotify");
      sticky.plugin.spotify.onSubmit = () => {
        stickyManager.add(sticky);
      };
    },
    defaultShortcut: "C-A-s",
  },
  {
    name: "delete_sticky",
    execute() {
      stickyManager.deleteLatest();
    },
    defaultShortcut: "A-x",
  },
  {
    name: "toggle_auto_arrange",
    execute() {
      stickyManager.arrange();
    },
    defaultShortcut: "A-r",
  },
  {
    name: "toggle_split_view",
    execute() {
      stickyManager.getLatestSticky()?.plugin.standard.toggleSplitView();
    },
    defaultShortcut: "A-v",
  },
  {
    name: "toggle_maximize_sticky",
    execute() {
      stickyManager.getLatestSticky()?.toggleMaximize();
    },
    defaultShortcut: "A-m",
  },
  {
    name: "toggle_sticky_edit_mode",
    execute() {
      stickyManager.getLatestSticky()?.plugin.standard.toggleEditMode();
    },
    defaultShortcut: "A-e",
  },
  {
    name: "toggle_sticky_pin_mode",
    execute() {
      stickyManager.getLatestSticky()?.togglePin();
    },
    defaultShortcut: "A-p",
  },
  {
    name: "toggle_ghost_mode",
    execute() {
      stickyManager.getLatestSticky()?.toggleGhostMode();
    },
    defaultShortcut: "A-g",
  },
  {
    name: "duplicate_sticky",
    execute() {
      stickyManager.duplicateLatest();
    },
    defaultShortcut: "C-d",
  },
];

function getUserPreferredLanguage() {
  // e.g. zh-TW => zh_TW to fit chrome webextension locales.
  // See also: https://developer.chrome.com/docs/extensions/reference/api/i18n
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
  const ds = $<HTMLButtonElement>("#documentStatus")!;
  ds.on("click", () => executeCommand("save_document"));

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

  const addStickyDropdownContainer = $<HTMLButtonElement>("#addStickyDropdownContainer")!;
  const addOtherStickyBtn = $<HTMLButtonElement>(".addOtherStickyBtn")!;
  const otherStickyDropdown = $<HTMLDivElement>(".dropdownButtons")!;
  addOtherStickyBtn.on("click", () => {
    otherStickyDropdown.classList.toggle("none");
  });
  addStickyDropdownContainer.on("click", (e) => {
    const command = e.target?.closest("[data-command]")?.dataset.command; 
    if (command) {
      executeCommand(command);
      otherStickyDropdown.classList.add("none");
    }
  });
  document.body.on("click", (e) => {
    if (
      !e.target.closest(".dropdownButtons") &&
      !e.target.closest(".addOtherStickyBtn")
    ) {
      otherStickyDropdown.classList.add("none");
    }
  });

  const menuItems = [
    {
      name: "add_standard_sticky",
      icon: "lucide-plus",
      execute() {
        executeCommand("add_standard_sticky");
      },
    },
    {
      name: "add_other_sticky_group",
      subItems: [
        {
          name: "add_youtube_sticky",
          icon: "lucide-youtube",
          execute() {
            executeCommand("add_youtube_sticky");
          },
        },
        {
          name: "add_spotify_sticky",
          icon: "mdi:spotify",
          execute() {
            executeCommand("add_spotify_sticky");
          },
        },
      ],
    },
  ];
  $(".stickyContainer")!.dataset.contextMenu = "main";
  registerContextMenu("main", menuItems);

  initStickyEnvironment();
  initContextMenu();
  initSettings();
  initDock();
  initStandardSticky();
  registerSticky(youtubeSticky);
  registerSticky(spotifySticky);
  stickyManager.restoreAllFromHtml();
  initCommandPalette();
}

init();
addPublicApi();
