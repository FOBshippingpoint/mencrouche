import { registerDock } from "../dock/dock";
import type { Dock, DockPlugin, DockPluginModel } from "@mencrouche/types";
import { DragAndDropSorter } from "../dock/dragAndDropSorter";
import { markDirtyAndSaveDocument } from "../lifesaver";
import { getTemplate } from "../utils/getTemplate";
import { debounce } from "../utils/debounce";
import { $, $$$, apocalypse } from "../utils/tools";
import { dataset } from "../dataWizard";
import { registerContextMenu } from "../contextMenu";
import { clipboardImageItemToDataUrl } from "../utils/toDataUrl";
import { parseUrl } from "../utils/parseUrl";

declare module "@mencrouche/types" {
	interface DockPluginRegistry {
		bookmarker: BookmarkerPlugin;
	}
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

		this.anchorEl = getTemplate<HTMLAnchorElement>("bookmarkWidgets");
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
		if (this.url) {
			this.anchorEl.href = this.url.href;
		}
		this.anchorEl.target = this.target;
		this.labelEl.textContent = this.label.length ? this.label : " ";
		this.labelEl.title = this.label.length ? this.label : "";
		if (this.backgroundColor === "transparent") {
			this.iconBoxEl.classList.add("noBackground");
		} else {
			this.iconBoxEl.style.backgroundColor = this.backgroundColor;
		}
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
		this.imgEl.show();
		this.letterEl.hide();
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
		this.letterEl.show();
		this.imgEl.hide();
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

let editingBookmark: Bookmark | null = null;
let previewBookmark = new Bookmark({
	urlLike: "https://example.com",
	label: "Example",
	target: "_self",
	backgroundColor: generateRandomColor(),
});
let currentDock: Dock<"bookmarker">;

const dialog = $<HTMLDialogElement>("#bookmarkDialog")!;
const form = dialog.$("form")!;
const colorInput = form.$<HTMLInputElement>('[name="backgroundColor"]')!;
const iconInput = form.$<HTMLInputElement>('[name="icon"]')!;
const labelInput = form.$<HTMLInputElement>('[name="label"]')!;
const urlLikeInput = form.$<HTMLInputElement>('[name="urlLike"]')!;
const targetInput = form.$<HTMLInputElement>('[name="target"]')!;

dialog.$('[data-i18n="cancelSubmitBtn"]')!.on("click", () => dialog.close());
form.on("submit", handleSubmit);

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
targetInput.on("input", () =>
	updatePreview({ target: targetInput.value as BookmarkData["target"] }),
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

function updatePreview(changes: Partial<BookmarkData>): void {
	const newPreview = previewBookmark.withChanges(changes);
	previewBookmark.element.replaceWith(newPreview.element);
	previewBookmark = newPreview;
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
		const input = form.$<HTMLInputElement>(`[name="${key}"]`);
		if (input) {
			input.value = value ?? "";
		}
	});

	previewBookmark = new Bookmark(initialData);
	dialog.$(".gaPreview")!.replaceChildren(previewBookmark.element);

	dialog.showModal();
}

function handleAddBookmark() {
	const bookmarkToAdd = previewBookmark.withChanges({});
	apocalypse.write({
		execute() {
			currentDock.plugin.map.set(bookmarkToAdd.id, bookmarkToAdd);
			currentDock.plugin.addBookmark(bookmarkToAdd);
		},
		undo() {
			bookmarkToAdd.element.remove();
			currentDock.plugin.map.delete(bookmarkToAdd.id);
		},
	});
	markDirtyAndSaveDocument();
}

