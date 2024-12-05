import { createDialog } from "./generalDialog";
import { createKikey } from "kikey";
import { $, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";
import { keySequenceToString, shortcutManager } from "./shortcutManager";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { executeCommand } from "./commands";
import {
  addTodoAfterLoad,
  addTodoBeforeSave,
  dataset,
  finishLoad,
  JsonFileSource,
  saveToSources,
} from "./dataWizard";
import { openDB } from "idb";
import { markDirtyAndSaveDocument } from "./lifesaver";

const changesManager = (() => {
  type Todo = () => void;
  const todos = new Map<string, Todo>();
  let isDirty = false;

  return {
    isDirty() {
      return isDirty;
    },
    markDirty() {
      isDirty = true;
    },
    setChange(key: string, todo: Todo) {
      todos.set(key, todo);
      isDirty = true;
    },
    onRevert() {},
    save() {
      for (const todo of todos.values()) {
        todo();
      }
      markDirtyAndSaveDocument();
      isDirty = false;
    },
    cancel() {
      this.onRevert?.();
      todos.clear();
      isDirty = false;
    },
  };
})();

// awk '{ print length($2), $0 }' asdf | /usr/bin/sort -n | cut -d ' ' -f2- > asdfasdf
const saveBtn = $<HTMLButtonElement>("#saveSettingsBtn")!;
const hueWheel = $<HTMLDivElement>("#hueWheel")!;
const settings = $<HTMLElement>("#settings")!;
const cancelBtn = $<HTMLButtonElement>("#cancelSettingsBtn")!;
const settingsBtn = $<HTMLButtonElement>("#settingsBtn")!;
const syncUrlInput = $<HTMLInputElement>('[name="syncUrl"]')!;
const isCloudSyncEnabledCheckbox = $<HTMLInputElement>(
  '[name="isCloudSyncEnabled"]',
)!;
// const syncRemoteAuthKeyInput = $<HTMLInputElement>( '[name="syncRemoteAuthKey"]',)!;
const shortcutList = $<HTMLDivElement>("#shortcutList")!;
const uiOpacityInput = $<HTMLInputElement>("#uiOpacityInput")!;
const saveAndCloseBtn = $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!;
const shareDataLinkBtn = $<HTMLButtonElement>("#shareDataLinkBtn")!;
const deleteDocumentBtn = $<HTMLButtonElement>("#deleteDocumentBtn")!;
const exportDocumentBtn = $<HTMLButtonElement>("#exportDocumentBtn")!;
const importDocumentBtn = $<HTMLButtonElement>("#importDocumentBtn")!;
const resetPaletteHueBtn = $<HTMLDivElement>("#setPaletteHueToDefaultBtn")!;
const customJsTextArea = $<HTMLTextAreaElement>("#customJsTextArea")!;
const customJsSlot = $<HTMLSlotElement>("#customJsSlot")!;
const customCssTextArea = $<HTMLTextAreaElement>("#customCssTextArea")!;
const backgroundImageDropzone = $<HTMLDivElement>(".dropzone")!;
const backgroundImageUrlInput = $<HTMLInputElement>(
  "#backgroundImageUrlInput",
)!;
const importDocumentFileInput = $<HTMLInputElement>(
  "#importDocumentFileInput",
)!;
const resetBackgroundImageBtn = $<HTMLButtonElement>(
  "#setBackgroundImageToDefaultBtn",
)!;
const backgroundImageFileInput =
  backgroundImageDropzone.$<HTMLInputElement>("input")!;

const unsavedChangesAlertDialog = createDialog({
  title: "unsavedChanges",
  message: "unsavedChangesMessage",
  buttons: [
    {
      "data-i18n": "cancelSubmitBtn",
      onClick() {
        unsavedChangesAlertDialog.close();
      },
    },
    {
      "data-i18n": "leaveSettingsPage",
      onClick() {
        changesManager.cancel();
        closeSettingsPage();
        unsavedChangesAlertDialog.close();
      },
      type: "reset",
    },
  ],
});

settingsBtn.on("click", () => {
  if (changesManager.isDirty()) {
    unsavedChangesAlertDialog.open();
  } else {
    toggleSettingsPage();
  }
});

if (process.env.CLOUD_SYNC_URL && localStorage.getItem("syncUrl") === null) {
  localStorage.setItem("syncUrl", process.env.CLOUD_SYNC_URL);
}
if (localStorage.getItem("isCloudSyncEnabled") === null) {
  localStorage.setItem("isCloudSyncEnabled", "on");
}
isCloudSyncEnabledCheckbox.checked =
  localStorage.getItem("isCloudSyncEnabled") === "on";
isCloudSyncEnabledCheckbox.on("input", () => {
  changesManager.setChange("setIsCloudSyncEnabled", () => {
    localStorage.setItem(
      "isCloudSyncEnabled",
      isCloudSyncEnabledCheckbox.value,
    );
  });
});
syncUrlInput.value = localStorage.getItem("syncUrl") ?? "";
syncUrlInput.on("input", () => {
  changesManager.setChange("setStorageSyncUrl", () => {
    localStorage.setItem("syncUrl", syncUrlInput.value);
  });
});
// syncRemoteAuthKeyInput.value = localStorage.getItem("syncRemoteAuthKey") ?? "";
// syncRemoteAuthKeyInput.on("input", () => {
//   changesManager.setChange("setStorageSyncRemoteAuthKey", () => {
//     localStorage.setItem("syncRemoteAuthKey", syncRemoteAuthKeyInput.value);
//   });
// });
shareDataLinkBtn.on("click", () => {
  const syncUrl = localStorage.getItem("syncUrl");
  const syncResourceId = localStorage.getItem("syncResourceId");
  const encryptionKey = localStorage.getItem("encryptionKey");
  if (syncUrl && syncResourceId && encryptionKey) {
    const url = new URL(window.location.origin);
    url.hash = window.btoa(
      JSON.stringify({
        syncUrl,
        syncResourceId,
        encryptionKey,
      }),
    );
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        shareDataLinkBtn.textContent = n81i.t("copied");
        shareDataLinkBtn.on(
          "pointerleave",
          () => n81i.translateElement(shareDataLinkBtn),
          { once: true },
        );
      })
      .catch((err) => console.error(err.name, err.message));
  } else {
    alert("Cannot share the data.");
  }
});
deleteDocumentBtn.on("click", async () => {
  if (confirm(n81i.t("confirmDeleteDocument"))) {
    localStorage.clear();
    try {
      // TODO: should use constant to avoid duplicates string.
      // PS same in `/src/dataWizard.ts`
      const db = await openDB("mencrouche");
      db.deleteObjectStore("data");
    } catch (error) {
      console.log("An error occurred when deleting IndexedDB", error);
      alert("Failed to delete data");
    }
    alert("Deleted! Please refresh the page.");
  }
});

