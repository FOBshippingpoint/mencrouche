import { marked } from "marked";
import { n81i } from "../utils/n81i";
import { CustomSticky, Sticky, StickyPlugin } from "../sticky";
import { $, $$$, Allowance } from "../utils/dollars";
import { dataset } from "../myDataset";
import { getTemplateWidgets, getWidgets } from "./getWidgets";

declare module "../sticky" {
  interface StickyPluginRegistry {
    bookmark: BookmarkPlugin;
  }
}

interface BookmarkPlugin extends StickyPlugin {
  toggleEditMode: () => void;
}

export function enable(sticky: Sticky): Sticky {
  const widgets = getWidgets(sticky, "bookmarkStickyWidgets");

  const editModeToggleLbl = widgets.$<HTMLLabelElement>(".editModeToggleLbl")!;
  const previews = widgets.$$<HTMLDivElement>(".bookmarkPreview");
  const addBookmarkBtn = widgets.$<HTMLButtonElement>(".addBookmarkBtn")!;
  let currentPreview: Allowance<HTMLDivElement>;

  let dialog = $<HTMLDialogElement>("#bookmarkDialog")!;
  if (!dialog) {
    dialog = getTemplateWidgets("bookmarkStickyWidgets").$<HTMLDialogElement>(
      "dialog",
    )!;
    n81i.translateElement(dialog);
    document.body.appendChild(dialog);
  }
  const form = dialog.$<HTMLFormElement>("form")!;
  const cancelSubmitBtn = dialog.$<HTMLFormElement>(
    '[data-i18n="cancel_submit_bookmark_btn"]',
  )!;

  function enableButtons(preview: Allowance<HTMLDivElement>) {
    preview.$(".editBtn")!.on("click", () => {
      currentPreview = preview;
      form.$<HTMLInputElement>('[name="link"]')!.value =
        preview.$<HTMLAnchorElement>("a")!.href;
      if (preview.$<HTMLAnchorElement>("img")) {
        form.$<HTMLInputElement>('[name="icon"]')!.value =
          preview.$<HTMLImageElement>("img")!.src;
      } else {
        form.$<HTMLInputElement>('[name="icon"]')!.value =
          preview.$<HTMLAnchorElement>("a")!.innerHTML;
      }
      dialog.showModal();
    });
    preview.$(".deleteBtn")!.on("click", () => preview.remove());
  }

  for (const preview of previews) {
    enableButtons(preview);
  }

  cancelSubmitBtn.on("click", () => {
    dialog.close();
  });

  form.on("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const link = formData.get("link");
    const icon = formData.get("icon");
    if (icon) {
      const a = currentPreview.$<HTMLAnchorElement>("a")!;
      a.href = link!.toString();
      let node: HTMLImageElement | DocumentFragment;
      try {
        /* Is dataurl */
        new URL(icon.toString());
        node = $$$("img");
        node.src = icon.toString();
        a.replaceChildren(node);
      } catch {
        /* Is svg */
        node = document.createRange().createContextualFragment(icon.toString());
        if (node.querySelector("svg")) {
          a.replaceChildren(node);
        }
      }
    }
    if (!sticky.contains(currentPreview)) {
      currentPreview.hidden = false;
      enableButtons(currentPreview);
      addBookmarkBtn.insertAdjacentElement("beforebegin", currentPreview);
    }
    dialog.close();
  });

  if (!sticky.$(".bookmarkPreview")) {
    sticky.replaceBody(addBookmarkBtn);
  }
  sticky.addControlWidget(editModeToggleLbl);
  sticky.on("duplicate", (e: any) => {
    enable(e.detail);
  });

  addBookmarkBtn.on("click", () => {
    form.$$<HTMLInputElement>("input").do((el) => (el.value = ""));
    currentPreview = getTemplateWidgets("bookmarkStickyWidgets").$(
      ".bookmarkPreview",
    )!;

    dialog.showModal();
  });

  editModeToggleLbl.on("change", () => {
    editModeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
    addBookmarkBtn.hidden = !addBookmarkBtn.hidden;

    sticky.classList.toggle("editMode");

    if (sticky.classList.contains("editMode")) {
      // preview.
    }
  });

  sticky.plugin.bookmark = {
    toggleEditMode() {
      editModeToggleLbl.click();
    },
  };

  sticky.classList.add("bookmark");

  return sticky;
}

export const bookmarkSticky: CustomSticky = {
  type: "bookmark",
  onNew(sticky: Sticky) {
    enable(sticky);
  },
  onRestore(sticky: Sticky) {
    enable(sticky);
  },
  onDelete(sticky: Sticky) {},
};
