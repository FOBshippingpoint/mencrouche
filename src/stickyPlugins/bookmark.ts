import { marked } from "marked";
import { n81i } from "../utils/n81i";
import { CustomSticky, Sticky, StickyPlugin } from "../sticky";
import { $, $$, $$$, Allowance } from "../utils/dollars";
import { dataset } from "../myDataset";
import { getTemplateWidgets, getWidgets } from "./getWidgets";
import { apocalypse } from "../commands";

async function getFaviconUrl(websiteUrl: string) {
  const response = await fetch(websiteUrl);
  const doc = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  for (const node of doc.querySelectorAll('link[rel*="icon"]')) {
    return node.getAttribute("href");
  }
}

// Copied from https://web.dev/articles/drag-and-drop
let dragSrcEl: Allowance<HTMLDivElement> | null = null;

function swap(a: Node, b: Node) {
  const aSibling = a.nextSibling === b ? a : a.nextSibling;
  b.parentNode!.insertBefore(a, b);
  a.parentNode!.insertBefore(b, aSibling);
}

function handleDragStart(el: Allowance<HTMLDivElement>, e: DragEvent) {
  el.style.opacity = "0.4";
  dragSrcEl = el;
  e.dataTransfer!.effectAllowed = "move";
}

function handleDragOver(el: Allowance<HTMLDivElement>, e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = "move";
  el.classList.add("dragOver");
}

function handleDragLeave(el: Allowance<HTMLDivElement>) {
  el.classList.remove("dragOver");
}

function handleDrop(el: Allowance<HTMLDivElement>, e: DragEvent) {
  e.stopPropagation();
  swap(dragSrcEl as Node, el);
}

function handleDragEnd(el: Allowance<HTMLDivElement>) {
  el.style.opacity = "1";
  [...document.getElementsByClassName("dragOver")].forEach((item) =>
    item.classList.remove("dragOver"),
  );
}

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
  const body = widgets.$<HTMLDivElement>(".body")!;
  const previewContainer = body.$<HTMLSlotElement>("slot")!;
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

  function preventDrag(func: (e: DragEvent) => void) {
    return (e: DragEvent) => {
      if (
        sticky.classList.contains("editMode") &&
        !sticky.classList.contains("ghost")
      ) {
        func(e);
      }
    };
  }
  for (const preview of previews) {
    enableButtons(preview);
    preview.on(
      "dragstart",
      preventDrag((e) => handleDragStart(preview, e)),
    );
    preview.on(
      "dragover",
      preventDrag((e) => handleDragOver(preview, e)),
    );
    preview.on(
      "dragleave",
      preventDrag(() => handleDragLeave(preview)),
    );
    preview.on(
      "drop",
      preventDrag((e) => handleDrop(preview, e)),
    );
    preview.on(
      "dragend",
      preventDrag(() => handleDragEnd(preview)),
    );
  }

  cancelSubmitBtn.on("click", () => {
    dialog.close();
  });

  if (!sticky.classList.contains("deleted")) {
    form.on("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const link = formData.get("link");
      const icon = formData.get("icon");

      const target = currentPreview;
      const backup = currentPreview.cloneNode(true);
      apocalypse.write({
        async execute() {
          const a = target.$<HTMLAnchorElement>("a")!;
          a.href = link!.toString();
          let node: HTMLImageElement | DocumentFragment;
          if (icon) {
            try {
              /* Is dataurl */
              new URL(icon.toString());
              node = $$$("img");
              node.src = icon.toString();
              a.replaceChildren(node);
            } catch {
              /* Is svg */
              node = document
                .createRange()
                .createContextualFragment(icon.toString());
              if (node.querySelector("svg")) {
                a.replaceChildren(node);
              }
            }
          } else {
            // const faviconUrl = await getFaviconUrl(link!.toString());
            // const keyword = new URL(a.href).hostname.split(".").at(-2);
            // const response = await fetch(
            //   `https://api.iconify.design/search?prefix=cib&limit=1&query=${keyword}`,
            // );
            // const json = await response.json();
            // console.log(json)
            // const iconName = json.icons[0];
            // const faviconUrl = `https://api.iconify.design/cib/${iconName.split(":").at(-1)}.svg`;
            const origin = new URL(a.href).origin;
            const faviconUrl = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${origin}&size=24`;
            node = $$$("img");
            node.src = faviconUrl;
            a.replaceChildren(node);
          }
          if (!previewContainer.contains(target)) {
            enableButtons(target);
            previewContainer.appendChild(target);
          }
        },
        undo() {
          target.replaceWith(backup);
        },
      });

      dialog.close();
    });
  }

  sticky.replaceBody(body);
  sticky.addControlWidget(editModeToggleLbl);
  sticky.on("duplicate", (e: any) => {
    enable(e.detail);
  });
  sticky.on("classchange", () => {
    if (
      (sticky.classList.contains("ghost") ||
        sticky.classList.contains("pin")) &&
      sticky.classList.contains("editMode")
    ) {
      editModeToggleLbl.click();
    }
  });

  addBookmarkBtn.on("click", () => {
    form.$$<HTMLInputElement>("input").do((el) => (el.value = ""));
    currentPreview = getTemplateWidgets("bookmarkStickyWidgets").$(
      ".bookmarkPreview",
    )!;
    console.log("change currentPreview", currentPreview);

    dialog.showModal();
  });

  editModeToggleLbl.on("change", () => {
    editModeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
    sticky.classList.toggle("editMode");
    previews.do((el) => (el.draggable = !el.draggable));
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
