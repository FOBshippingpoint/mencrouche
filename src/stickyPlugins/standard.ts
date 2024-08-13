import { marked } from "marked";
import { CustomSticky, Sticky, StickyPlugin } from "../sticky";
import { dataset } from "../myDataset";
import { getWidgets } from "./getWidgets";

declare module "../sticky" {
  interface StickyPluginRegistry {
    standard: StandardPlugin;
  }
}

interface StandardPlugin extends StickyPlugin {
  toggleSplitView: () => void;
  toggleEditMode: () => void;
}

export function enable(sticky: Sticky, isRestore: boolean): Sticky {
  const widgets = getWidgets(sticky, "standardStickyWidgets");
  const editModeToggleLbl = widgets.$<HTMLLabelElement>(".editModeToggleLbl")!;
  const textarea = widgets.$<HTMLTextAreaElement>("textarea")!;
  const preview = widgets.$<HTMLDivElement>(".preview")!;

  function updatePreview() {
    const html = marked.parse(textarea.value) as string;
    const fragment = document.createRange().createContextualFragment(html);
    preview.replaceChildren(fragment);
  }

  textarea.on("input", () => {
    if (sticky.classList.contains("splitView")) {
      updatePreview();
      sticky.dataset.prevInput = textarea.value;
    }
  });
  textarea.on("input", () => (textarea.dataset.value = textarea.value));
  handleTextAreaPaste(textarea);
  preview.classList.add("preview");

  sticky.replaceBody(textarea, preview);
  sticky.addControlWidget(editModeToggleLbl);
  sticky.on("duplicate", (e: any) => {
    enable(e.detail, true);
  });

  editModeToggleLbl.on("change", () => {
    editModeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
    sticky.classList.toggle("editMode");
    if (!sticky.classList.contains("editMode") /* Change to view mode */) {
      if (sticky.dataset.prevInput !== textarea.value) {
        updatePreview();
      }
      sticky.focus();
    }
    textarea.disabled = !textarea.disabled;
    textarea.hidden = !textarea.hidden;
    sticky.dataset.prevInput = textarea.value;
    preview.hidden = !preview.hidden;
    textarea.focus();
  });

  sticky.plugin.standard = {
    toggleEditMode() {
      editModeToggleLbl.click();
    },
    toggleSplitView() {
      if (!sticky.classList.contains("editMode")) {
        editModeToggleLbl.click();
      }
      updatePreview();
      sticky.classList.toggle("splitView");
      textarea.focus();
    },
  };

  sticky.classList.add("standard");
  if (!isRestore) {
    // Default set to edit mode.
    sticky.classList.add("editMode");
  }

  function toggleDisable(disable: boolean) {
    sticky
      .$$("textarea,input,button")
      .do((el) => ((el as any).disabled = disable));
  }
  sticky.on("classchange", () => {
    if (sticky.classList.contains("pin")) {
      toggleDisable(true);
    } else {
      toggleDisable(false);
    }
  });

  return sticky;
}

function handleTextAreaPaste(textarea: HTMLTextAreaElement) {
  textarea.on("paste", async (e) => {
    let isPasteImage = false;

    function convertBlobUrlAndPaste(blob: Blob) {
      const blobUrl = URL.createObjectURL(blob);
      dataset.getOrSetItem("urls", []);
      dataset.derivedSetItem<string[]>("urls", (blobUrls) => {
        return [...(blobUrls as any), { blobUrl }];
      });
      paste(textarea, createMarkdownImageDescription(blobUrl));
      isPasteImage = true;
    }

    const clipboardItems =
      typeof navigator?.clipboard?.read === "function"
        ? await navigator.clipboard.read()
        : (e as any).clipboardData.files;

    for (const clipboardItem of clipboardItems) {
      let blob;
      if (clipboardItem.type?.startsWith("image/")) {
        blob = clipboardItem;
        convertBlobUrlAndPaste(blob);
      } else {
        const imageTypes = clipboardItem.types?.filter((type: any) =>
          type.startsWith("image/"),
        );
        for (const imageType of imageTypes) {
          blob = await clipboardItem.getType(imageType);
          convertBlobUrlAndPaste(blob);
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

export const standardSticky: CustomSticky = {
  type: "standard",
  onNew(sticky: Sticky) {
    enable(sticky, false);
  },
  onRestore(sticky: Sticky) {
    enable(sticky, true);
  },
  onDelete(sticky: Sticky) {},
};
