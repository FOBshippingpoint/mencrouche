import { serializeDocument } from "./documentStatus";
import { createDialog } from "./generalDialog";
import { createKikey, Kikey } from "./kikey/kikey";
import { KeyBinding, parseBinding } from "./kikey/parseBinding";
import { dataset } from "./myDataset";
import { $, $$, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";

const changesManager = (() => {
  const todos: Function[] = [];
  return {
    isDirty: false,
    addChange(func: () => void) {
      todos.push(func);
      this.isDirty = true;
    },
    onRevert() {},
    save() {
      todos.forEach((f) => f());
      this.isDirty = false;
    },
    cancel() {
      this.onRevert?.();
      todos.length = 0;
      this.isDirty = false;
    },
  };
})();

const settings = $<HTMLElement>("#settings")!;
const settingsBtn = $<HTMLButtonElement>("#settingsBtn")!;
const dropzone = $<HTMLDivElement>(".dropzone")!;
const fileInput = $<HTMLInputElement>(".fileInput")!;
const backgroundImageUrlInput = $<HTMLInputElement>(
  "#backgroundImageUrlInput",
)!;
const shortcutListItemTemplate = $<HTMLTemplateElement>("#shortcutListItem")!;
const uiOpacityInput = $<HTMLInputElement>("#uiOpacityInput")!;
const resetBackgroundImageBtn = $<HTMLButtonElement>(
  "#setBackgroundImageToDefaultBtn",
)!;
const deleteDocumentBtn = $<HTMLButtonElement>("#deleteDocumentBtn")!;
const exportDocumentBtn = $<HTMLButtonElement>("#exportDocumentBtn")!;
const saveBtn = $<HTMLButtonElement>("#saveSettingsBtn")!;
const saveAndCloseBtn = $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!;
const cancelBtn = $<HTMLButtonElement>("#cancelSettingsBtn")!;
const hueWheel = $<HTMLDivElement>("#hueWheel")!;
const resetPaletteHueBtn = $<HTMLDivElement>("#setPaletteHueToDefaultBtn")!;
const dialog = createDialog({
  title: "unsaved_changes",
  message: "unsaved_changes_message",
  buttons: [
    {
      "data-i18n": "cancel_submit_btn",
      onClick() {
        dialog.close();
      },
    },
    {
      "data-i18n": "leave_settings_page",
      onClick() {
        changesManager.cancel();
        closeSettingsPage();
        dialog.close();
      },
      type: "reset",
    },
  ],
});

settingsBtn.on("click", () => {
  if (changesManager.isDirty) {
    dialog.open();
  } else {
    toggleSettingsPage();
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
    a.style.display = "none";
    document.body.append(a);
    // Programmatically click the element.
    a.click();
    // Revoke the blob URL and remove the element.
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 1000);
  }

  const doc = await serializeDocument();
  if (doc) {
    const blob = new Blob([doc], { type: "text/html" });
    saveFile(
      blob,
      `mencrouche_${new Date().toISOString().substring(0, 10)}.html`,
    );
  }
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
        dropzone.style.background = `url(${url}) center center / cover no-repeat`;
        setBackgroundImageByUrl(url);
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
  dropzone.style.background = `url(${url}) center center / cover no-repeat`;
  setBackgroundImageByUrl(url);
  changesManager.isDirty = true;
}

// Handle drag and drop events
dropzone.on("dragover", (event) => {
  event.preventDefault(); // Prevent default browser behavior (open file)
  dropzone.setAttribute("active", "");
});
dropzone.on("dragleave", () => {
  dropzone.removeAttribute("active");
});

dropzone.on("drop", (e) => {
  e.preventDefault();
  dropzone.removeAttribute("active");
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
dropzone.on("click", () => {
  fileInput.click();
});

// Handle file selection from dialog
fileInput.on("change", (e) => {
  const selectedFile = e.target.files[0];
  handleBlob(selectedFile);
});

resetBackgroundImageBtn.on("click", () => {
  dropzone.style.backgroundImage = "unset";
  backgroundImageUrlInput.value = "";
  unsetBackgroundImage();
});

// TODO: somehow laggy? maybe we need throttle?
uiOpacityInput.on("input", () => {
  const uiOpacity = (uiOpacityInput.valueAsNumber / 100).toString();
  document.documentElement.style.setProperty("--ui-opacity", uiOpacity);
  changesManager.isDirty = true;
});

async function setBackgroundImageByUrl(url: string) {
  if (url.startsWith("blob")) {
    url = await toDataUrl(url);
  }
  document.documentElement.style.setProperty(
    "--page-background",
    `url(${url}) no-repeat center center fixed`,
  );
  dataset.setItem("backgroundImageUrl", url);
}

function unsetBackgroundImage() {
  document.documentElement.style.setProperty("--page-background", "unset");
  dataset.removeItem("backgroundImageUrl");
}

function openSettingsPage() {
  settings.classList.remove("none");
  $(".stickyContainer")!.classList.add("none");

  const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
  const paletteHue = dataset.getItem("paletteHue") as string;
  const backgroundImageUrl = dataset.getItem("backgroundImageUrl");
  changesManager.onRevert = () => {
    // Reset ui opacity
    document.documentElement.style.setProperty(
      "--ui-opacity",
      uiOpacity.toString(),
    );
    uiOpacityInput.style.opacity = uiOpacity.toString();
    uiOpacityInput.value = (uiOpacity * 100).toString();

    // Reset palette hue
    if (paletteHue) {
      document.documentElement.style.setProperty("--palette-hue", paletteHue);
    } else {
      document.documentElement.style.removeProperty("--palette-hue");
    }

    // Reset background image
    if (backgroundImageUrl) {
      setBackgroundImageByUrl(backgroundImageUrl as string);
    } else {
      unsetBackgroundImage();
    }
  };
}

function closeSettingsPage() {
  settings.classList.add("none");
  dropzone.style.backgroundImage = "unset";
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

function initBackground() {
  const url = dataset.getItem<string>("backgroundImageUrl");
  if (url) {
    setBackgroundImageByUrl(url);
  } else {
    unsetBackgroundImage();
  }
}

function initLanguage() {
  function toBCP47LangTag(chromeLocale: string) {
    return chromeLocale.replaceAll("_", "-");
  }
  const langDropdown = $<HTMLSelectElement>("#langDropdown")!;
  langDropdown.innerHTML = "";
  for (const locale of n81i.getAllLocales()) {
    const option = $$$("option");
    if (dataset.getItem("language") === locale) {
      option.selected = true;
    }
    option.value = locale;
    const bcp47 = toBCP47LangTag(locale);
    option.textContent =
      new Intl.DisplayNames([bcp47], {
        type: "language",
      }).of(bcp47) ?? locale;

    langDropdown.append(option);
  }

  langDropdown.on("change", async () => {
    // Pre-loading when user select, instead of applying settings.
    n81i.loadLanguage(langDropdown.value);

    changesManager.addChange(async () => {
      dataset.setItem("language", langDropdown.value);
      await n81i.changeLanguage(langDropdown.value);
      n81i.translatePage();
    });
  });
}

export function initSettings() {
  initBackground();
  initLanguage();
  initTheme();
  initShortcuts();
  initUiOpacity();
  initPaletteHue();
}

function queryPrefersColorScheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function initTheme() {
  const theme = dataset.getOrSetItem("theme", queryPrefersColorScheme());
  const themeToggle = $<HTMLInputElement>("#themeToggle")!;
  change(theme);

  // true = light
  // false = dark
  function change(theme: "light" | "dark" | undefined) {
    $("#lightIcon")!.hidden = theme !== "dark";
    $("#darkIcon")!.hidden = theme === "dark";
    themeToggle.checked = theme === "light";
    document.documentElement.setAttribute("data-theme", theme as string);
  }

  dataset.on<"light" | "dark">("theme", (_, theme) => change(theme));
  themeToggle.on("change", (e) => {
    const value = (e.target as any).checked ? "light" : "dark";
    dataset.setItem("theme", value);
  });
}

function initShortcuts() {
  const shortcutManager = initShortcutManager();
  const shortcutList = $("#shortcutList")!;

  const frag = document.createDocumentFragment();
  for (const { actionName, keySequence } of shortcutManager.getAllActions()) {
    const label = $<HTMLLabelElement>(
      (shortcutListItemTemplate.content.cloneNode(true) as any)
        .firstElementChild,
    )!;
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
    frag.appendChild(label);
  }
  shortcutList.appendChild(frag);

  const recordingKikey = createKikey();
  shortcutList.on("click", (e) => {
    if ((e.target as HTMLElement).matches("button")) {
      const btn = e.target as HTMLButtonElement;
      const input = btn.closest("label")!.querySelector("input")!;
      const actionName = input.dataset.actionName!;

      if ((e.target as HTMLElement).matches(".recordBtn")) {
        if (btn.dataset.recording === "false") {
          // Start
          btn.textContent = n81i.t("stop_record_shortcut_btn");
          recordingKikey.startRecord();
          input.value = "...";
        } else {
          // Stop
          btn.textContent = n81i.t("record_shortcut_btn");
          const newSequence = recordingKikey.stopRecord();
          if (newSequence) {
            changesManager.addChange(() => {
              shortcutManager.update(actionName, newSequence);
            });
            input.value = keySequenceToString(newSequence);
          } else {
            input.value = shortcutManager.getKeySequence(actionName);
          }
        }
        btn.dataset.recording =
          btn.dataset.recording === "false" ? "true" : "false";
      } else if ((e.target as HTMLElement).matches(".resetBtn")) {
        changesManager.addChange(() => shortcutManager.restore(actionName));
        input.value = shortcutManager.getDefaultKeySequence(actionName);
      }
    }
  });
}

function keyBindingToString(binding: KeyBinding, isMac = false): string {
  const modifiers = [
    { key: "ctrlKey", default: "Ctrl", mac: "⌘" },
    { key: "shiftKey", default: "Shift", mac: "⇧" },
    { key: "altKey", default: "Alt", mac: "⌥" },
    { key: "metaKey", default: "Meta", mac: "⌃" },
  ];

  const parts = modifiers
    .filter((mod) => binding[mod.key as keyof KeyBinding])
    .map((mod) => (isMac ? mod.mac : mod.default));

  let key = binding.key;
  const arrowKeys: { [key: string]: string } = {
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  key = arrowKeys[key.toLowerCase()] ?? key;

  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join(" + ");
}
function keySequenceToString(sequence: string | KeyBinding[]) {
  let s: KeyBinding[];
  if (typeof sequence === "string") {
    s = sequence.split(" ").map(parseBinding);
  } else {
    s = sequence;
  }

  return s.map((b) => keyBindingToString(b)).join(", ");
}

function initUiOpacity() {
  const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
  document.documentElement.style.setProperty(
    "--ui-opacity",
    uiOpacity.toString(),
  );
  uiOpacityInput.style.opacity = uiOpacity.toString();
  uiOpacityInput.value = (uiOpacity * 100).toString();
}

type Action = {
  default: string;
  custom: string | null;
};

interface ShortcutRegisterOption {
  el?: Document | HTMLElement;
  shouldPreventDefault?: boolean;
}

interface ShortcutManager {
  on(
    actionName: string,
    keySequence: string,
    callback: (e: KeyboardEvent) => void,
    option?: ShortcutRegisterOption,
  ): void;
  once(
    actionName: string,
    keySequence: string,
    callback: (e: KeyboardEvent) => void,
    option?: ShortcutRegisterOption,
  ): void;
  update(actionName: string, newSequence: string | KeyBinding[]): void;
  restore(actionName: string): void;
  getKeySequence(actionName: string): string;
  getDefaultKeySequence(actionName: string): string;
  getAllActions(): Array<{
    actionName: string;
    keySequence: string;
  }>;
  has(actionName: string): boolean;
}

let singleton: ShortcutManager | undefined;
export function initShortcutManager() {
  if (!singleton) {
    const actions = new Map<string, Action>();
    for (const [actionName, value] of Object.entries(actions)) {
      value.custom ||= dataset.getItem<string>(actionName) as string;
    }

    interface KikeyInfo {
      kikey: Kikey;
      callback: (e: KeyboardEvent) => void;
    }

    const registry: Record<string, KikeyInfo[]> = {} as any;
    const globalKikey = createKikey();

    function getCurrent(actionName: string) {
      if (!actions.has(actionName)) {
        throw Error(
          `Action name '${actionName}' not found. Maybe you want to register the action? You can try to call 'on' or 'once'.`,
        );
      }
      return (
        actions.get(actionName)!.custom ?? actions.get(actionName)!.default
      );
    }

    function registerAction(
      actionName: string,
      keySequence: string,
      callback: (e: KeyboardEvent) => void,
      isOnce: boolean = false,
      option: ShortcutRegisterOption = {},
    ) {
      if (actions.has(actionName)) {
        throw Error(
          `Action name '${actionName}' already exists. Please try another name. Or maybe you want to 'update' instead?`,
        );
      }
      actions.set(actionName, { default: keySequence, custom: null });
      const kikey = option.el ? createKikey(option.el) : globalKikey;

      let cb = callback;
      if (option.shouldPreventDefault) {
        cb = (e: KeyboardEvent) => {
          e.preventDefault();
          callback(e);
        };
      }

      if (isOnce) {
        kikey.once(getCurrent(actionName), cb);
      } else {
        kikey.on(getCurrent(actionName), cb);
      }

      if (!registry[actionName]) {
        registry[actionName] = [];
      }
      registry[actionName].push({ kikey, callback: cb });
    }

    singleton = {
      on(
        actionName: string,
        keySequence: string,
        callback: (e: KeyboardEvent) => void,
        option: ShortcutRegisterOption = { shouldPreventDefault: true },
      ) {
        registerAction(actionName, keySequence, callback, false, option);
      },
      once(
        actionName: string,
        keySequence: string,
        callback: (e: KeyboardEvent) => void,
        option: ShortcutRegisterOption = { shouldPreventDefault: true },
      ) {
        registerAction(actionName, keySequence, callback, true, option);
      },
      update(actionName: string, newSequence: string) {
        for (const { kikey, callback } of registry[actionName] ?? []) {
          kikey.updateSequence(newSequence, callback);
          actions.get(actionName)!.custom = newSequence;
          dataset.setItem(actionName, newSequence);
        }
      },
      restore(actionName: string) {
        for (const { kikey, callback } of registry[actionName] ?? []) {
          kikey.updateSequence(actions.get(actionName)!.default, callback);
          actions.get(actionName)!.custom = null;
          dataset.removeItem(actionName);
        }
      },
      getKeySequence(actionName: string) {
        return keySequenceToString(getCurrent(actionName));
      },
      getDefaultKeySequence(actionName: string) {
        return keySequenceToString(actions.get(actionName)!.default);
      },
      getAllActions() {
        return [...actions.entries()].map(([key, value]) => ({
          actionName: key,
          keySequence: keySequenceToString(
            (value.custom ?? value.default).split(" ").map(parseBinding),
          ),
        }));
      },
      has(actionName: string) {
        return actions.has(actionName);
      },
    };
  }

  return singleton;
}

hueWheel.on("pointerdown", () => hueWheel.on("pointermove", adjustPaletteHue));
hueWheel.on("pointerup", () => hueWheel.off("pointermove", adjustPaletteHue));
resetPaletteHueBtn.on("click", () => {
  document.documentElement.style.removeProperty("--palette-hue");
});

function adjustPaletteHue(e: MouseEvent) {
  const rect = hueWheel.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const x = e.clientX - centerX;
  const y = e.clientY - centerY;

  const angle = Math.atan2(y, x) * (180 / Math.PI);
  const paletteHue = Math.round(angle).toString();

  document.documentElement.style.setProperty("--palette-hue", paletteHue);
  dataset.setItem("paletteHue", paletteHue);
  changesManager.isDirty = true;
}

function initPaletteHue() {
  const paletteHue = dataset.getItem("paletteHue") as string;
  if (paletteHue) {
    document.documentElement.style.setProperty("--palette-hue", paletteHue);
  }
}
