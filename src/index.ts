import { stickyWorkspace } from "./sticky";
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

const urls = { en, zh_TW };

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
    execute() {
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
      stickyWorkspace.deleteAll();
    },
    defaultShortcut: "C-A-x",
  },
  {
    name: "add_markdown_sticky",
    execute() {
      stickyWorkspace.create({ type: "markdown" });
    },
    defaultShortcut: "C-q",
  },
  {
    name: "add_youtube_sticky",
    execute() {
      stickyWorkspace.create({ type: "youtube" });
    },
    defaultShortcut: "C-A-y",
  },
  {
    name: "add_spotify_sticky",
    execute() {
      stickyWorkspace.create({ type: "spotify" });
    },
    defaultShortcut: "C-A-s",
  },
  {
    name: "delete_sticky",
    execute() {
      stickyWorkspace.deleteLatest();
    },
    defaultShortcut: "A-x",
  },
  {
    name: "toggle_auto_arrange",
    execute() {
      stickyWorkspace.arrange();
    },
    defaultShortcut: "A-r",
  },
  {
    name: "toggle_split_view",
    execute() {
      stickyWorkspace.getLatestSticky()?.plugin.toggleSplitView?.();
    },
    defaultShortcut: "A-v",
  },
  {
    name: "toggle_maximize_sticky",
    execute() {
      stickyWorkspace.getLatestSticky()?.toggleMaximize();
    },
    defaultShortcut: "A-m",
  },
  {
    name: "toggle_sticky_edit_mode",
    execute() {
      stickyWorkspace.getLatestSticky()?.plugin.toggleEditMode?.();
    },
    defaultShortcut: "A-e",
  },
  {
    name: "toggle_sticky_pin_mode",
    execute() {
      stickyWorkspace.getLatestSticky()?.togglePin();
    },
    defaultShortcut: "A-p",
  },
  {
    name: "toggle_ghost_mode",
    execute() {
      stickyWorkspace.getLatestSticky()?.toggleGhostMode();
    },
    defaultShortcut: "A-g",
  },
  {
    name: "duplicate_sticky",
    execute() {
      stickyWorkspace.duplicateLatest();
    },
    defaultShortcut: "C-d",
  },
  {
    name: "zoom_in",
    execute() {
    },
    defaultShortcut: "C-+",
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
  $(".mainSection")!.appendChild(stickyWorkspace.workspaceContainer)

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
  stickyWorkspace.workspaceContainer.dataset.contextMenu = "main";
  registerContextMenu("main", menuItems);

  // Register custom stickies.
  initMarkdownSticky();
  initSpotifySticky();
  initYouTubeSticky();

  await finishLoad();
}

addPublicApi();
main();

addTodoAfterLoad(() => {
  dataset.getOrSetItem("availableLocales", AVAILABLE_LOCALES);
});
