import { stickyWorkspace } from "./sticky/sticky";
import { $ } from "./utils/dollars";
import { createShortcutItem, toggleSettingsPage } from "./settings";
import { addPublicApi } from "./publicApi";
import { initMarkdownSticky } from "./stickyPlugins/markdown";
import { initSpotifySticky } from "./stickyPlugins/spotify";
import { initYouTubeSticky } from "./stickyPlugins/youtube";
import { n81i } from "./utils/n81i";
import { registerContextMenu } from "./contextMenu";
import { shortcutManager } from "./shortcutManager";
import { loadDocument, saveDocument } from "./lifesaver";
import { addTodoAfterLoad, dataset, finishLoad } from "./dataWizard";
import "./dock";
// The `url:` prefix is a custom prefix defined in `.parcelrc`.
// Which aims to get the url of transformed resource, in raw format.
// see https://github.com/parcel-bundler/parcel/issues/1080#issuecomment-557240449
// for more information
// TODO:
// Currently, this approach increase bundle size in webextension mode, we should
// find another way to dynamic import the url based on the current parcel
// command (website or ext).
// @ts-ignore
import en from "url:./_locales/en/messages.json";
// @ts-ignore
import zh_TW from "url:./_locales/zh_TW/messages.json";
import { executeCommand, registerCommand, type Command } from "./commands";
import { initNoteSticky } from "./stickyPlugins/note";

const urls = { en, zh_TW };

const AVAILABLE_LOCALES = ["en", "zh_TW"];

const defaultCommands: Command[] = [
  {
    name: "toggleSettings",
    execute() {
      toggleSettingsPage();
    },
    defaultShortcut: "C-,",
  },
  {
    name: "toggleDarkMode",
    execute() {
      dataset.derivedSetItem("theme", (theme) =>
        theme === "light" ? "dark" : "light",
      );
    },
    defaultShortcut: "C-S-l",
  },
  {
    name: "openYoutube",
    execute() {
      window.open("https://youtube.com", "_blank")!.focus();
    },
    defaultShortcut: "C-o",
  },
  {
    name: "saveDocument",
    execute() {
      saveDocument();
    },
    defaultShortcut: "C-s",
  },
  {
    name: "toggleGlobalGhostMode",
    execute() {
      dataset.derivedSetItem<boolean>(
        "isGhostMode",
        (isGhostMode) => !isGhostMode,
      );
    },
    defaultShortcut: "C-A-g",
  },
  {
    name: "deleteAllStickies",
    execute() {
      stickyWorkspace.deleteAll();
    },
    defaultShortcut: "C-A-x",
  },
  {
    name: "addMarkdownSticky",
    execute() {
      stickyWorkspace.create({ type: "markdown" });
    },
    defaultShortcut: "C-A-m",
  },
  {
    name: "addYoutubeSticky",
    execute() {
      stickyWorkspace.create({ type: "youtube" });
    },
    defaultShortcut: "C-A-y",
  },
  {
    name: "addSpotifySticky",
    execute() {
      stickyWorkspace.create({ type: "spotify" });
    },
    defaultShortcut: "C-A-s",
  },
  {
    name: "addNoteSticky",
    execute() {
      stickyWorkspace.create({ type: "note" });
    },
    defaultShortcut: "C-q",
  },
  {
    name: "deleteSticky",
    execute() {
      stickyWorkspace.deleteLatest();
    },
    defaultShortcut: "A-x",
  },
  {
    name: "toggleAutoArrange",
    execute() {
      stickyWorkspace.arrange();
    },
    defaultShortcut: "A-r",
  },
  {
    name: "toggleSplitView",
    execute() {
      stickyWorkspace.getLatestSticky()?.plugin.toggleSplitView?.();
    },
    defaultShortcut: "A-v",
  },
  {
    name: "toggleMaximizeSticky",
    execute() {
      stickyWorkspace.getLatestSticky()?.toggleMaximize();
    },
    defaultShortcut: "A-m",
  },
  {
    name: "toggleStickyEditMode",
    execute() {
      stickyWorkspace.getLatestSticky()?.plugin.toggleEditMode?.();
    },
    defaultShortcut: "A-e",
  },
  {
    name: "toggleStickyPinMode",
    execute() {
      stickyWorkspace.getLatestSticky()?.togglePin();
    },
    defaultShortcut: "A-p",
  },
  {
    name: "toggleGhostMode",
    execute() {
      stickyWorkspace.getLatestSticky()?.toggleGhostMode();
    },
    defaultShortcut: "A-g",
  },
  {
    name: "duplicateSticky",
    execute() {
      stickyWorkspace.duplicateLatest();
    },
    defaultShortcut: "C-d",
  },
  {
    name: "zoomIn",
    execute() {
      stickyWorkspace.zoomable.zoomIn();
    },
    defaultShortcut: "C-=", // C + plus key
  },
  {
    name: "zoomOut",
    execute() {
      stickyWorkspace.zoomable.zoomOut();
    },
    defaultShortcut: "C-dash", // `-` is `dash` in kikey lib
  },
  {
    name: "zoomReset",
    execute() {
      stickyWorkspace.zoomable.zoomReset();
    },
    defaultShortcut: "C-0",
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

async function main() {
  try {
    await loadDocument();
  } catch (error) {
    console.log(error);
  }
  $("#workspaceSlot")!.appendChild(stickyWorkspace.workspaceContainer);

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
      name: "addNoteSticky",
      icon: "lucide-plus",
      execute() {
        executeCommand("addNoteSticky");
      },
    },
    {
      name: "addOtherStickyGroup",
      subItems: [
        {
          name: "addYoutubeSticky",
          icon: "lucide-youtube",
          execute() {
            executeCommand("addYoutubeSticky");
          },
        },
        {
          name: "addSpotifySticky",
          icon: "mdi:spotify",
          execute() {
            executeCommand("addSpotifySticky");
          },
        },
        {
          name: "addMarkdownSticky",
          icon: "lucide-sticky-note",
          execute() {
            executeCommand("addMarkdownSticky");
          },
        },
      ],
    },
  ];
  stickyWorkspace.workspaceContainer.dataset.contextMenu = "main";
  registerContextMenu("main", menuItems);

  // Register custom stickies.
  initMarkdownSticky();
  initSpotifySticky();
  initYouTubeSticky();
  initNoteSticky();

  await finishLoad();
}

addPublicApi();
main();

addTodoAfterLoad(() => {
  dataset.getOrSetItem("availableLocales", AVAILABLE_LOCALES);
});
