import { dataset } from "./dataset";
import { createKikey, Kikey } from "./kikey/kikey";
import { KeyBinding, parseBinding } from "./kikey/parseBinding";
import { $, $$, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";
import { toDataUrl } from "./utils/toDataUrl";

const settings = $<HTMLElement>("#settings")!;
const settingsBtn = $<HTMLButtonElement>("#settingsBtn")!;
const dropzone = $<HTMLDivElement>(".dropzone")!;
const fileInput = $<HTMLInputElement>(".fileInput")!;
const backgroundImageUrlInput = $<HTMLInputElement>(
  "#backgroundImageUrlInput",
)!;
const shortcutListItemTemplate = $<HTMLTemplateElement>("#shortcutListItem")!;
const uiOpacityInput = $<HTMLInputElement>("#uiOpacityInput")!;
const setToDefaultBtn = $<HTMLButtonElement>("#setToDefaultBtn")!;
const deleteDocumentBtn = $<HTMLButtonElement>("#deleteDocumentBtn")!;
const exportDocumentBtn = $<HTMLButtonElement>("#exportDocumentBtn")!;
const saveBtn = $<HTMLButtonElement>("#saveSettingsBtn")!;
const saveAndCloseBtn = $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!;
const cancelBtn = $<HTMLButtonElement>("#cancelSettingsBtn")!;

settingsBtn.on("click", toggleSettingsPage);

deleteDocumentBtn.on("click", () => {
  if (confirm(n81i.t("confirm_delete_document"))) {
    localStorage.clear();
  }
});
exportDocumentBtn.on("click", () => {
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
        const handle = await showSaveFilePicker({
          suggestedName,
        });
        // Write the blob to the file.
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
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

  const doc = localStorage.getItem("doc");
  if (doc) {
    const blob = new Blob([doc], { type: "text/html" });
    saveFile(
      blob,
      `mencrouche_${new Date().toISOString().substring(0, 10)}.html`,
    );
  }
});

const changesManager = (() => {
  const todos: Function[] = [];

  return {
    add(func: () => void) {
      todos.push(func);
    },
    save() {
      todos.forEach((f) => f());
    },
    cancel() {
      todos.length = 0;
    },
  };
})();

saveBtn.on("click", () => {
  changesManager.save();
});
saveAndCloseBtn.on("click", () => {
  changesManager.save();
  closeSettingsPage();
});
cancelBtn.on("click", () => {
  changesManager.cancel;
  closeSettingsPage();
});

// Copy from web.dev: https://web.dev/patterns/clipboard/paste-images#js
backgroundImageUrlInput.addEventListener("paste", async (e) => {
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
        changesManager.add(() => setBackgroundImageByUrl(url));
      } catch (_) {
        alert(n81i.t("image_url_is_not_valid_alert"));
      }
    }
  }
});

function handleBlob(blob: Blob | File) {
  const url = URL.createObjectURL(blob);
  backgroundImageUrlInput.value = url;
  dropzone.style.background = `url(${url}) center center / cover no-repeat`;
  changesManager.add(() => setBackgroundImageByUrl(url));
}

// Handle drag and drop events
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault(); // Prevent default browser behavior (open file)
  dropzone.setAttribute("active", "");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.removeAttribute("active");
});