// TODO: IDK, this api looks really bad.
// maybe we should separate the logic of save and load.
let fileReadyForImport: File;
const jsonFileSource = new JsonFileSource(
  (savedMcJsonFile) => {
    saveFile(savedMcJsonFile, savedMcJsonFile.name);
  },
  () => {
    return new Promise<File>((resolve) => {
      resolve(fileReadyForImport);
    });
  },
);
// Copied from web.dev: https://web.dev/patterns/files/save-a-file#progressive_enhancement
async function saveFile(blob: Blob, suggestedName: string) {
  const supportsFileSystemAccess =
    "showSaveFilePicker" in window &&
    (() => {
      try {
        return window.self === window.top;
      } catch {
        return false;
      }
    })();
  if (supportsFileSystemAccess) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err.name, err.message);
        return;
      }
    }
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = suggestedName;
  a.hidden = true;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    a.remove();
  }, 1000);
}
exportDocumentBtn.on("click", () => saveToSources(jsonFileSource));
importDocumentBtn.on("click", () => {
  importDocumentFileInput.click();
});
importDocumentFileInput.on("change", () => {
  const file = importDocumentFileInput.files?.[0];
  const discardCurrentChangesDialog = createDialog({
    title: "discardCurrentChanges",
    message: "discardCurrentChangesAndLoadFileMessage",
    buttons: [
      {
        "data-i18n": "cancelSubmitBtn",
        onClick() {
          discardCurrentChangesDialog.close();
        },
      },
      {
        "data-i18n": "discardBtn",
        async onClick() {
          if (file) {
            fileReadyForImport = file;
            await jsonFileSource.load();
            await finishLoad();
            closeSettingsPage();
          }
          discardCurrentChangesDialog.close();
        },
        type: "reset",
      },
    ],
  });
  discardCurrentChangesDialog.open();
});

saveBtn.on("click", () => {
  changesManager.save();
});
saveAndCloseBtn.on("click", () => {
  changesManager.save();
  closeSettingsPage();
});
cancelBtn.on("click", () => {
  changesManager.cancel();
  closeSettingsPage();
});

