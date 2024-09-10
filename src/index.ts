import { stickyManager } from "./sticky";
import { $ } from "./utils/dollars";
import { createShortcutItem, toggleSettingsPage } from "./settings";
import { addPublicApi } from "./publicApi";
import { initMarkdownSticky } from "./stickyPlugins/markdown";
import { initSpotifySticky } from "./stickyPlugins/spotify";
import { initYouTubeSticky } from "./stickyPlugins/youtube";
import { n81i } from "./utils/n81i";
import { registerContextMenu } from "./contextMenu";
import { switchDocumentStatus } from "./documentStatus";
import { shortcutManager } from "./shortcutManager";
import "./dock";
import { generateEncryptionKey } from "./utils/encryption";
import { createDialog } from "./generalDialog";
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

import {
  addTodoAfterLoad,
  dataset,
  IndexedDbSource,
  loadFromSource,
  RemoteSource,
  saveToSources,
  type Source,
} from "./dataWizard";
import { executeCommand, registerCommand, type Command } from "./commands";

const urls = { en, zh_TW };

const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

const AVAILABLE_LOCALES = ["en", "zh_TW"];

function getLocalStorageItem(key: string): string {
  const value = localStorage.getItem(key);
  if (!value) throw new Error(`${key} not found in localStorage.`);
  return value;
}

async function getOrGenerateEncryptionKey(): Promise<string> {
  let key = localStorage.getItem("encryptionKey");
  if (!key) {
    key = await generateEncryptionKey();
    localStorage.setItem("encryptionKey", key);
  }
  return key;
}

function getOrCreateSyncResourceId(): string {
  let syncResourceId = localStorage.getItem("syncResourceId");
  if (!syncResourceId) {
    syncResourceId = crypto.randomUUID();
    localStorage.setItem("syncResourceId", syncResourceId);
  }
  return syncResourceId;
}

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
      const sources: Source[] = [new IndexedDbSource()];
      const isCloudSyncEnabled =
        localStorage.getItem("isCloudSyncEnabled") === "true";
      if (isCloudSyncEnabled && localStorage.getItem("syncUrl")) {
        const syncInfo = {
          syncUrl: getLocalStorageItem("syncUrl"),
          syncResourceId: getOrCreateSyncResourceId(),
          encryptionKey: await getOrGenerateEncryptionKey(),
          syncRemoteAuthKey: getLocalStorageItem("syncRemoteAuthKey"),
        };
        const remoteSource = new RemoteSource(syncInfo);
        sources.push(remoteSource);
      }
      await saveToSources(...sources);
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
      stickyManager.getLatestSticky()?.plugin.toggleSplitView?.();
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
      stickyManager.getLatestSticky()?.plugin.toggleEditMode?.();
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

function parseSyncInfoFromUrlFragment() {
  const b64 = window.location.hash.slice(1);
  try {
    const json = window.atob(b64);
    return JSON.parse(json);
  } catch (error) {
    console.log("Cannot parse from URL fragment, got error: ", error);
  }
}

function grantTrustThirdPartyContentPermission() {
  return new Promise<boolean>((resolve) => {
    const trustThridPartyContentDialog = createDialog({
      title: "trust_thrid_party_content",
      message: "trust_thrid_party_content_message",
      buttons: [
        {
          "data-i18n": "do_not_trust_btn",
          onClick() {
            trustThridPartyContentDialog.close();
            resolve(false);
          },
        },
        {
          "data-i18n": "trust_btn",
          onClick() {
            trustThridPartyContentDialog.close();
            resolve(true);
          },
          type: "reset",
        },
      ],
      onClose() {
        resolve(false);
      },
    });
    trustThridPartyContentDialog.open();
  });
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
  let finishLoad: () => Promise<void>;
  const urlFragSyncInfo = parseSyncInfoFromUrlFragment();
  if (urlFragSyncInfo) {
    const remoteSource = new RemoteSource(urlFragSyncInfo);
    finishLoad = await loadFromSource(remoteSource);
  } else {
    // TODO: dup code
    const isCloudSyncEnabled =
      localStorage.getItem("isCloudSyncEnabled") === "true";
    if (isCloudSyncEnabled && localStorage.getItem("syncUrl")) {
      const syncInfo = {
        syncUrl: getLocalStorageItem("syncUrl"),
        syncResourceId: getOrCreateSyncResourceId(),
        encryptionKey: await getOrGenerateEncryptionKey(),
        syncRemoteAuthKey: getLocalStorageItem("syncRemoteAuthKey"),
      };
      const remoteSource = new RemoteSource(syncInfo);
      finishLoad = await loadFromSource(remoteSource);
    } else {
      finishLoad = await loadFromSource(new IndexedDbSource());
    }
  }

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

  await finishLoad();
}

addPublicApi();
main();

addTodoAfterLoad(() => {
  dataset.setItem("availableLocales", AVAILABLE_LOCALES);
});
