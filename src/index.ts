import markdownit from "markdown-it";
import {
  createSticky,
  enableStickyFunctionality,
  initStickyContainer,
} from "./createSticky";
import { $, $$, $$$, Penny } from "./utils/dollars";
import "./commandPalette";
import "./settings";
import { initCommandPalette } from "./commandPalette";
import { initSettings, shortcutManager } from "./settings";
import { n81i } from "./utils/n81i";

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
    bindStickyShortcuts(sticky);
  });
}

const md = markdownit({
  html: true,
});

function bindGlobalShortcuts() {
  shortcutManager.on("new_sticky", () => {
    const sticky = createSticky();
    const stickyBody = sticky.$(".stickyBody")!;
    const textarea = $$$("textarea");
    const preview = $$$("div");
    stickyBody.append(textarea, preview);
    textarea.placeholder = n81i.t("sticky_textarea_start_typing_placeholder");
    preview.hidden = true;
    preview.classList.add("preview");

    bindStickyShortcuts(sticky);

    $(".stickyContainer")?.append(sticky);
    // [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });
    textarea.focus();
  });

  shortcutManager.on("toggle_auto_arrange", () => {
    $(".stickyContainer")?.classList.toggle("autoArrange");
  });
}

function bindStickyShortcuts(sticky: Penny<HTMLDivElement>) {
  const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;

  shortcutManager.on(
    "toggle_sticky_edit_mode",
    () => {
      const preview = sticky.$(".preview")!;
      if (!textarea.disabled) {
        const html = md.render(textarea.value);
        const fragment = document.createRange().createContextualFragment(html);
        preview.replaceChildren(fragment);
        sticky.focus();
      }
      textarea.disabled = !textarea.disabled;
      textarea.hidden = !textarea.hidden;
      preview.hidden = !preview.hidden;
      textarea.focus();
    },
    sticky,
  );

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

  shortcutManager.once(
    "remove_sticky",
    () => sticky.$(".removeBtn")!.click(),
    sticky,
  );
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
