import { enableStickyFunctionality, initStickyContainer } from "./createSticky";
import { $, $$, $$$, Penny } from "./utils/dollars";
import "./commandPalette";
import "./settings";
import { initCommandPalette, triggerCommand } from "./commandPalette";
import { initSettings } from "./settings";
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

  $("#refresh")!.on("click", () => {
    localStorage.clear();
  });

  $("#newStickyBtn")!.on("click", () => {
    triggerCommand("new_sticky");
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

export function handleTextAreaPaste(sticky: Penny<HTMLDivElement>) {
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
