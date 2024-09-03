import { marked } from "marked";
import {
  type CustomStickyComposer,
  type CustomStickyConfig,
  type Sticky,
  type StickyPlugin,
  registerSticky,
} from "../sticky";
import { registerContextMenu, type MenuItem } from "../contextMenu";
import { blobToDataUrl } from "../utils/toDataUrl";
import { getTemplateWidgets } from "../utils/getTemplateWidgets";

declare module "../sticky" {
  interface StickyPluginRegistryMap {
    markdown: MarkdownPlugin;
  }
}

interface MarkdownPlugin extends StickyPlugin {
  toggleSplitView: () => void;
  toggleEditMode: () => void;
  updatePreview: () => void;
}
interface MarkdownConfig extends CustomStickyConfig {
  prevInput: string;
  blobUrlDataUrlMap: BlobUrlDataUrl[];
}

type BlobUrlDataUrl = [string, string];
const globalBlobUrlDataUrlMap = new Map<Sticky, BlobUrlDataUrl[]>();

function handleTextAreaPaste(
  sticky: Sticky<MarkdownPlugin>,
  textarea: HTMLTextAreaElement,
) {
  textarea.on("paste", async (e) => {
    let isPasteImage = false;

    function convertBlobUrlAndPaste(blob: Blob) {
      const blobUrl = URL.createObjectURL(blob);

      if (!globalBlobUrlDataUrlMap.has(sticky)) {
        globalBlobUrlDataUrlMap.set(sticky, []);
      }
      const map = globalBlobUrlDataUrlMap.get(sticky)!;
      blobToDataUrl(blob).then((dataUrl) => {
        map.push([blobUrl, dataUrl]);
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

const markdownSticky: CustomStickyComposer = {
  type: "markdown",
  onCreate(sticky: Sticky<MarkdownPlugin>) {
    enable(sticky);
    // Default set to edit mode.
    sticky.classList.add("editMode");
    sticky.$<HTMLTextAreaElement>("textarea")!.focus();
  },
  onSave(sticky) {
    const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
    return {
      prevInput: textarea.value,
      blobUrlDataUrlMap: globalBlobUrlDataUrlMap.get(sticky),
    };
  },
  onDelete(sticky: Sticky<MarkdownPlugin>) {
    globalBlobUrlDataUrlMap.delete(sticky);
  },
  onRestore(sticky: Sticky<MarkdownPlugin>, pluginConfig: MarkdownConfig) {
    enable(sticky);

    const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;

    if (pluginConfig) {
      let prevInput = pluginConfig.prevInput;

      if (pluginConfig.blobUrlDataUrlMap) {
        // Recreate blob url based on the old blob url and data url pairs.
        const promises = pluginConfig.blobUrlDataUrlMap.map(
          async ([oldBlobUrl, dataUrl]) => {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const newBlobUrl = URL.createObjectURL(blob);
            prevInput = prevInput.replaceAll(oldBlobUrl, newBlobUrl);

            return [newBlobUrl, dataUrl] as BlobUrlDataUrl;
          },
        );
        Promise.all(promises).then((newBlobUrlDataUrlMap) => {
          globalBlobUrlDataUrlMap.set(sticky, newBlobUrlDataUrlMap);
          textarea.value = prevInput;
          sticky.plugin.updatePreview();
        });
      } else {
        textarea.value = prevInput;
        sticky.plugin.updatePreview();
      }
    }

    // Adjust to correct hidden states
    if (!sticky.classList.contains("editMode")) {
      sticky.$$("textarea,.preview").do((el) => (el.hidden = !el.hidden));
    }
  },
};
const markdownStickyMenuItems: MenuItem[] = [
  (sticky: Sticky<MarkdownPlugin>) => ({
    name:
      "markdown_sticky_edit_mode_" +
      (sticky.classList.contains("editMode") ? "off" : "on"),
    icon: sticky.classList.contains("editMode")
      ? "lucide-sticky-note"
      : "lucide-pencil",
    execute() {
      sticky.plugin.toggleEditMode();
    },
  }),
  (sticky: Sticky<MarkdownPlugin>) => ({
    name:
      "markdown_sticky_split_view_" +
      (sticky.classList.contains("splitView") ? "off" : "on"),
    icon: sticky.classList.contains("splitView")
      ? "lucide-square-equal"
      : "lucide-columns-2",
    execute() {
      sticky.plugin.toggleSplitView();
    },
  }),
  "hr",
];

function enable(sticky: Sticky<MarkdownPlugin>) {
  const widgets = getTemplateWidgets("markdownStickyWidgets");
  const editModeToggleLbl = widgets.$<HTMLLabelElement>(".editModeToggleLbl")!;
  const textarea = widgets.$<HTMLTextAreaElement>("textarea")!;
  const preview = widgets.$<HTMLDivElement>(".preview")!;

  function updatePreview() {
    const html = marked.parse(textarea.value) as string;
    const fragment = document.createRange().createContextualFragment(html);
    preview.replaceChildren(fragment);
  }

  sticky.dataset.contextMenu = "markdown basic";
  sticky.replaceBody(textarea, preview);
  sticky.addControlWidget(editModeToggleLbl);

  handleTextAreaPaste(sticky, textarea);

  textarea.on("input", () => {
    if (sticky.classList.contains("splitView")) {
      updatePreview();
      sticky.dataset.prevInput = textarea.value;
    }
  });
  textarea.on("input", () => (textarea.dataset.value = textarea.value));
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

    // Idk why we need setTimeout to let focus work...
    setTimeout(() => textarea.focus(), 0);
  });

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

  sticky.plugin = {
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
    updatePreview,
  };
}

export function initMarkdownSticky() {
  registerSticky(markdownSticky);
  registerContextMenu("markdown", markdownStickyMenuItems);
}
