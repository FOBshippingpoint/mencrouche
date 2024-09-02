import { stickyManager } from "./sticky";
import { $ } from "./utils/dollars";
import {
  initCommandPalette,
  executeCommand,
  registerCommand,
  type Command,
} from "./commands";
import { initSettings } from "./settings";
import { n81i } from "./utils/n81i";
import { switchDocumentStatus } from "./documentStatus";
import { dataset, saveDataset } from "./myDataset";
import { toggleSettingsPage } from "./settings";
import { initYouTubeSticky } from "./stickyPlugins/youtube";
import { addPublicApi } from "./publicApi";
import { initContextMenu, registerContextMenu } from "./contextMenu";
import { initDock, saveDock } from "./dock";
import { initSpotifySticky } from "./stickyPlugins/spotify";
import { initMarkdownSticky } from "./stickyPlugins/markdown";
import { depot, type SyncInfo } from "./utils/depot";

// The `url:` prefix is a custom prefix defined in `.parcelrc`.
// Which aims to get the url of transformed resource, in raw format.
// see https://github.com/parcel-bundler/parcel/issues/1080#issuecomment-557240449
// for more information
// TODO:
// Currently, this approach increase bundle size, should find another way to
// dynamic import the url based on the current parcel command (website or ext).
// @ts-ignore
import en from "url:./_locales/en/messages.json";
// @ts-ignore
import zh_TW from "url:./_locales/zh_TW/messages.json";

const urls = { en, zh_TW };

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
      const syncInfo = dataset.getItem("syncInfo") as SyncInfo;
      saveDataset();
      // saveDocument();
      if (syncInfo) {
        await depot.save(syncInfo);
      }
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
    name: "add_markdown_sticky",
    execute() {
      stickyManager.create({ type: "markdown" });
    },
    defaultShortcut: "C-q",
  },
  {
    name: "add_youtube_sticky",
    execute() {
      stickyManager.create({ type: "youtube" });
    },
    defaultShortcut: "C-A-y",
  },
  {
    name: "add_spotify_sticky",
    execute() {
      stickyManager.create({ type: "spotify" });
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
      stickyManager.getLatestSticky()?.plugin?.toggleSplitView();
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
      stickyManager.getLatestSticky()?.plugin?.toggleEditMode();
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

async function serialize() {
  // Save stickies
  dataset.setItem("stickies", stickyManager.saveAll());
  // Save dock
  saveDock();
  return dataset.toJson();
}

async function uploadJsonToPublicS3(
  bucketName: string,
  key: string,
  json: string,
): Promise<void> {
  const endpoint = `https://${bucketName}.s3.amazonaws.com/${key}`;

  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: json,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`Successfully uploaded JSON to S3: ${bucketName}/${key}`);
  } catch (error) {
    console.error("Error uploading JSON to S3:", error);
    throw error;
  }
}

function reload() {
  // after load dataset from json...
  console.log(JSON.parse(dataset.toJson()));

  initContextMenu();
  initSettings({
    onExport: () => {
      return serialize();
    },
    onImport(json: string) {
      dataset.fromJson(json);
      reload();
    },
  });
  stickyManager.deleteAll();
  stickyManager.restoreAll(dataset.getItem("stickies", []));
}

// from local
const jsonString = localStorage.getItem("mencrouche") ?? "{}";
dataset.fromJson(jsonString);
// from remote
// some fetch shit...

const saveDocumentBtn = $<HTMLDivElement>("#documentStatus button")!;
saveDocumentBtn.on("click", () => executeCommand("save_document"));

// if (window.location.hash) {
//   const params = new URLSearchParams(window.location.hash.substring(1));
//   const url = params.get("url");
//   const id = params.get("id");
//   if (url && id) {
//     await depot.load({ url, id });
//   }
// } else {
//   const syncInfo = dataset.getItem("syncInfo", {}) as SyncInfo;
//   if (syncInfo?.url && syncInfo?.id) {
//     await depot.load(syncInfo);
//   }
// }

n81i.init({
  locale: dataset.getOrSetItem<string>("language", getUserPreferredLanguage()),
  availableLocales: AVAILABLE_LOCALES,
  resourceLoader: async (locale: string) => {
    let url: string;
    if (window.browser) {
      url = `./_locales/${locale}/messages.json`;
    } else {
      url = (urls as any)[locale];
    }
    const response = await fetch(url);
    return await response.json();
  },
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

const addStickyDropdownContainer = $<HTMLButtonElement>(
  "#addStickyDropdownContainer",
)!;
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
    name: "add_markdown_sticky",
    icon: "lucide-plus",
    execute() {
      executeCommand("add_markdown_sticky");
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

// Register custom stickies.
initMarkdownSticky();
initSpotifySticky();
initYouTubeSticky();

initCommandPalette();
initDock();

reload();
dataset.setItem("availableLocales", AVAILABLE_LOCALES);

addPublicApi();