function handleEditBookmark(oldBookmark: Bookmark) {
	const newBookmark = previewBookmark.withChanges({});
	apocalypse.write({
		execute() {
			currentDock.plugin.map.set(newBookmark.id, newBookmark);
			oldBookmark.element.replaceWith(newBookmark.element);
		},
		undo() {
			newBookmark.element.replaceWith(oldBookmark.element);
			currentDock.plugin.map.set(oldBookmark.id, oldBookmark);
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
			currentDock.plugin.map.delete(bookmark.id);
		},
		undo() {
			currentDock.plugin.map.set(bookmark.id, bookmark);
			currentDock.plugin.addBookmark(bookmark);
		},
	});
	markDirtyAndSaveDocument();
}

interface BookmarkData {
	id?: string;
	urlLike: string;
	icon?: string | null;
	target: "_self" | "_blank";
	backgroundColor: string;
	label: string;
}

interface BookmarkerPlugin extends DockPlugin {
	map: Map<string, Bookmark>;
	takeSnapshot(): BookmarkData[];
	restoreSnapshot(bookmarks: BookmarkData[]): void;
	addBookmark(bookmark: Bookmark): void;
	config: {
		bookmarks: BookmarkData[];
	};
}

const bookmarkDock: DockPluginModel<"bookmarker"> = {
	type: "bookmarker",
	onMount(dock) {
		const widgets = getTemplate("bookmarkDockWidgets");
		const addBookmarkBtn = widgets.$("button")!;
		const mom = widgets.$("div")!;
		new DragAndDropSorter(mom, (src, target) => {
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

		addBookmarkBtn.on("click", () => {
			currentDock = dock;
			openDialog();
		});
		dock.replaceBody(widgets);

		dock.plugin.map = new Map();

		function takeSnapshot() {
			const bookmarks: BookmarkData[] = [];
			for (const bookmarkEl of dock.$$(".bookmark")) {
				const bookmark = dock.plugin.map.get(bookmarkEl.id);
				if (bookmark) {
					bookmarks.push(bookmark.toData());
				}
			}
			return bookmarks;
		}
		function restoreSnapshot(bookmarks: BookmarkData[]) {
			dock.plugin.map.clear();
			const frag = document.createDocumentFragment();
			for (const bookmark of bookmarks.map((data) => new Bookmark(data))) {
				dock.plugin.map.set(bookmark.id, bookmark);
				frag.appendChild(bookmark.element);
			}
			mom.replaceChildren(frag);
		}
		function addBookmark(bookmark: Bookmark) {
			mom.appendChild(bookmark.element);
		}

		Object.assign(dock.plugin, {
			takeSnapshot,
			restoreSnapshot,
			addBookmark,
		});

		const pluginConfig = dock.pluginConfig;
		if (pluginConfig) {
			dock.plugin.restoreSnapshot(pluginConfig.bookmarks);
		}
	},
	onDelete() {},
	onSave(dock) {
		const bookmarks: BookmarkData[] = [];
		for (const bookmark of dock.plugin.map.values()) {
			bookmarks.push(bookmark.toData());
		}
		return { bookmarks };
	},
};

const bookmarkMenuItems = [
	(anchor: HTMLAnchorElement) => ({
		name: "editBookmarkMenuItem",
		icon: "lucide-pencil",
		execute() {
			const dock = anchor.closest(".dock.bookmarker") as Dock<"bookmarker">;
			currentDock = dock;
			const bookmark = dock.plugin.map.get(anchor.id);
			if (bookmark) {
				openDialog(bookmark);
			}
		},
	}),
	(anchor: HTMLAnchorElement) => ({
		name: "deleteBookmarkMenuItem",
		icon: "lucide-trash-2",
		execute() {
			const dock = anchor.closest(".dock.bookmarker") as Dock<"bookmarker">;
			currentDock = dock;
			const bookmark = dock.plugin.map.get(anchor.id);
			if (bookmark) {
				handleDeleteBookmark(bookmark);
			}
		},
	}),
];

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
	const wwwRemoved = domainUrl.replace("www.", "");
	return `https://twenty-icons.com/${wwwRemoved}`;
}

export function initBookmarkDock() {
	registerDock(bookmarkDock);
	registerContextMenu("bookmark", bookmarkMenuItems);
}