// Copy from web.dev: https://web.dev/patterns/clipboard/paste-images#js
backgroundImageUrlInput.on("paste", async (e) => {
  const clipboardItems = await navigator.clipboard.read();

  for (const clipboardItem of clipboardItems) {
    let blob;
    if (clipboardItem.type?.startsWith("image/")) {
      blob = clipboardItem;
      handleBlob(blob);
    } else {
      const imageTypes = clipboardItem.types?.filter((type) =>
        type.startsWith("image/"),
      );
      for (const imageType of imageTypes) {
        blob = await clipboardItem.getType(imageType);
        handleBlob(blob);
        return;
      }
      try {
        const url = await (await clipboardItem.getType("text/plain")).text();
        new URL(url);
        backgroundImageDropzone.style.background = `url(${url}) center center / cover no-repeat`;
        dataset.setItem("backgroundImageUrl", url);
        changesManager.markDirty();
      } catch (_) {
        alert(n81i.t("imageUrlIsNotValidAlert"));
      }
    }
  }
});

function handleBlob(blob: Blob | File) {
  const url = URL.createObjectURL(blob);
  if (!url.startsWith("blob")) {
    backgroundImageUrlInput.value = url;
  }
  backgroundImageDropzone.style.background = `url(${url}) center center / cover no-repeat`;
  dataset.setItem("backgroundImageUrl", url);
  changesManager.markDirty();
}

// Handle drag and drop events
backgroundImageDropzone.on("dragover", (event) => {
  event.preventDefault(); // Prevent default browser behavior (open file)
  backgroundImageDropzone.setAttribute("active", "");
});
backgroundImageDropzone.on("dragleave", () => {
  backgroundImageDropzone.removeAttribute("active");
});

backgroundImageDropzone.on("drop", (e) => {
  e.preventDefault();
  backgroundImageDropzone.removeAttribute("active");
  if (e.dataTransfer?.items) {
    // Use DataTransferItemList interface to access the file(s)
    [...e.dataTransfer?.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === "file") {
        const file = item.getAsFile()!;
        handleBlob(file);
      }
    });
  } else {
    // Use DataTransfer interface to access the file(s)
    [...e.dataTransfer?.files].forEach((file) => {
      handleBlob(file);
    });
  }
});

// Handle click on dropzone to open file selection dialog
backgroundImageDropzone.on("click", () => {
  backgroundImageFileInput.click();
});

// Handle file selection from dialog
backgroundImageFileInput.on("change", () => {
  const selectedFile = backgroundImageFileInput.files?.[0];
  if (selectedFile) {
    handleBlob(selectedFile);
  }
});

resetBackgroundImageBtn.on("click", () => {
  backgroundImageDropzone.style.backgroundImage = "unset";
  backgroundImageUrlInput.value = "";
  dataset.setItem("backgroundImageUrl", null);
});

// TODO: somehow laggy? maybe we need throttle?
uiOpacityInput.on("input", () => {
  const uiOpacity = uiOpacityInput.valueAsNumber / 100;
  dataset.setItem("uiOpacity", uiOpacity);
  changesManager.markDirty();
});

function openSettingsPage() {
  settings.classList.remove("none");
  $(".stickyContainer")!.classList.add("none");

  // Backup attributes.
  const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
  const paletteHue = dataset.getItem("paletteHue") as string;
  const backgroundImageUrl = dataset.getItem("backgroundImageUrl");
  const locale = dataset.getItem("locale") as string;
  changesManager.onRevert = () => {
    dataset.setItem("uiOpacity", uiOpacity);
    dataset.setItem("paletteHue", paletteHue);
    dataset.setItem("backgroundImageUrl", backgroundImageUrl);
    dataset.setItem("locale", locale);
    langDropdown.value = locale;
  };
}

function closeSettingsPage() {
  settings.classList.add("none");
  backgroundImageDropzone.style.backgroundImage = "unset";
  backgroundImageUrlInput.value = "";
  $(".stickyContainer")!.classList.remove("none");
}

export function toggleSettingsPage() {
  if (settings.classList.contains("none")) {
    openSettingsPage();
  } else {
    changesManager.cancel();
    closeSettingsPage();
  }
}

