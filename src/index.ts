import {
  createSticky,
  enableStickyFunctionality,
  getLatestSticky,
  initStickyContainer,
} from "./createSticky";
import { $, $$, $$$, Penny } from "./utils/dollars";
import "./commandPalette";
import "./settings";
import { initCommandPalette } from "./commandPalette";
import { initSettings, shortcutManager } from "./settings";
import { n81i } from "./utils/n81i";
import { marked } from "marked";

async function init() {
  await n81i.init({ locale: "en", availableLocales: ["en", "zh-Hant"] });
  n81i.translatePage();

  const body = localStorage.getItem("body");
  if (body) {
    const fragment = document.createRange().createContextualFragment(body);
    document.body?.replaceChildren(fragment);
  }
  initStickyContainer();
  initCommandPalette();
  initSettings();
  restoreStickies();

  bindGlobalShortcuts();

  $("#refresh")!.on("click", () => {
    localStorage.clear();
  });
}

function restoreStickies() {
  $$<HTMLDivElement>(".sticky").forEach((sticky) => {
    enableStickyFunctionality(sticky);
    const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
    textarea.value = textarea.dataset.value ?? "";
    textarea.on("input", () => (textarea.dataset.value = textarea.value));
    handleTextAreaPaste(sticky);
  });
}

function bindGlobalShortcuts() {
  shortcutManager.on("new_sticky", () => {
    const sticky = createSticky();
    const stickyBody = sticky.$(".stickyBody")!;
    // TODO: maybe use template element for the consistency?
    const textarea = $$$("textarea");
    const preview = $$$("div");
    stickyBody.append(textarea, preview);
    textarea.placeholder = n81i.t("sticky_textarea_start_typing_placeholder");
    textarea.on("input", () => (textarea.dataset.value = textarea.value));
    preview.hidden = true;
    preview.classList.add("preview");

    handleTextAreaPaste(sticky);
    (sticky as typeof sticky & { prevInput: string }).prevInput = "";

    $(".stickyContainer")?.append(sticky);
    // [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });
    textarea.focus();
  });
  shortcutManager.on("toggle_auto_arrange", () => {
    $(".stickyContainer")?.classList.toggle("autoArrange");
  });
  shortcutManager.on("remove_sticky", () => [
    getLatestSticky()?.$(".removeBtn")!.click(),
  ]);
  shortcutManager.on("maximize_sticky", () =>
    getLatestSticky()?.$(".maximizeBtn")!.click(),
  );
  shortcutManager.on("toggle_sticky_edit_mode", () => {
    const sticky = getLatestSticky() as ReturnType<typeof getLatestSticky> & {
      prevInput: string;
    };
    if (!sticky) {
      return;
    }

    const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
    const preview = sticky.$<HTMLOutputElement>(".preview")!;
    if (!textarea.disabled /* Change to view mode */) {
      if (sticky.prevInput !== textarea.value) {
        const html = marked.parse(textarea.value) as string;
        const fragment = document.createRange().createContextualFragment(html);
        preview.replaceChildren(fragment);
      }
      sticky.focus();
    }
    textarea.disabled = !textarea.disabled;
    textarea.hidden = !textarea.hidden;
    sticky.prevInput = textarea.value;
    preview.hidden = !preview.hidden;
    textarea.focus();
  });
}

function handleTextAreaPaste(sticky: Penny<HTMLDivElement>) {
  const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
  textarea.on("paste", async (e) => {
    let isPasteImage = false;
    const clipboardItems =
      typeof navigator?.clipboard?.read === "function"
        ? await navigator.clipboard.read()
        : (e as any).clipboardData.files;

    for (const clipboardItem of clipboardItems) {
      let blob;
      if (clipboardItem.type?.startsWith("image/")) {
        blob = clipboardItem;
        paste(
          textarea,
          createMarkdownImageDescription(URL.createObjectURL(blob)),
        );
        isPasteImage = true;
      } else {
        const imageTypes = clipboardItem.types?.filter((type) =>
          type.startsWith("image/"),
        );
        for (const imageType of imageTypes) {
          blob = await clipboardItem.getType(imageType);
          paste(
            textarea,
            createMarkdownImageDescription(URL.createObjectURL(blob)),
          );
          isPasteImage = true;
        }
      }
    }
    if (isPasteImage) {
      e.preventDefault();
      textarea.dispatchEvent(new InputEvent("input")); // Programmatically trigger input event to notify content change.
    }
  });
}

function createMarkdownImageDescription(url: string) {
  return `![](${url})`;
}

function paste(textarea: HTMLTextAreaElement, toPaste: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const before = text.substring(0, start);
  const after = text.substring(end);
  textarea.value = before + toPaste + after;
  textarea.selectionStart = textarea.selectionEnd = start + toPaste.length;
}

init();