dropzone.addEventListener("drop", (e) => {
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
dropzone.addEventListener("click", () => {
  fileInput.click();
});

// Handle file selection from dialog
fileInput.addEventListener("change", (e) => {
  const selectedFile = e.target.files[0];
  handleBlob(selectedFile);
});

setToDefaultBtn.addEventListener("click", () => {
  dropzone.style.backgroundImage = "unset";
  unsetBackgroundImage();
});

uiOpacityInput.on("input", () => {
  const uiOpacity = (uiOpacityInput.valueAsNumber / 100).toString();
  uiOpacityInput.style.opacity = uiOpacity;
  changesManager.add(() => {
    document.documentElement.style.setProperty("--ui-opacity", uiOpacity);
    dataset.setItem("uiOpacity", uiOpacity);
  });
});

async function setBackgroundImageByUrl(url: string) {
  function set(url: string) {
    document.documentElement.style.setProperty(
      "--page-background",
      `url(${url}) no-repeat center center fixed`,
    );
    dataset.setItem("backgroundImageUrl", url);
  }
  let dataUrl = url;
  if (url.startsWith("blob")) {
    dataUrl = await toDataUrl(url);
  }
  set(dataUrl);
}

function unsetBackgroundImage() {
  document.documentElement.style.setProperty("--page-background", "unset");
  dataset.removeItem("backgroundImageUrl");
}

function openSettingsPage() {
  settings.classList.remove("none");
  $(".stickyContainer")!.classList.add("none");
}

function closeSettingsPage() {
  settings.classList.add("none");
  $(".stickyContainer")!.classList.remove("none");
  changesManager.cancel();
}

export function toggleSettingsPage() {
  if (settings.classList.contains("none")) {
    openSettingsPage();
  } else {
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
  const langDropdown = $<HTMLSelectElement>("#langDropdown")!;
  langDropdown.innerHTML = "";
  for (const locale of n81i.getAllLocales()) {
    const option = $$$("option");
    if (dataset.getItem("language") === locale) {
      option.selected = true;
    }
    option.value = locale;
    option.textContent =
      new Intl.DisplayNames([locale], {
        type: "language",
      }).of(locale) ?? locale;

    langDropdown.append(option);
  }

  langDropdown.on("change", async () => {
    // Pre-loading when user select, instead of applying settings.
    n81i.loadLanguage(langDropdown.value);

    changesManager.add(async () => {
      dataset.setItem("language", langDropdown.value);
      await n81i.switchLocale(langDropdown.value);
      n81i.translatePage();
    });
  });
}

export function initSettings() {
  initBackground();
  initLanguage();
  initGhostMode();
  initTheme();
  initShortcuts();
  initOpacity();
}

function queryPrefersColorScheme() {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
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
    document.firstElementChild?.setAttribute("data-theme", theme as string);
  }

  dataset.on<"light" | "dark">("theme", (_, theme) => change(theme));
  themeToggle.addEventListener("change", (e) => {
    const value = (e.target as any).checked ? "light" : "dark";
    dataset.setItem("theme", value);
  });
}

function initGhostMode() {
  const isGhostMode = dataset.getOrSetItem("isGhostMode", false);
  const ghostIcon = $("#ghostIcon")!;
  const solidIcon = $("#solidIcon")!;
  const ghostToggle = $<HTMLInputElement>("#ghostToggle")!;
  change(isGhostMode);

  function change(isGhostMode: boolean | undefined) {
    ghostIcon.hidden = !isGhostMode;
    solidIcon.hidden = !!isGhostMode;
    ghostToggle.checked = !!isGhostMode; // To sync.
    $$(".sticky").do((s) =>
      isGhostMode ? s.classList.add("ghost") : s.classList.remove("ghost"),
    );
  }

  dataset.on<boolean>("isGhostMode", (_, isGhostMode) => change(isGhostMode));
  ghostToggle.on("change", () =>
    dataset.setItem("isGhostMode", ghostToggle.checked),
  );
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
    n81i.translateElement(span);
    input.value = keySequence;
    input.dataset.actionName = actionName;
    recordBtn.textContent = n81i.t("record_shortcut_btn");
    resetBtn.textContent = n81i.t("reset_btn");
    frag.appendChild(label);
  }
  shortcutList.appendChild(frag);

  const recordingKikey = createKikey();
  shortcutList.on("click", (e) => {
    if (e.target.matches("button")) {
      const btn = e.target as HTMLButtonElement;
      const input = btn.closest("label")!.querySelector("input")!;
      const actionName = input.dataset.actionName;

      if (e.target.matches(".recordBtn")) {
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
            changesManager.add(() => {
              shortcutManager.update(actionName, newSequence);
            });
            input.value = keySequenceToString(newSequence);
          } else {
            input.value = shortcutManager.getKeySequence(actionName);
          }
        }
        btn.dataset.recording =
          btn.dataset.recording === "false" ? "true" : "false";
      } else if (e.target.matches(".resetBtn")) {
        changesManager.add(() => shortcutManager.restore(actionName));
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

function initOpacity() {
  const uiOpacity = dataset.getOrSetItem("uiOpacity", 1);
  document.documentElement.style.setProperty(
    "--ui-opacity",
    uiOpacity.toString(),
  );
  uiOpacityInput.style.opacity = uiOpacity.toString();
  uiOpacityInput.value = (uiOpacity * 100).toString();
}

let singleton;
export function initShortcutManager() {
  if (!singleton) {
    type ActionName =
      | "toggle_command_palette"
      | "toggle_settings"
      | "toggle_dark_mode"
      | "toggle_global_ghost_mode"
      | "open_youtube"
      | "save_document"
      | "new_sticky"
      | "duplicate_sticky"
      | "toggle_auto_arrange"
      | "toggle_split_view"
      | "toggle_ghost_mode"
      | "toggle_sticky_edit_mode"
      | "toggle_maximize_sticky"
      | "toggle_sticky_pin_mode"
      | "delete_sticky"
      | "delete_all_stickies";
    type Action = {
      default: string;
      custom: string | null;
    };

    const actions: Record<ActionName, Action> = {
      toggle_command_palette: { default: "C-.", custom: null },
      toggle_settings: { default: "C-,", custom: null },
      toggle_dark_mode: { default: "C-S-l", custom: null },
      toggle_global_ghost_mode: { default: "C-A-g", custom: null },
      open_youtube: { default: "C-o", custom: null },
      save_document: { default: "C-s", custom: null },
      new_sticky: { default: "C-q", custom: null },
      duplicate_sticky: { default: "C-d", custom: null },
      toggle_auto_arrange: { default: "A-r", custom: null },
      toggle_ghost_mode: { default: "A-g", custom: null },
      toggle_split_view: { default: "A-v", custom: null },
      toggle_sticky_edit_mode: { default: "A-e", custom: null },
      toggle_maximize_sticky: { default: "A-m", custom: null },
      toggle_sticky_pin_mode: { default: "A-p", custom: null },
      delete_sticky: { default: "A-x", custom: null },
      delete_all_stickies: { default: "C-A-x", custom: null },
    };
    for (const [actionName, value] of Object.entries(actions)) {
      value.custom ||= dataset.getItem<string>(actionName);
    }

    type KikeyInfo = {
      kikey: Kikey;
      callback: (e: KeyboardEvent) => void;
    };

    const registry: Record<ActionName, KikeyInfo[]> = {} as any;
    const globalKikey = createKikey();

    function getCurrent(actionName: ActionName) {
      return actions[actionName].custom ?? actions[actionName].default;
    }

    function registerAction(
      actionName: ActionName,
      callback: () => void,
      el?: Document | HTMLElement,
      isOnce: boolean = false,
    ) {
      const kikey = el ? createKikey(el) : globalKikey;
      const cb = (e: KeyboardEvent) => {
        e.preventDefault();
        callback();
      };

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
        actionName: ActionName,
        callback: () => void,
        el?: Document | HTMLElement,
      ) {
        registerAction(actionName, callback, el);
      },
      once(
        actionName: ActionName,
        callback: () => void,
        el?: Document | HTMLElement,
      ) {
        registerAction(actionName, callback, el, true);
      },
      update(actionName: ActionName, newSequence: string | KeyBinding[]) {
        for (const { kikey, callback } of registry[actionName] ?? []) {
          kikey.updateSequence(newSequence, callback);
          actions[actionName].custom = newSequence;
          dataset.setItem(actionName, newSequence);
        }
      },
      restore(actionName: ActionName) {
        for (const { kikey, callback } of registry[actionName] ?? []) {
          kikey.updateSequence(actions[actionName].default, callback);
          actions[actionName].custom = null;
          dataset.removeItem(actionName);
        }
      },
      getKeySequence(actionName: ActionName) {
        return keySequenceToString(getCurrent(actionName));
      },
      getDefaultKeySequence(actionName: ActionName) {
        return keySequenceToString(actions[actionName].default);
      },
      getAllActions() {
        return Object.entries(actions).map(([key, value]) => ({
          actionName: key,
          keySequence: keySequenceToString(
            (value.custom ?? value.default).split(" ").map(parseBinding),
          ),
        }));
      },
    };
  }

  return singleton;
}
