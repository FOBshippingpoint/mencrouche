import { registerContextMenu } from "./contextMenu";
import { formToObject } from "./utils/formToObject";
import { getTemplateWidgets } from "./utils/getTemplateWidgets";
import { apocalypse } from "./apocalypse";
import { dataset, addTodoAfterLoad, addTodoBeforeSave } from "./dataWizard";
import { $, $$$ } from "./utils/dollars";
import { getWidgets } from "./sticky/sticky";
import { BooleanMonitorParams } from "tweakpane";
import { clipboardImageItemToDataUrl } from "./utils/toDataUrl";
import { debounce } from "./utils/debounce";
import { bakeBean, soakBean } from "./utils/bean";
import { formNode } from "happy-dom/lib/PropertySymbol.js";

// Drag and drop code was modified from https://codepen.io/gabrielferreira/pen/jMgaLe
// Under MIT License (https://blog.codepen.io/legal/licensing/)
class DragAndDropSorter {
  private container: HTMLElement;
  private dragSrcEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initializeDragAndDrop();
  }

  private initializeDragAndDrop() {
    this.container
      .$$('[draggable="true"]')
      .forEach((el) => this.add(el as HTMLElement));
  }

  add(el: HTMLElement) {
    el.on("dragstart", this.dragStart.bind(this));
    el.on("dragenter", this.dragEnter);
    el.on("dragover", this.dragOver);
    el.on("dragleave", this.dragLeave);
    el.on("drop", this.dragDrop.bind(this));
    el.on("dragend", this.dragEnd.bind(this));
  }

  private dragStart(e: DragEvent) {
    if (e.target instanceof HTMLElement) {
      const target = e.target.closest('[draggable="true"]')! as HTMLElement;
      target.style.opacity = "0.4";
      this.dragSrcEl = target;
    }
  }

  private dragEnter(e: DragEvent) {
    (e.target as HTMLElement).classList.add("dragOver");
  }

  private dragLeave(e: DragEvent) {
    (e.target as HTMLElement).classList.remove("dragOver");
  }

  private dragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    return false;
  }

  private dragDrop(e: DragEvent) {
    e.stopPropagation();
    const target = (e.target as HTMLElement).closest(
      '[draggable="true"]',
    ) as HTMLElement;
    if (this.dragSrcEl && this.dragSrcEl !== target) {
      this.swap(this.dragSrcEl, target);
    }
    this.container
      .$$(".dragOver")
      .forEach((el) => el.classList.remove("dragOver"));
    return false;
  }

  private dragEnd() {
    this.container
      .querySelectorAll('[draggable="true"]')
      .forEach((el) => el.classList.remove("dragOver"));
    if (this.dragSrcEl) {
      this.dragSrcEl.style.opacity = "1";
    }
  }

  private swap(a: Node, b: Node) {
    const aSibling = a.nextSibling === b ? a : a.nextSibling;
    b.parentNode!.insertBefore(a, b);
    a.parentNode!.insertBefore(b, aSibling);
  }
}

interface DockCreationOptions {
  placement: Placement;
  body: Node;
  edgePadding: string;
  grow: boolean;
}

type Placement =
  | "topLeft"
  | "top"
  | "topRight"
  | "right"
  | "bottomRight"
  | "bottom"
  | "bottomLeft"
  | "left";

