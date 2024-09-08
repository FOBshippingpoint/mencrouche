import { $, type Allowance } from "./utils/dollars";
import { registerContextMenu } from "./contextMenu";
import { formToObject } from "./utils/formToObject";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { dataset } from "./myDataset";
import { apocalypse } from "./apocalypse";
import { saveWizard } from "./saveWizard";

const dialog = $<HTMLDialogElement>("#bookmarkDialog")!;
const appearanceDialog = $<HTMLDialogElement>("#dockAppearanceDialog")!;
const preview = $(getTemplateWidgets("dockBookmark").firstElementChild as any);
dialog.$(".gaPreview")!.appendChild(preview);

const form = dialog.$<HTMLFormElement>("form")!;
const appearanceForm = appearanceDialog.$<HTMLFormElement>("form")!;
const hrefLikeInput = form.$<HTMLInputElement>('[name="hrefLike"]')!;
// TODO: add custom icon
const iconInput = form.$<HTMLInputElement>('[name="icon"]')!;
const labelInput = form.$<HTMLInputElement>('[name="label"]')!;
let prevDockAppearanceAttrs: DockPrefAttrs;

dialog
  .$<HTMLFormElement>('[data-i18n="cancel_submit_btn"]')!
  .on("click", () => dialog.close());
appearanceDialog
  .$<HTMLFormElement>('[data-i18n="cancel_submit_btn"]')!
  .on("click", () => {
    updateDock(prevDockAppearanceAttrs);
    appearanceDialog.close();
  });

let current: Allowance<HTMLAnchorElement> | null = null;

const dock = $<HTMLDivElement>(".dock")!;
const slot = dock.$<HTMLSlotElement>("slot")!;
const addBookmarkBtn = $<HTMLButtonElement>(".addBookmarkBtn")!;

addBookmarkBtn.on("click", () => {
  dialog.$$<HTMLInputElement>("input").do((el) => (el.value = ""));
  updateDockBookmark({ hrefLike: "javascript:;" }, preview);
  current = null;
  dialog.showModal();
});

form.on("input", () => {
  try {
    updateDockBookmark(
      {
        label: labelInput.value,
        hrefLike: hrefLikeInput.value,
      },
      preview,
    );
  } catch (error) {}
});

form.on("submit", (e) => {
  e.preventDefault();

  const attrs = formToObject(form);
  const backupAttrs = {
    hrefLike: current?.href,
    label: current?.$<HTMLParagraphElement>("p")!.textContent ?? "",
  };
  const ctxCurrent = current;
  let newAnchor: Allowance<HTMLAnchorElement>;
  apocalypse.write({
    execute() {
      if (ctxCurrent) {
        updateDockBookmark(attrs, ctxCurrent);
      } else {
        newAnchor = createDockBookmark(attrs);
        slot.appendChild(newAnchor);
      }
    },
    undo() {
      if (ctxCurrent) {
        updateDockBookmark(backupAttrs, ctxCurrent);
      } else {
        newAnchor.remove();
      }
    },
  });
  dialog.close();
});

registerContextMenu("dockBookmark", [
  {
    name: "edit_bookmark_menu_item",
    icon: "lucide-pencil",
    execute(target) {
      current = $<HTMLAnchorElement>(target as HTMLAnchorElement)!;
      hrefLikeInput.value = current.href;
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
    icon: "lucide-trash",
    execute(target) {
      apocalypse.write({
        execute() {
          (target as HTMLAnchorElement).classList.add("none");
        },
        undo() {
          (target as HTMLAnchorElement).classList.remove("none");
        },
      });
    },
  },
  {
    name: "open_bookmark_in_add_tab_menu_item",
    icon: "lucide-external-link",
    execute(target) {
      window.open((target as HTMLAnchorElement).href, "_blank");
    },
  },
  {
    name: "open_bookmark_in_current_tab_menu_item",
    icon: "lucide-link-2",
    execute(target) {
      window.open((target as HTMLAnchorElement).href, "_self");
    },
  },
]);
registerContextMenu("dock", [
  {
    name: "add_bookmark_menu_item",
    icon: "lucide-plus",
    execute() {
      addBookmarkBtn.click();
    },
  },
  {
    name: "edit_dock_appearance_menu_item",
    icon: "lucide-sparkles",
    execute() {
      const { position, alwaysOnTop, showLabel, showAddBtn, iconSize } =
        dock.dataset;
      prevDockAppearanceAttrs = { ...dock.dataset } as any;

      appearanceForm.$<HTMLInputElement>(`[value="${position}"]`)!.checked =
        true;
      appearanceForm.$<HTMLInputElement>('[name="alwaysOnTop"]')!.checked =
        !!alwaysOnTop;
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

interface DockPrefJson {
  bookmarks: DockBookmarkAttrs[];
  pref: DockPrefAttrs;
}

function updateDockBookmark(
  { label, hrefLike, iconSize, target }: DockBookmarkAttrs,
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
  if (hrefLike) {
    anchor.href = toUrl(hrefLike).toString() ?? anchor.href;
  }
  anchor.target = target ?? anchor.target;
  anchor.dataset.contextMenu = "dockBookmark";
  if (hrefLike && hrefLike !== "javascript:;") {
    img.src = getFaviconUrl(hrefLike, iconSize);
  } else if (anchor.href !== "javascript:;") {
    img.src = getFaviconUrl(anchor.href, iconSize);
  }

  return anchor;
}

interface DockBookmarkAttrs {
  label?: string;
  hrefLike?: string;
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

function toUrl(url: string, base = "https://example.com") {
  try {
    return new URL(url);
  } catch {
    return new URL(`//${url}`, base);
  }
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
  dock.dataset.alwaysOnTop = attrs.alwaysOnTop ?? "";
  dock.dataset.showAddBtn = attrs.showAddBtn ?? "";
  dock.dataset.showLabel = attrs.showLabel ?? "";
  dock.dataset.position = attrs.position;
  updateDock(attrs);
});

interface DockPrefAttrs {
  iconSize: number;
  alwaysOnTop?: "on";
  showAddBtn?: "on";
  showLabel?: "on";
  position: "top" | "bottom" | "left" | "right";
}

function updateDock({
  iconSize,
  alwaysOnTop,
  showAddBtn,
  showLabel,
  position,
}: DockPrefAttrs) {
  dock.dataset.position = position;
  addBookmarkBtn.classList.toggle("none", !showAddBtn);
  dock.classList.toggle("alwaysOnTop", !!alwaysOnTop);

  dock.$$<HTMLAnchorElement>(".dockBookmark").do((el) => {
    updateDockBookmark({ iconSize }, el);
    el.$("p")!.hidden = !showLabel;
  });
}

saveWizard.register({
  beforeSave() {
    const dockPref: DockPrefJson = {
      bookmarks: dock.$$<HTMLAnchorElement>(".dockBookmark").map((anchor) => {
        return {
          label: anchor.$("p")!.textContent,
          hrefLike: anchor.href,
          target: anchor.target,
        };
      }),
      pref: { ...dock.dataset },
    };
    dataset.setItem("dock", dockPref);
  },
  afterLoad() {
    const dockPref = dataset.getItem("dock");
    if (dockPref) {
      slot.replaceChildren();
      for (const bookmarkPref of dockPref.bookmarks) {
        const anchor = createDockBookmark(bookmarkPref);
        slot.appendChild(anchor);
      }
      updateDock(dockPref.pref);
    }
  },
});
