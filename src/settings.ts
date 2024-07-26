import { dataset } from "./dataset";
import { $, $$, $$$ } from "./utils/dollars";
import { n81i } from "./utils/n81i";

const backgroundImagePreview = $<HTMLImageElement>("#backgroundPref img")!;
const dropzone = $<HTMLDivElement>(".dropzone")!;
const fileInput = $<HTMLInputElement>(".fileInput")!;
const backgroundImageUrlInput = $<HTMLInputElement>(
  "#backgroundImageUrlInput",
)!;
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
      // For files from `e.clipboardData.files`.
      blob = clipboardItem;
      // Do something with the blob.
      handleBlob(blob);
    } else {
      // For files from `navigator.clipboard.read()`.
      const imageTypes = clipboardItem.types?.filter((type) =>
        type.startsWith("image/"),
      );
      for (const imageType of imageTypes) {
        blob = await clipboardItem.getType(imageType);
        // Do something with the blob.
        handleBlob(blob);
        return;
      }
      const url = await navigator.clipboard.readText();
      try {
        new URL(url);
        backgroundImagePreview.src = url;
        changesManager.add(() => setBackgroundImageByUrl(url));
      } catch (_) {
        alert(n81i.t("image_url_is_not_valid_alert"));
      }
    }
  }
});

function handleBlob(blob: Blob | File) {
  const dataUrl = URL.createObjectURL(blob);
  backgroundImageUrlInput.value = dataUrl;
  backgroundImagePreview.src = dataUrl;
  changesManager.add(() => setBackgroundImageByUrl(dataUrl));
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
  backgroundImagePreview.src = "";
  unsetBackgroundImage();
});

function setBackgroundImageByUrl(url: string) {
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
  n81i.getAllLocales().forEach((locale) => {
    const option = $$$("option");
    option.value = locale;
    option.textContent =
      new Intl.DisplayNames([locale], {
        type: "language",
      }).of(locale) ?? locale;

    langDropdown.append(option);
  });

  langDropdown.on("change", async () => {
    console.log(langDropdown.value);
    await n81i.switchLocale(langDropdown.value);
    n81i.translatePage();
  });
}

export function initSettings() {
  initBackground();
  initLanguage();
  initGhostMode();
  initTheme();
}

function queryPrefersColorScheme() {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function initTheme() {
  const theme = dataset.getOrSetItem("theme", queryPrefersColorScheme());
  $("#lightIcon")!.hidden = theme !== "dark";
  $("#darkIcon")!.hidden = theme === "dark";
  // true = light
  // false = dark
  $<HTMLInputElement>("#themeToggle")!.checked = theme === "light";
  document.firstElementChild?.setAttribute("data-theme", theme as string);
  dataset.on<"light" | "dark">("theme", (_, theme) => {
    $("#lightIcon")!.hidden = theme !== "dark";
    $("#darkIcon")!.hidden = theme === "dark";
    document.firstElementChild?.setAttribute("data-theme", theme as string);
  });
  $<HTMLInputElement>("#themeToggle")!.addEventListener("change", (e) => {
    const value = (e.target as any).checked ? "light" : "dark";
    dataset.setItem("theme", value);
  });
}

function initGhostMode() {
  const ghostIcon = $("#ghostIcon")!;
  const solidIcon = $("#solidIcon")!;
  const ghostToggle = $<HTMLInputElement>("#ghostToggle")!;

  const isGhostMode = dataset.getOrSetItem("isGhostMode", false);
  ghostToggle.checked = isGhostMode;
  change(isGhostMode);

  function change(isGhostMode: boolean | undefined) {
    ghostIcon.hidden = !isGhostMode;
    solidIcon.hidden = !!isGhostMode;
    $$(".sticky").do((s) =>
      isGhostMode ? s.classList.add("ghost") : s.classList.remove("ghost"),
    );
  }

  dataset.on<boolean>("isGhostMode", (_, isGhostMode) => change(isGhostMode));
  ghostToggle.on("change", () =>
    dataset.setItem("isGhostMode", ghostToggle.checked),
  );
}