function createDock({
  body,
  placement = "right",
  edgePadding = "var(--size-2)",
  grow = false,
}: DockCreationOptions) {
  const dock = (getTemplateWidgets("dockWidgets") as HTMLElement)
    .firstElementChild as HTMLDivElement;

  dock.$("slot")!.replaceWith(body);

  dock.style.top = "";
  dock.style.right = "";
  dock.style.bottom = "";
  dock.style.left = "";
  dock.style.transform = "";
  dock.style.width = "";
  dock.style.height = "";

  // Apply growing behavior if specified
  if (grow) {
    const isVertical = ["left", "right"].includes(placement);
    if (isVertical) {
      dock.style.height = `calc(100% - 2 * ${edgePadding})`;
    } else {
      dock.style.width = `calc(100% - 2 * ${edgePadding})`;
    }
  }

  // Apply positioning based on specified placement
  switch (placement) {
    case "top":
      dock.style.top = `${edgePadding}`;
      dock.style.left = "50%";
      dock.style.transform = "translateX(-50%)";
      break;

    case "right":
      dock.style.right = `${edgePadding}`;
      dock.style.top = "50%";
      dock.style.transform = "translateY(-50%)";
      break;

    case "bottom":
      dock.style.bottom = `${edgePadding}`;
      dock.style.left = "50%";
      dock.style.transform = "translateX(-50%)";
      break;

    case "left":
      dock.style.left = `${edgePadding}`;
      dock.style.top = "50%";
      dock.style.transform = "translateY(-50%)";
      break;

    case "topLeft":
      dock.style.left = `${edgePadding}`;
      dock.style.top = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;

    case "topRight":
      dock.style.right = `${edgePadding}`;
      dock.style.top = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;

    case "bottomLeft":
      dock.style.left = `${edgePadding}`;
      dock.style.bottom = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;

    case "bottomRight":
      dock.style.right = `${edgePadding}`;
      dock.style.bottom = `${edgePadding}`;
      if (grow) dock.style.width = `calc(100% - 2 * ${edgePadding})`;
      break;
  }

  $("#dockSlot")!.appendChild(dock);
}

interface BookmarkCreationOptions {
  label?: string;
  icon?: string | "useFirstChar";
  urlLike: string;
  target: "_self" | "_blank";
  backgroundColor?: string;
}

function parseUrl(urlLike: string | null) {
  if (urlLike) {
    try {
      try {
        // Try to construct URL directly first
        return new URL(urlLike);
      } catch {
        // If that fails, try adding https:// and construct again
        return new URL(`https://${urlLike}`);
      }
    } catch (error) {
      return null;
    }
  } else {
    return null;
  }
}

function stringCoalesce(...strList: (string | null | undefined)[]) {
  for (const str of strList) {
    if (str?.length) {
      return str;
    }
  }
}
function getFirstChar(text: string) {
  if (text.length) {
    const firstChar = Array.from(text)[0]!;
    return {
      char: firstChar,
      isSingle: firstChar.length === 1,
    };
  } else {
    throw Error(`text '${text}' should not be empty.`);
  }
}
function generateRandomColor(colorSeed?: number) {
  const lightness = dataset.getItem("theme") === "light" ? 0.8 : 0.6; // High lightness for pastel-like colors
  const chroma = 0.2; // Moderate chroma for soft colors
  const hue =
    (colorSeed !== null && colorSeed !== undefined
      ? colorSeed
      : Math.random()) * 360;
  return `oklch(${lightness} ${chroma} ${hue})`;
}
function cssColorToHexString(color: string) {
  const ctx = $$$("canvas").getContext("2d")!;
  ctx.fillStyle = color;
  return ctx.fillStyle;
}
function getFaviconUrl(domainUrl: string) {
  return `https://api.faviconkit.com/${domainUrl}`;
}

interface BookmarkData {
  id?: string;
  urlLike: string;
  icon?: string | null;
  target: "_self" | "_blank";
  backgroundColor: string;
  label: string;
}

class Bookmark {
  readonly element: HTMLAnchorElement;
  readonly id: string;
  private readonly anchorEl: HTMLAnchorElement;
  private readonly iconBoxEl: HTMLDivElement;
  private readonly imgEl: HTMLImageElement;
  private readonly letterEl: HTMLSpanElement;
  private readonly labelEl: HTMLDivElement;

  private readonly urlLike: string;
  private readonly icon: string | null;
  private readonly url: URL | null;
  private readonly target: "_self" | "_blank";
  private readonly backgroundColor: string;
  private readonly label: string;
  private iconType: "userProvided" | "autoFavicon" | "firstChar" =
    "userProvided";

  constructor(options: BookmarkData) {
    this.id = options.id ?? crypto.randomUUID();
    this.urlLike = options.urlLike;
    this.icon = options.icon ?? null;
    this.target = options.target;
    this.backgroundColor = options.backgroundColor;
    this.label = options.label;
    this.url = parseUrl(this.urlLike);

    // Initialize DOM elements
    this.anchorEl = (
      getTemplateWidgets("bookmarkWidgets") as HTMLElement
    ).firstElementChild!.cloneNode(true) as HTMLAnchorElement;
    this.element = this.anchorEl;
    this.imgEl = this.anchorEl.$("img")!;
    this.letterEl = this.anchorEl.$("span")!;
    this.labelEl = this.anchorEl.$(".label")! as HTMLDivElement;
    this.iconBoxEl = this.anchorEl.$(".iconBox")! as HTMLDivElement;
    this.anchorEl.id = this.id;

    // Initialize the bookmark state
    this.imgEl.on("error", () => this.useNextIconFallback());
    this.initializeState();
  }

