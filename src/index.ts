import { enableStickyFunctionality, initStickyContainer } from "./createSticky";
import { $, $$ } from "./utils/dollars";
import { initCommandPalette, triggerCommand } from "./commandPalette";
import { initSettings } from "./settings";
import { n81i } from "./utils/n81i";
import { switchDocumentStatus } from "./documentStatus";
import { dataset } from "./dataset";

const stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

function getUserPreferredLanguage() {
  if (navigator.language === "zh-TW") {
    return "zh-Hant";
  } else {
    return navigator.language;
  }
}

async function init() {
  const stickyContainerHtml = localStorage.getItem("doc");
  if (stickyContainerHtml) {
    const fragment = document
      .createRange()
      .createContextualFragment(stickyContainerHtml);
    stickyContainer.replaceChildren(fragment);
  }

  await n81i.init({
    locale: dataset.getItem<string>("language", getUserPreferredLanguage()),
    availableLocales: ["en", "zh-Hant"],
  });
  n81i.translatePage();

  initStickyContainer();
  initCommandPalette();
  initSettings();
  restoreStickies();

  $("#newStickyBtn")!.on("click", () => {
    triggerCommand("new_sticky");
  });

  switchDocumentStatus("saved");
  new MutationObserver(() => {
    switchDocumentStatus("unsaved");
  }).observe(stickyContainer, {
    attributes: true,
    childList: true,
    subtree: true,
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
