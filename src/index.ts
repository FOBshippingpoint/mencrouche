import { enableStickyFunctionality, initStickyContainer } from "./createSticky";
import { $, $$ } from "./utils/dollars";
import { initCommandPalette, triggerCommand } from "./commandPalette";
import { initSettings } from "./settings";
import { n81i } from "./utils/n81i";
import { switchDocumentStatus } from "./documentStatus";

const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

async function init() {
  await n81i.init({ locale: "en", availableLocales: ["en", "zh-Hant"] });
  n81i.translatePage();

  const stickyContainerHtml = localStorage.getItem("doc");
  if (stickyContainerHtml) {
    const fragment = document
      .createRange()
      .createContextualFragment(stickyContainerHtml);
    stickyContainer.replaceChildren(fragment);
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

  switchDocumentStatus("saved");
  stickyContainer.on("input", (e) => {
    if (e.target.matches("textarea")) {
      switchDocumentStatus("unsave");
    }
  });
}

function restoreStickies() {
  $$<HTMLDivElement>(".sticky").forEach((sticky) => {
    enableStickyFunctionality(sticky);
    const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
    textarea.value = textarea.dataset.value ?? "";
    textarea.on("input", () => (textarea.dataset.value = textarea.value));
  });
}

init();