  private initializeState(): void {
    // Set URL and href
    if (this.url) {
      this.anchorEl.href = this.url.href;
    }

    // Set target
    this.anchorEl.target = this.target;

    // Set label
    this.labelEl.textContent = this.label.length ? this.label : " ";

    // Set background color
    if (this.backgroundColor === "transparent") {
      this.iconBoxEl.classList.add("noBackground");
    } else {
      this.iconBoxEl.style.backgroundColor = this.backgroundColor;
    }

    // Set icon
    if (this.icon) {
      this.imgEl.src = this.icon;
    } else {
      this.useNextIconFallback();
    }
  }

  private useNextIconFallback(): void {
    if (this.iconType === "userProvided") {
      this.useAutoFaviconAsIcon();
    } else if (this.iconType === "autoFavicon") {
      this.useFirstCharAsIcon();
    }
  }

  private useAutoFaviconAsIcon(): void {
    if (!this.url) return;

    const faviconUrl = getFaviconUrl(this.url.host);
    this.imgEl.src = faviconUrl;
    this.imgEl.classList.remove("none");
    this.letterEl.classList.add("none");
    this.iconType = "autoFavicon";
  }

  private useFirstCharAsIcon(): void {
    const { char, isSingle } = getFirstChar(
      stringCoalesce(
        this.label,
        this.url?.host.replace("www.", ""),
        this.urlLike,
      )!,
    );
    this.letterEl.textContent = char;
    this.letterEl.classList.toggle("singleChar", isSingle);
    this.letterEl.classList.toggle("multiChar", !isSingle);
    this.letterEl.classList.remove("none");
    this.imgEl.classList.add("none");
    this.iconType = "firstChar";
  }

  withChanges(changes: Partial<BookmarkData>): Bookmark {
    return new Bookmark({
      id: this.id,
      urlLike: this.urlLike,
      icon: this.icon,
      target: this.target,
      backgroundColor: this.backgroundColor,
      label: this.label,
      ...changes,
    });
  }

  toData(): BookmarkData {
    return {
      id: this.id,
      urlLike: this.urlLike,
      icon: this.icon,
      target: this.target,
      backgroundColor: this.backgroundColor,
      label: this.label,
    };
  }

  bake(): void {
    soakBean(this.element, { ...this.toData() });
  }
}

