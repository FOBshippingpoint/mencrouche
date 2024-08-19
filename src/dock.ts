import { $, Allowance } from "./utils/dollars";
import { getTemplateWidgets } from "./stickyPlugins/getWidgets";
import { registerContextMenu } from "./contextMenu";
import { apocalypse } from "./commands";
import { formToObject } from "./utils/formToObject";

let dock: Allowance<HTMLDivElement>;
let slot: Allowance<HTMLSlotElement>;

const dialog = $<HTMLDialogElement>("#bookmarkDialog")!;
const appearanceDialog = $<HTMLDialogElement>("#bookmarkDockDialog")!;
const preview = $(getTemplateWidgets("dockBookmark").firstElementChild as any);
dialog.$(".gaPreview")!.appendChild(preview);

const form = dialog.$<HTMLFormElement>("form")!;
const appearanceForm = appearanceDialog.$<HTMLFormElement>("form")!;
const hrefInput = form.$<HTMLInputElement>('[name="href"]')!;
// TODO: add custom icon
const iconInput = form.$<HTMLInputElement>('[name="icon"]')!;
const labelInput = form.$<HTMLInputElement>('[name="label"]')!;

dialog
  .$<HTMLFormElement>('[data-i18n="cancel_submit_btn"]')!
  .on("click", () => dialog.close());
appearanceDialog
  .$<HTMLFormElement>('[data-i18n="cancel_submit_btn"]')!
  .on("click", () => {
    const attrs = { ...dock.dataset };
    updateDock(attrs);
    appearanceDialog.close();
  });

let current: Allowance<HTMLAnchorElement> | null = null;
let addBookmarkBtn: Allowance<HTMLButtonElement>;

form.on("input", () => {
  try {
    updateDockBookmark(
      {
        label: labelInput.value,
        href: hrefInput.value,
      },
      preview,
    );
  } catch (error) {}
});

form.on("submit", (e) => {
  e.preventDefault();
  const attrs = {
    ...formToObject(form),
    src: getFaviconUrl(hrefInput.value),
  } as any;
  if (current) {
    updateDockBookmark(attrs, current);
  } else {
    const anchor = createDockBookmark(attrs);
    slot.appendChild(anchor);
    // if (slot.hasChildNodes()) {
    //   addBookmarkBtn.classList.add("none");
    // }
  }
  dialog.close();
});

registerContextMenu("dockBookmark", [
  {
    name: "edit_bookmark_menu_item",
    execute(target) {
      current = $<HTMLAnchorElement>(target)!;
      hrefInput.value = current.href;
      labelInput.value =
        current.$<HTMLParagraphElement>("p")!.textContent ?? "";
      current
        .$$<HTMLOptionElement>("option")
        .do((el) => (el.selected = current?.target === el.value));
      const attrs = formToObject(form);
      updateDockBookmark(attrs, preview);
      dialog.showModal();
    },
  },
  {
    name: "delete_bookmark_menu_item",
    execute(target) {
      apocalypse.write({
        execute() {
          target.classList.add("none");
        },
        undo() {
          target.classList.remove("none");
        },
      });
    },
  },
  {
    name: "open_bookmark_in_new_tab_menu_item",
    execute(target) {
      window.open(target.href, "_blank");
    },
  },
  {
    name: "open_bookmark_in_current_tab_menu_item",
    execute(target) {
      window.open(target.href, "_self");
    },
  },
]);
registerContextMenu("dock", [
  {
    name: "add_bookmark_menu_item",
    execute() {
      addBookmarkBtn.click();
    },
  },
  {
    name: "edit_dock_appearance_menu_item",
    execute() {
      const { position, showLabel, showAddBtn, iconSize } = dock.dataset;
      appearanceForm.$<HTMLInputElement>(`[value="${position}"]`)!.checked =
        true;
      appearanceForm.$<HTMLInputElement>('[name="showLabel"]')!.checked =
        !!showLabel;
      appearanceForm.$<HTMLInputElement>('[name="showAddBtn"]')!.checked =
        !!showAddBtn;
      appearanceForm.$<HTMLInputElement>('[name="iconSize"]')!.value =
        iconSize ?? "48";
      appearanceDialog.showModal();
    },
  },
]);

export function initDock() {
  dock = $<HTMLDivElement>(".dock")!;
  slot = dock.$<HTMLSlotElement>("slot")!;
  addBookmarkBtn = $<HTMLButtonElement>(".addBookmarkBtn")!;

  addBookmarkBtn.on("click", () => {
    dialog.$$<HTMLInputElement>("input").do((el) => (el.value = ""));
    updateDockBookmark({ href: "javascript:;" }, preview);
    current = null;
    dialog.showModal();
  });
}

function updateDockBookmark(
  { label, href, iconSize, target }: DockBookmarkAttrs,
  dockBookmark: Allowance<HTMLAnchorElement>,
) {
  const anchor = dockBookmark;
  const p = dockBookmark.$<HTMLParagraphElement>("p")!;
  const img = dockBookmark.$<HTMLImageElement>("img")!;

  if (dock.dataset.showLabel) {
    p.hidden = !label;
  } else {
    p.hidden = true;
  }
  p.textContent = label ?? p.textContent;
  anchor.href = href ?? anchor.href;
  anchor.target = target ?? anchor.target;
  anchor.dataset.contextMenu = "dockBookmark";
  if (href && href !== "javascript:;") {
    img.src = getFaviconUrl(href, iconSize);
  } else if (anchor.href !== "javascript:;") {
    img.src = getFaviconUrl(anchor.href, iconSize);
  }

  return anchor;
}

interface DockBookmarkAttrs {
  label?: string;
  href?: string;
  iconSize?: number;
  target?: "_self" | "_blank" | "_parent" | "_top";
}

function createDockBookmark(attrs: DockBookmarkAttrs) {
  return updateDockBookmark(
    attrs,
    $<HTMLAnchorElement>(
      getTemplateWidgets("dockBookmark").firstElementChild as any,
    )!,
  );
}

function getFaviconUrl(domainUrl: string, size?: number) {
  return `https://www.google.com/s2/favicons?sz=${size ?? parseInt(dock.dataset.iconSize!)}&domain_url=${domainUrl}`;
}

appearanceForm.on("input", () => {
  const attrs = formToObject(appearanceForm);
  updateDock(attrs);
});
appearanceForm.on("submit", (e) => {
  e.preventDefault();
  appearanceDialog.close();
  const attrs = formToObject(appearanceForm);
  dock.dataset.iconSize = attrs.iconSize;
  dock.dataset.showAddBtn = attrs.showAddBtn ?? "";
  dock.dataset.showLabel = attrs.showLabel ?? "";
  dock.dataset.position = attrs.position;
  updateDock(attrs);
});

interface DockPrefAttrs {
  iconSize: number;
  showAddBtn?: "on";
  showLabel?: "on";
  position: "top" | "bottom" | "left" | "right";
}

function updateDock({
  iconSize,
  showAddBtn,
  showLabel,
  position,
}: DockPrefAttrs) {
  dock.dataset.position = position;
  addBookmarkBtn.classList.toggle("none", !showAddBtn);

  dock.$$<HTMLAnchorElement>(".dockBookmark").do((el) => {
    updateDockBookmark({ iconSize }, el);
    el.$("p")!.hidden = !showLabel;
  });
}

