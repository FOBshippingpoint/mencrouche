import { stickyManager } from "./sticky";
import { $ } from "./utils/dollars";
import { executeCommand, registerCommand, type Command } from "./commands";
import {
  createShortcutItem,
  registerFileImportExport,
  toggleSettingsPage,
} from "./settings";
import { n81i } from "./utils/n81i";
import { switchDocumentStatus } from "./documentStatus";
import {
  dataset,
  importFromJsonFile,
  loadEncryptedFileFromRemote,
  loadFileFromIndexedDb,
  saveAndEncryptFileToRemote,
  saveFileToIndexedDb,
  serializeToJson,
} from "./myDataset";
import { initYouTubeSticky } from "./stickyPlugins/youtube";
import { addPublicApi } from "./publicApi";
import { registerContextMenu } from "./contextMenu";
import { initSpotifySticky } from "./stickyPlugins/spotify";
import { initMarkdownSticky } from "./stickyPlugins/markdown";

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
import { shortcutManager } from "./shortcutManager";
import { saveWizard } from "./saveWizard";
import "./dock";

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
      switchDocumentStatus("saving");
      await saveWizard.prepareSave();
      await serialize();
      switchDocumentStatus("saved");
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
  saveFileToIndexedDb();
  const enableCloudSync = localStorage.getItem("enableCloudSync");
  if (enableCloudSync === "true") {
    await saveAndEncryptFileToRemote();
  }
}

registerFileImportExport({
  onExport: async () => {
    await saveWizard.prepareSave();
    const json = serializeToJson();
    return json;
  },
  onImport(jsonFile: File) {
    return importFromJsonFile(jsonFile);
  },
});

const saveDocumentBtn = $<HTMLDivElement>("#documentStatus button")!;
saveDocumentBtn.on("click", () => executeCommand("save_document"));

function saveSyncInfoFromUrlFragment() {
  const b64 = window.location.hash.slice(1);
  const json = window.atob(b64);
  const syncInfo = JSON.parse(json);
  for (const key of ["syncUrl", "syncResourceId", "encryptionKey"]) {
    if (!syncInfo[key]) {
      throw Error(
        `Sync information inside URL fragment does not contain '${key}'.`,
      );
    }
    localStorage.setItem(key, syncInfo[key]);
  }
}

async function main() {
  let shouldLoadFromIndexedDb = false;
  if (window.location.hash) {
    try {
      // load from remote
      saveSyncInfoFromUrlFragment();
      await loadEncryptedFileFromRemote();
    } catch (error) {
      console.log(error);
      shouldLoadFromIndexedDb = true;
    }
  } else if (
    localStorage.getItem("enableCloudSync") === "true" &&
    localStorage.getItem("syncUrl")
  ) {
    await loadEncryptedFileFromRemote();
  }
  if (shouldLoadFromIndexedDb) {
    // load from local
    await loadFileFromIndexedDb();
  }

  n81i.init({
    locale: dataset.getOrSetItem<string>("locale", getUserPreferredLanguage()),
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
  // Create shortcut editor DOM
  for (const action of shortcutManager.getAllActions()) {
    createShortcutItem(action);
  }

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
  stickyContainer.dataset.contextMenu = "main";
  registerContextMenu("main", menuItems);

  // Register custom stickies.
  initMarkdownSticky();
  initSpotifySticky();
  initYouTubeSticky();

  dataset.setItem("availableLocales", AVAILABLE_LOCALES);

  saveWizard.finishLoad();
}

addPublicApi();
main();