function initBookmarkDock() {
  const bookmarkDock = (
    getTemplateWidgets("bookmarkDockWidgets") as HTMLElement
  ).firstElementChild!;
  const addBookmarkBtn = bookmarkDock.$("button")!;
  const bookmarkContainer = bookmarkDock.$("div")!;

  const dialog = $("#bookmarkDialog")! as HTMLDialogElement;
  const form = dialog.$("form")!;
  const bookmarkMap = new Map<string, Bookmark>();

  let previewBookmark = new Bookmark({
    urlLike: "https://example.com",
    label: "Example",
    target: "_self",
    backgroundColor: generateRandomColor(),
  });
  let editingBookmark: Bookmark | null = null;

  function updatePreview(changes: Partial<BookmarkData>): void {
    const newPreview = previewBookmark.withChanges(changes);
    previewBookmark.element.replaceWith(newPreview.element);
    previewBookmark = newPreview;
  }

  function handleAddBookmark() {
    const bookmarkToAdd = previewBookmark;
    apocalypse.write({
      execute() {
        bookmarkMap.set(bookmarkToAdd.id, bookmarkToAdd);
        bookmarkContainer.appendChild(bookmarkToAdd.element);
      },
      undo() {
        bookmarkToAdd.element.remove();
        bookmarkMap.delete(bookmarkToAdd.id);
      },
    });
  }

  function handleEditBookmark(oldBookmark: Bookmark) {
    // Capture both the old and new bookmark instances
    const newBookmark = previewBookmark;

    apocalypse.write({
      execute() {
        bookmarkMap.set(newBookmark.id, newBookmark);
        oldBookmark.element.replaceWith(newBookmark.element);
      },
      undo() {
        newBookmark.element.replaceWith(oldBookmark.element);
        bookmarkMap.set(oldBookmark.id, oldBookmark);
      },
    });
  }

  function handleSubmit(e: Event) {
    e.preventDefault();

    if (editingBookmark) {
      handleEditBookmark(editingBookmark);
    } else {
      handleAddBookmark();
    }

    dialog.close();
    editingBookmark = null;
  }

  function handleDeleteBookmark(bookmark: Bookmark) {
    apocalypse.write({
      execute() {
        bookmark.element.remove();
        bookmarkMap.delete(bookmark.id);
      },
      undo() {
        bookmarkMap.set(bookmark.id, bookmark);
        bookmarkContainer.appendChild(bookmark.element);
      },
    });
  }

  function openDialog(bookmark?: Bookmark) {
    editingBookmark = bookmark ?? null;

    const initialData = bookmark?.toData() ?? {
      urlLike: "",
      label: "",
      target: "_self",
      backgroundColor: cssColorToHexString(generateRandomColor()),
    };

    Object.entries(initialData).forEach(([key, value]) => {
      const input = form.$(`[name="${key}"]`) as HTMLInputElement;
      if (input) {
        input.value = value ?? "";
      }
    });

    previewBookmark = new Bookmark(initialData);
    dialog.$(".gaPreview")!.replaceChildren(previewBookmark.element);

    dialog.showModal();
  }

  function setupFormListeners() {
    const colorInput = form.$('[name="backgroundColor"]')! as HTMLInputElement;
    const iconInput = form.$('[name="icon"]')! as HTMLInputElement;
    const labelInput = form.$('[name="label"]')! as HTMLInputElement;
    const urlLikeInput = form.$('[name="urlLike"]')! as HTMLInputElement;

    urlLikeInput.on("input", () =>
      updatePreview({ urlLike: urlLikeInput.value }),
    );
    labelInput.on("input", () => updatePreview({ label: labelInput.value }));
    colorInput.on("input", () =>
      updatePreview({ backgroundColor: colorInput.value }),
    );

    form.$('[data-i18n="getRandomBookmarkColorBtn"]')!.on("click", () => {
      const backgroundColor = cssColorToHexString(generateRandomColor());
      colorInput.value = backgroundColor;
      updatePreview({ backgroundColor });
    });

    form.$('[data-i18n="removeBookmarkBackgroundBtn"]')!.on("click", () => {
      updatePreview({ backgroundColor: "transparent" });
    });

    iconInput.on("paste", async () => {
      const clipboardItems = await navigator.clipboard.read();
      const iconDataUrl = await clipboardImageItemToDataUrl(clipboardItems);
      if (iconDataUrl) {
        iconInput.value = iconDataUrl;
        updatePreview({ icon: iconDataUrl });
      }
    });

    iconInput.on("input", () => updatePreview({ icon: iconInput.value }));
  }

  addBookmarkBtn.on("click", () => openDialog());
  dialog.$('[data-i18n="cancelSubmitBtn"]')!.on("click", () => dialog.close());
  form.on("submit", handleSubmit);
  setupFormListeners();

  registerContextMenu("bookmark", [
    (anchor: HTMLAnchorElement) => ({
      name: "editBookmark",
      icon: "lucide-pencil",
      execute() {
        const bookmark = bookmarkMap.get(anchor.id);
        if (bookmark) {
          openDialog(bookmark);
        }
      },
    }),
    (anchor: HTMLAnchorElement) => ({
      name: "deleteBookmark",
      icon: "lucide-trash-2",
      execute() {
        const bookmark = bookmarkMap.get(anchor.id);
        if (bookmark) {
          handleDeleteBookmark(bookmark);
        }
      },
    }),
  ]);

  createDock({
    placement: "right",
    body: bookmarkDock,
    edgePadding: "var(--size-2)",
    grow: false,
  });
}

initBookmarkDock();

// TODO: sync with user locale
function initClockDock() {
  const clockDock = (getTemplateWidgets("clockWidgets") as HTMLElement)
    .firstElementChild!;
  const timeEl = clockDock.$(".time")!;
  const dateEl = clockDock.$(".date")!;

  function updateTime() {
    const now = new Date();

    timeEl.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  updateTime();
  setInterval(() => updateTime(), 1000);
  createDock({
    placement: "bottomRight",
    body: clockDock,
    edgePadding: "var(--size-2)",
    grow: false,
  });
}
initClockDock();
