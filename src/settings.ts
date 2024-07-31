import { dataset } from "./dataset";
import { createKikey, Kikey } from "./kikey/kikey";
import { KeyBinding, parseBinding } from "./kikey/parseBinding";
import { $, $$, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

const dropzone = $<HTMLDivElement>(".dropzone")!;
const fileInput = $<HTMLInputElement>(".fileInput")!;
const backgroundImageUrlInput = $<HTMLInputElement>(
  "#backgroundImageUrlInput",
)!;
const shortcutListItemTemplate = $<HTMLTemplateElement>("#shortcutListItem")!;
const uiOpacityInput = $<HTMLInputElement>("#uiOpacityInput")!;
const setToDefaultBtn = $<HTMLButtonElement>("#setToDefaultBtn")!;
const saveBtn = $<HTMLButtonElement>("#saveSettingsBtn")!;
const saveAndCloseBtn = $<HTMLButtonElement>("#saveAndCloseSettingsBtn")!;
const cancelBtn = $<HTMLButtonElement>("#cancelSettingsBtn")!;

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
  if (url.startsWith("blob")) {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.addEventListener("load", (e) => set(e.target.result));
    reader.readAsDataURL(blob);
  } else {
    set(url);
  }
}

function unsetBackgroundImage() {
  document.documentElement.style.setProperty("--page-background", "unset");
  dataset.removeItem("backgroundImageUrl");
}

function openSettingsPage() {
  $("#settings")!.removeAttribute("style");
  $(".stickyContainer")!.style.display = "none";
}

function closeSettingsPage() {
  $("#settings")!.style.display = "none";
  $(".stickyContainer")!.removeAttribute("style");
  changesManager.cancel();
}

export function toggleSettingsPage() {
  if ($(".stickyContainer")!.style.display === "none") {
    closeSettingsPage();
  } else {
    openSettingsPage();
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
    option.value = locale;
    option.textContent =
      new Intl.DisplayNames([locale], {
        type: "language",
      }).of(locale) ?? locale;

    langDropdown.append(option);
  }

  langDropdown.on("change", async () => {
    changesManager.add(async () => {
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

export const shortcutManager = (() => {
  const actions = {
    toggle_command_palette: "C-.",
    toggle_settings: "C-,",
    toggle_dark_mode: "C-S-l",
    open_youtube: "C-o",
    toggle_ghost_mode: "A-g",
    save_document: "C-A-d",
    new_sticky: "C-q",
    toggle_auto_arrange: "A-r",
    toggle_sticky_edit_mode: "A-w",
    remove_sticky: "A-x",
    maximize_sticky: "A-m",
    remove_all_stickies: "C-A-x",
  } as const;
  type ActionName = keyof typeof actions;
  type KikeyInfo = {
    kikey: Kikey;
    callback: () => void;
  };

  const registry: Record<ActionName, KikeyInfo[]> = {} as any;

  return {
    on(
      actionName: ActionName,
      callback: () => void,
      el?: Document | HTMLElement,
    ) {
      const kikey = createKikey(el);
      kikey.on(actions[actionName], callback);

      if (registry[actionName]) {
        registry[actionName].push({ kikey, callback });
      } else {
        registry[actionName] = [{ kikey, callback }];
      }
    },
    once(
      actionName: ActionName,
      callback: () => void,
      el?: Document | HTMLElement | undefined,
    ) {
      const kikey = createKikey(el);
      kikey.once(actions[actionName], callback);

      if (registry[actionName]) {
        registry[actionName].push({ kikey, callback });
      } else {
        registry[actionName] = [{ kikey, callback }];
      }
    },
    update(actionName: ActionName, newSequence: string | KeyBinding[]) {
      for (const { kikey, callback } of registry[actionName] ?? []) {
        kikey.updateSequence(newSequence, callback);
      }
    },
    getKeySequence(actionName: ActionName) {
      return keySequenceToString(
        actions[actionName].split(" ").map(parseBinding),
      );
    },
    getAllActions() {
      return Object.entries(actions).map(([key, value]) => ({
        actionName: key,
        keySequence: keySequenceToString(value.split(" ").map(parseBinding)),
      }));
    },
  };
})();

function initShortcuts() {
  const shortcutList = $("#shortcutList")!;
  // let html = "";
  // for (const { actionName, keySequence } of shortcutManager.getAllActions()) {
  //   html += `
  //   <label for="${actionName}" data-i18n="${actionName}">${n81i.t(actionName)}</label>
  //   <input type="text" id="${actionName}" value="${keySequence}" />
  // `;
  // }
  // shortcutList.innerHTML = html;

  const frag = document.createDocumentFragment();
  for (const { actionName, keySequence } of shortcutManager.getAllActions()) {
    const label = $<HTMLLabelElement>(
      (shortcutListItemTemplate.content.cloneNode(true) as any)
        .firstElementChild,
    )!;
    const input = label.$<HTMLInputElement>("input")!;
    label.htmlFor = actionName;
    label.dataset.i18n = actionName;
    input.id = actionName;
    input.value = keySequence;
    label.insertAdjacentText("afterbegin", n81i.t(actionName));
    frag.appendChild(label);
  }
  shortcutList.appendChild(frag);
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
function keySequenceToString(sequence: KeyBinding[]) {
  return sequence.map((b) => keyBindingToString(b)).join(", ");
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
