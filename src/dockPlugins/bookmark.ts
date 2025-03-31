import { apocalypse } from "../apocalypse";
import { createDock, type DockConfig } from "../dock/dock";
import { DragAndDropSorter } from "../dock/dragAndDropSorter";
import { markDirtyAndSaveDocument } from "../lifesaver";
import { getTemplateWidgets } from "../utils/getTemplateWidgets";
import { debounce } from "../utils/debounce";
import { $, $$$ } from "../utils/dollars";
import { dataset } from "../dataWizard";
import { registerContextMenu } from "../contextMenu";
import { clipboardImageItemToDataUrl } from "../utils/toDataUrl";

interface BookmarkData {
  id?: string;
  urlLike: string;
  icon?: string | null;
  target: "_self" | "_blank";
  backgroundColor: string;
  label: string;
}

interface BookmarkDockConfig extends DockConfig {
  bookmarks: BookmarkData[];
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
}

export function initBookmarkDock() {
  const bookmarkDock = (
    getTemplateWidgets("bookmarkDockWidgets") as HTMLElement
  ).firstElementChild! as HTMLDivElement;
  const addBookmarkBtn = bookmarkDock.$("button")!;
  const bookmarkBox = bookmarkDock.$("div")!;
  new DragAndDropSorter(bookmarkBox, (src, target) => {
    const bookmarks = takeSnapshot();
    const srcIdx = bookmarks.findIndex((b) => b.id === src.id)!;
    const targetIdx = bookmarks.findIndex((b) => b.id === target.id)!;
    let ignore = true; // Ignore first execute because the swap itself is done by DragAndDropSorter.
    apocalypse.write({
      execute() {
        if (ignore) {
          ignore = false;
          return;
        }
        const swapped = [...bookmarks];
        swapped[targetIdx] = bookmarks[srcIdx]!;
        swapped[srcIdx] = bookmarks[targetIdx]!;
        restoreSnapshot(swapped);
      },
      undo() {
        restoreSnapshot(bookmarks);
      },
    });
    markDirtyAndSaveDocument();
  });

  const dialog = $("#bookmarkDialog")! as HTMLDialogElement;
  const form = dialog.$("form")!;
  const bookmarkMap = new Map<string, Bookmark>();

  function takeSnapshot() {
    const bookmarks: BookmarkData[] = [];
    for (const bookmarkEl of bookmarkDock.$$(".bookmark")) {
      const bookmark = bookmarkMap.get(bookmarkEl.id);
      if (bookmark) {
        bookmarks.push(bookmark.toData());
      }
    }
    return bookmarks;
  }
  function restoreSnapshot(bookmarks: BookmarkData[]) {
    bookmarkMap.clear();
    const frag = document.createDocumentFragment();
    for (const bookmark of bookmarks.map((data) => new Bookmark(data))) {
      bookmarkMap.set(bookmark.id, bookmark);
      frag.appendChild(bookmark.element);
    }
    bookmarkBox.replaceChildren(frag);
  }

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
        bookmarkBox.appendChild(bookmarkToAdd.element);
      },
      undo() {
        bookmarkToAdd.element.remove();
        bookmarkMap.delete(bookmarkToAdd.id);
      },
    });
    markDirtyAndSaveDocument();
  }

  function handleEditBookmark(oldBookmark: Bookmark) {
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
    markDirtyAndSaveDocument();
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
        bookmarkBox.appendChild(bookmark.element);
      },
    });
    markDirtyAndSaveDocument();
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

    // Debounce url for favicon fetching.
    const onUrlLikeInputDebounced = debounce(
      () => updatePreview({ urlLike: urlLikeInput.value }),
      { waitMs: 500 },
    );
    urlLikeInput.on("input", () => onUrlLikeInputDebounced());
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
      name: "editBookmarkMenuItem",
      icon: "lucide-pencil",
      execute() {
        const bookmark = bookmarkMap.get(anchor.id);
        if (bookmark) {
          openDialog(bookmark);
        }
      },
    }),
    (anchor: HTMLAnchorElement) => ({
      name: "deleteBookmarkMenuItem",
      icon: "lucide-trash-2",
      execute() {
        const bookmark = bookmarkMap.get(anchor.id);
        if (bookmark) {
          handleDeleteBookmark(bookmark);
        }
      },
    }),
  ]);

  createDock<BookmarkDockConfig>({
    name: "bookmark",
    placement: "right",
    body: bookmarkDock,
    edgePadding: "var(--size-2)",
    grow: false,
    onSave() {
      return { bookmarks: takeSnapshot() };
    },
    onRestore(config) {
      restoreSnapshot(config.bookmarks);
    },
  });
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
    throw Error(`text [ ${text} ] should not be empty.`);
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
