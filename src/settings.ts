import { createDialog } from "./generalDialog";
import { createKikey } from "kikey";
import { dataset } from "./myDataset";
import { depot, type SyncInfo } from "./utils/depot";
import { $, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";
import { keySequenceToString, shortcutManager } from "./shortcutManager";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { executeCommand } from "./commands";
import { saveWizard } from "./saveWizard";

const changesManager = (() => {
  type Todo = () => void;
  const todos = new Map<string, Todo>();

  return {
    isDirty: false,
    setChange(key: string, todo: Todo) {
      todos.set(key, todo);
      this.isDirty = true;
    },
    onRevert() {},
    save() {
      for (const todo of todos.values()) {
        todo();
      }
      this.isDirty = false;
    },
    cancel() {
      this.onRevert?.();
      todos.clear();
      this.isDirty = false;
    },
  };
})();

let onExport: () => Promise<string>;
let onImport: (jsonFile: File) => Promise<void>;

// awk '{ print length($2), $0 }' asdf | /usr/bin/sort -n | cut -d ' ' -f2- > asdfasdf
const saveBtn = $<HTMLButtonElement>("#saveSettingsBtn")!;
const hueWheel = $<HTMLDivElement>("#hueWheel")!;
const settings = $<HTMLElement>("#settings")!;
const cancelBtn = $<HTMLButtonElement>("#cancelSettingsBtn")!;
const settingsBtn = $<HTMLButtonElement>("#settingsBtn")!;
const syncUrlInput = $<HTMLInputElement>('[name="syncUrl"]')!;
const syncRemoteAuthKeyInput = $<HTMLInputElement>(
  '[name="syncRemoteAuthKey"]',
)!;
const shortcutList = $<HTMLDivElement>("#shortcutList")!;
const uiOpacityInput = $<HTMLInputElement>("#uiOpacityInput")!;
const saveAndCloseBtn = $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!;
const shareDataLinkBtn = $<HTMLButtonElement>("#shareDataLinkBtn")!;
const deleteDocumentBtn = $<HTMLButtonElement>("#deleteDocumentBtn")!;
const exportDocumentBtn = $<HTMLButtonElement>("#exportDocumentBtn")!;
const importDocumentBtn = $<HTMLButtonElement>("#importDocumentBtn")!;
const resetPaletteHueBtn = $<HTMLDivElement>("#setPaletteHueToDefaultBtn")!;
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
  title: "unsaved_changes",
  message: "unsaved_changes_message",
  buttons: [
    {
      "data-i18n": "cancel_submit_btn",
      onClick() {
        unsavedChangesAlertDialog.close();
      },
    },
    {
      "data-i18n": "leave_settings_page",
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
  if (changesManager.isDirty) {
    unsavedChangesAlertDialog.open();
  } else {
    toggleSettingsPage();
  }
});

syncUrlInput.value = localStorage.getItem("syncUrl") ?? "";
syncUrlInput.on("input", () => {
  changesManager.setChange("setStorageSyncUrl", () => {
    localStorage.setItem("syncUrl", syncUrlInput.value);
  });
});
syncRemoteAuthKeyInput.value = localStorage.getItem("syncRemoteAuthKey") ?? "";
syncRemoteAuthKeyInput.on("input", () => {
  changesManager.setChange("setStorageSyncRemoteAuthKey", () => {
    localStorage.setItem("syncRemoteAuthKey", syncRemoteAuthKeyInput.value);
  });
});
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
        console.log("Text copied");
      })
      .catch((err) => console.error(err.name, err.message));
  } else {
    alert("Cannot share the data.");
  }
});
deleteDocumentBtn.on("click", () => {
  if (confirm(n81i.t("confirm_delete_document"))) {
    localStorage.clear();
  }
});
exportDocumentBtn.on("click", async () => {
  // Copied from web.dev: https://web.dev/patterns/files/save-a-file#progressive_enhancement
  async function saveFile(blob: Blob, suggestedName: string) {
    // Feature detection. The API needs to be supported
    // and the app not run in an iframe.
    const supportsFileSystemAccess =
      "showSaveFilePicker" in window &&
      (() => {
        try {
          return window.self === window.top;
        } catch {
          return false;
        }
      })();
    // If the File System Access API is supported…
    if (supportsFileSystemAccess) {
      try {
        // Show the file save dialog.
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
        });
        // Write the blob to the file.
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        // Fail silently if the user has simply canceled the dialog.
        if (err.name !== "AbortError") {
          console.error(err.name, err.message);
          return;
        }
      }
    }
    // Fallback if the File System Access API is not supported…
    // Create the blob URL.
    const blobUrl = URL.createObjectURL(blob);
    // Create the `<a download>` element and append it invisibly.
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = suggestedName;
    a.hidden = true;
    document.body.append(a);
    // Programmatically click the element.
    a.click();
    // Revoke the blob URL and remove the element.
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 1000);
  }

  const json = await onExport();
  const blob = new Blob([json], { type: "application/json" });
  saveFile(
    blob,
    `mencrouche_${new Date().toISOString().substring(0, 10)}.json`,
  );
});
importDocumentBtn.on("click", () => {
  importDocumentFileInput.click();
});
importDocumentFileInput.on("change", () => {
  const file = importDocumentFileInput.files?.[0];
  const discardCurrentChangesDialog = createDialog({
    title: "discard_current_changes",
    message: "discard_current_changes_and_load_file_message",
    buttons: [
      {
        "data-i18n": "cancel_submit_btn",
        onClick() {
          discardCurrentChangesDialog.close();
        },
      },
      {
        "data-i18n": "discard_btn",
        onClick() {
          if (file) {
            onImport(file);
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
        changesManager.isDirty = true;
      } catch (_) {
        alert(n81i.t("image_url_is_not_valid_alert"));
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
  changesManager.isDirty = true;
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
  const uiOpacity = (uiOpacityInput.valueAsNumber / 100).toString();
  setCssProperty("--ui-opacity", uiOpacity);
  changesManager.isDirty = true;
});

function openSettingsPage() {
  settings.classList.remove("none");
  $(".stickyContainer")!.classList.add("none");

  const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
  const paletteHue = dataset.getItem("paletteHue") as string;
  const backgroundImageUrl = dataset.getItem("backgroundImageUrl");
  changesManager.onRevert = () => {
    // Reset ui opacity
    setCssProperty("--ui-opacity", uiOpacity.toString());
    uiOpacityInput.style.opacity = uiOpacity.toString();
    uiOpacityInput.value = (uiOpacity * 100).toString();
    // Reset palette hue
    if (paletteHue) {
      setCssProperty("--palette-hue", paletteHue);
    } else {
      setCssProperty("--palette-hue", null);
    }
    // Reset background image
    if (backgroundImageUrl) {
      dataset.setItem("backgroundImageUrl", backgroundImageUrl);
    } else {
      dataset.setItem("backgroundImageUrl", null);
    }
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
const url = dataset.getItem<string>("backgroundImageUrl");
if (url) {
  changeBackgroundImage(url);
}
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
    updateLangDropDown(locales);
  }
});
function updateLangDropDown(locales: string[]) {
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
    // Pre-loading when user select, instead of applying settings.
    n81i.loadLanguage(langDropdown.value);
    changesManager.setChange("setLocale", async () => {
      dataset.setItem("locale", langDropdown.value);
      await n81i.changeLanguage(langDropdown.value);
      n81i.translatePage();
    });
  });
}

// Initialize language
dataset.on<string>("locale", async (_, locale) => {
  if (!locale) return;
  if (n81i.isInitialized()) {
    await n81i.changeLanguage(locale);
    n81i.translatePage();
  }
});

export function registerFileImportExport(handlers: {
  onExport: () => Promise<string>;
  onImport: (jsonFile: File) => Promise<void>;
}) {
  onExport = handlers.onExport;
  onImport = handlers.onImport;
}

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
  recordBtn.dataset.i18n = "record_shortcut_btn";
  resetBtn.dataset.i18n = "reset_btn";

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
        btn.textContent = n81i.t("stop_record_shortcut_btn");
        recordingKikey.startRecord();
        input.value = "...";
      } else {
        // Stop
        btn.textContent = n81i.t("record_shortcut_btn");
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
const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
setCssProperty("--ui-opacity", uiOpacity.toString());
uiOpacityInput.style.opacity = uiOpacity.toString();
uiOpacityInput.value = (uiOpacity * 100).toString();

// Initialize palette hue
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
  changesManager.isDirty = true;
}
const paletteHue = dataset.getItem("paletteHue") as string;
if (paletteHue) {
  setCssProperty("--palette-hue", paletteHue);
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

saveWizard.register({
  async beforeSave() {
    const url = dataset.getItem<string>("backgroundImageUrl");
    if (url?.startsWith("blob")) {
      const dataUrl = await toDataUrl(url);
      dataset.setItem("backgroundImageUrl", dataUrl);
    }
  },
  afterLoad() {},
});