// Initialize background image.
dataset.on<string>("backgroundImageUrl", (_, url) => {
  changeBackgroundImage(url);
});
async function changeBackgroundImage(url: string | undefined) {
  if (url?.startsWith("blob")) {
    url = await toDataUrl(url);
  }
  setCssProperty(
    "--page-background",
    url ? `url(${url}) no-repeat center center fixed` : "unset",
  );
}

// Initialize language dropdown.
function toBCP47LangTag(chromeLocale: string) {
  return chromeLocale.replaceAll("_", "-");
}
const langDropdown = $<HTMLSelectElement>("#langDropdown")!;
dataset.on<string[]>("availableLocales", (_, locales) => {
  if (locales) {
    langDropdown.replaceChildren();
    for (const locale of locales) {
      const option = $$$("option");
      if (dataset.getItem("locale") === locale) {
        option.selected = true;
      }
      option.value = locale;
      const bcp47 = toBCP47LangTag(locale);
      const translatedLocaleName = new Intl.DisplayNames([bcp47], {
        type: "language",
      }).of(bcp47);
      if (translatedLocaleName) {
        option.textContent = `${translatedLocaleName} - ${locale}`;
      } else {
        option.textContent = locale;
      }
      langDropdown.append(option);
    }
    langDropdown.on("change", async () => {
      n81i.loadLanguage(langDropdown.value);
      dataset.setItem("locale", langDropdown.value);
      changesManager.markDirty();
      await n81i.changeLanguage(langDropdown.value);
      n81i.translatePage();
    });
  }
});

// Initialize language
dataset.on<string>("locale", async (_, locale) => {
  if (!locale) return;
  if (n81i.isInitialized()) {
    await n81i.changeLanguage(locale);
    n81i.translatePage();
  }
});

function queryPrefersColorScheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Initialize theme.
const theme = dataset.getOrSetItem("theme", queryPrefersColorScheme());
const themeToggle = $<HTMLInputElement>("#themeToggle")!;
changeTheme(theme);
// true = light
// false = dark
function changeTheme(theme: "light" | "dark" | undefined) {
  $("#lightIcon")!.hidden = theme !== "dark";
  $("#darkIcon")!.hidden = theme === "dark";
  themeToggle.checked = theme === "light";
  document.documentElement.setAttribute("data-theme", theme as string);
}
dataset.on<"light" | "dark">("theme", (_, theme) => changeTheme(theme));
themeToggle.on("change", (e) => {
  const value = (e.target as any).checked ? "light" : "dark";
  dataset.setItem("theme", value);
});

export function createShortcutItem({
  actionName,
  keySequence,
}: {
  actionName: string;
  keySequence: string;
}) {
  const widgets = getTemplateWidgets("shortcutListItem");
  const label = widgets.$<HTMLLabelElement>("label")!;
  const input = label.$<HTMLInputElement>("input")!;
  const span = label.$<HTMLInputElement>("span")!;
  const recordBtn = label.$<HTMLInputElement>(".recordBtn")!;
  const resetBtn = label.$<HTMLInputElement>(".resetBtn")!;
  label.htmlFor = actionName;
  span.dataset.i18n = actionName;
  input.value = keySequence;
  input.dataset.actionName = actionName;
  recordBtn.dataset.i18n = "recordShortcutBtn";
  resetBtn.dataset.i18n = "resetBtn";

  n81i.translateElement(label);
  shortcutList.appendChild(label);
}

const recordingKikey = createKikey();
shortcutList.on("click", (e) => {
  if ((e.target as HTMLElement).matches("button")) {
    const btn = e.target as HTMLButtonElement;
    const input = btn.closest("label")!.querySelector("input")!;
    const actionName = input.dataset.actionName!;

    if (btn.classList.contains("recordBtn")) {
      if (!btn.classList.contains("recording")) {
        // Start
        btn.textContent = n81i.t("stopRecordShortcutBtn");
        recordingKikey.startRecord();
        input.value = "...";
      } else {
        // Stop
        btn.textContent = n81i.t("recordShortcutBtn");
        const newSequence = recordingKikey.stopRecord();
        if (newSequence) {
          changesManager.setChange(actionName, () => {
            shortcutManager.update(actionName, newSequence);
          });
          input.value = keySequenceToString(newSequence);
        } else {
          input.value = shortcutManager.getKeySequence(actionName);
        }
      }
      btn.classList.toggle("recording");
    } else if (btn.classList.contains("resetBtn")) {
      changesManager.setChange(actionName, () =>
        shortcutManager.restore(actionName),
      );
      input.value = shortcutManager.getDefaultKeySequence(actionName);
    }
  }
});

// initialize ui opacity
dataset.on<number>("uiOpacity", (_, uiOpacity) => {
  if (uiOpacity !== undefined) {
    setCssProperty("--ui-opacity", uiOpacity.toString());
    uiOpacityInput.style.opacity = uiOpacity.toString();
    uiOpacityInput.value = (uiOpacity * 100).toString();
  }
});

// Initialize palette hue
dataset.on<string>("paletteHue", (_, paletteHue) => {
  if (paletteHue) {
    setCssProperty("--palette-hue", paletteHue);
  }
});
hueWheel.on("pointerdown", () => hueWheel.on("pointermove", adjustPaletteHue));
hueWheel.on("pointerup", () => hueWheel.off("pointermove", adjustPaletteHue));
resetPaletteHueBtn.on("click", () => {
  setCssProperty("--palette-hue", null);
});
function adjustPaletteHue(e: MouseEvent) {
  const rect = hueWheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const x = e.clientX - centerX;
  const y = e.clientY - centerY;

  const angle = Math.atan2(y, x) * (180 / Math.PI);
  const paletteHue = Math.round(angle).toString();

  setCssProperty("--palette-hue", paletteHue);
  dataset.setItem("paletteHue", paletteHue);
  changesManager.markDirty();
}

// Reflecting to global ghost mode configuration.
dataset.on("isGhostMode", (_, isGhostMode) => {
  $(".stickyContainer")!.classList.toggle("ghost", !!isGhostMode);
});

// Initialize add sticky dropdown buttons at navbar.
const addStickyDropdownContainer = $<HTMLButtonElement>(
  "#addStickyDropdownContainer",
)!;
const addOtherStickyBtn = $<HTMLButtonElement>(".addOtherStickyBtn")!;
const otherStickyDropdown = $<HTMLDivElement>(".dropdownButtons")!;
addOtherStickyBtn.on("click", () => {
  otherStickyDropdown.classList.toggle("none");
});
addStickyDropdownContainer.on("click", (e) => {
  const command = (
    (e.target as Element)?.closest("[data-command]") as HTMLElement
  ).dataset.command;
  if (command) {
    executeCommand(command);
    otherStickyDropdown.classList.add("none");
  }
});
document.body.on("click", (e) => {
  if (
    !(e.target as Element).closest(".dropdownButtons") &&
    !(e.target as Element).closest(".addOtherStickyBtn")
  ) {
    otherStickyDropdown.classList.add("none");
  }
});

function setCssProperty(name: string, value: string | null) {
  if (value === null) {
    document.documentElement.style.removeProperty(name);
  } else {
    document.documentElement.style.setProperty(name, value);
  }
}

const customCssStyleSheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(customCssStyleSheet);
dataset.on<string>("customCss", (_, css) => {
  customCssStyleSheet.replaceSync(css);
});
customCssTextArea.on("input", () => {
  changesManager.setChange("customCss", () => {
    dataset.setItem("customCss", customCssTextArea.value);
  });
});

let isFirstJsLoad = true;
dataset.on<string>("customJs", (_, js) => {
  if (isFirstJsLoad) {
    isFirstJsLoad = false;
    const frag = document
      .createRange()
      .createContextualFragment(`<script>${js}</script>`);
    customJsSlot.replaceChildren(frag);
  }
});
customJsTextArea.on("input", () => {
  changesManager.setChange("customJs", () => {
    const customJs = customJsTextArea.value;
    changesManager.setChange("setCustomJs", () => {
      const confirmReloadDialog = createDialog({
        title: "reloadNeeded",
        message: "reloadNeededMessage",
        buttons: [
          {
            "data-i18n": "okBtn",
            onClick() {
              changesManager.cancel();
              isFirstJsLoad = false;
              dataset.setItem("customJs", customJs);
              confirmReloadDialog.close();
            },
          },
        ],
        onClose() {
          confirmReloadDialog.close();
        },
      });
      confirmReloadDialog.open();
    });
  });
});

addTodoBeforeSave(async () => {
  const url = dataset.getItem<string>("backgroundImageUrl");
  if (url?.startsWith("blob")) {
    const dataUrl = await toDataUrl(url);
    dataset.setItem("backgroundImageUrl", dataUrl);
  }
});
addTodoAfterLoad(() => {
  customCssTextArea.value = dataset.getItem("customCss") ?? "";
  customJsTextArea.value = dataset.getItem("customJs") ?? "";
});
