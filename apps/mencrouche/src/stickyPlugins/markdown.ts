import { registerSticky } from "../sticky/sticky";
import { registerContextMenu } from "../contextMenu";
import type { MenuItem } from "@mencrouche/types";
import { blobToDataUrl } from "../utils/toDataUrl";
import { forkTemplateFragment } from "../utils/forkTemplate";
import type DOMPurify from "dompurify";
import { markDirtyAndSaveDocument } from "../lifesaver";
import { isScriptExecutionAllowed } from "../settings";
import type { IconToggle } from "../component/iconToggle";
import type {
	StickyPlugin,
	Sticky,
	StickyPluginModel,
} from "@mencrouche/types";
import type { marked } from "marked";

declare module "@mencrouche/types" {
	interface StickyPluginRegistry {
		markdown: MarkdownPlugin;
	}
}

interface MarkdownPlugin extends StickyPlugin {
	toggleSplitView: () => void;
	toggleEditMode: () => void;
	updatePreview: () => void;
	config: {
		prevInput: string;
		blobUrlDataUrlMap: BlobUrlDataUrl[];
	};
}

let markedModule: typeof marked;
let DOMPurifyModule: typeof DOMPurify;

// TODO: we do not revokeObjectURL when the link is gone
// This may cause serious memory problem. should improve later.
type BlobUrlDataUrl = [string, string];
const globalBlobUrlDataUrlMap = new Map<Sticky<"markdown">, BlobUrlDataUrl[]>();

function handleTextAreaPaste(
	sticky: Sticky<"markdown">,
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

const markdownSticky: StickyPluginModel<"markdown"> = {
	type: "markdown",
	meta: {
		contextMenuIcon: "ri:markdown-fill",
	},
	onMount(sticky, origin) {
		const widgets = forkTemplateFragment("markdownStickyWidgets");
		const editModeToggle = widgets.$<IconToggle>(".editModeToggle")!;
		const splitViewToggle = widgets.$<IconToggle>(".splitViewToggle")!;
		const textarea = widgets.$("textarea")!;
		const divider = widgets.$(".divider")!;
		const preview = widgets.$<HTMLDivElement>(".preview")!;

		textarea.on("keydown", (e) => {
			if (e.key === "Tab") {
				e.preventDefault();

				if (e.shiftKey) {
					// Unindent
					for (let i = textarea.selectionStart - 1; i >= 0; i--) {
						const chRight = textarea.value[i];
						const chLeft = textarea.value[i - 1];
						if ((chLeft === "\n" || i === 0) && chRight === "\t") {
							// Remove this tab character.
							textarea.setRangeText("", i, i + 1);
							return;
						}
					}
				} else {
					// Indent
					textarea.setRangeText(
						"\t",
						textarea.selectionStart,
						textarea.selectionStart,
						"end",
					);
				}
			}
		});

		async function updatePreview() {
			if (!markedModule) {
				markedModule = (await import("marked")).marked;
			}
			const dirtyHtml = markedModule.parse(textarea.value) as string;
			let html: string;
			if (isScriptExecutionAllowed()) {
				html = dirtyHtml;
			} else {
				if (!DOMPurifyModule) {
					DOMPurifyModule = (await import("dompurify")).default;
				}
				// Sanitize the HTML content before parse.
				html = DOMPurifyModule.sanitize(dirtyHtml, {
					// allow showing image
					ALLOWED_URI_REGEXP:
						/^(?:(?:https):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
				});
			}
			const fragment = document.createRange().createContextualFragment(html);
			for (const el of fragment.querySelectorAll("pre code")) {
				const language = el.className.slice(9);
				if (window?.Prism.languages[language]) {
					el.innerHTML = window.Prism.highlight(
						(el as HTMLElement).innerText,
						window.Prism.languages[language],
					);
				}
			}
			preview.replaceChildren(fragment);
		}

		sticky.dataset.contextMenu = "markdown basic";
		sticky.replaceBody(textarea, divider, preview);
		sticky.addControlWidget(editModeToggle);
		sticky.addControlWidget(splitViewToggle);

		handleTextAreaPaste(sticky, textarea);

		textarea.on("input", () => {
			textarea.dataset.value = textarea.value;
			markDirtyAndSaveDocument();
			if (sticky.classList.contains("splitView")) {
				updatePreview();
				sticky.dataset.prevInput = textarea.value;
			}
		});
		editModeToggle.on("change", () => {
			sticky.classList.toggle("editMode");
			if (!sticky.classList.contains("editMode") /* Change to view mode */) {
				if (sticky.dataset.prevInput !== textarea.value) {
					updatePreview();
				}
				textarea.style.removeProperty("width");
				preview.style.removeProperty("width");
				sticky.focus();
			}
			textarea.disabled = !textarea.disabled;
			sticky.dataset.prevInput = textarea.value;

			// Idk why we need setTimeout to let focus work...
			setTimeout(() => textarea.focus(), 0);
		});
		splitViewToggle.on("change", () => {
			if (!sticky.classList.contains("editMode")) {
				editModeToggle.toggleChecked();
			}
			updatePreview();
			sticky.classList.toggle("splitView");
			textarea.focus();
		});

		// Split view drag to adjust size
		function setupDivider(
			container: HTMLElement,
			leftPanel: HTMLElement,
			rightPanel: HTMLElement,
		) {
			let isResizing = false;

			divider.on("pointerdown", () => {
				isResizing = true;
				document.body.style.cursor = "col-resize";
			});
			document.on("pointermove", (e) => {
				if (!isResizing) return;

				const containerWidth = container.offsetWidth;
				const mouseX = (e as PointerEvent).clientX;
				const containerRect = container.getBoundingClientRect();
				const percentPosition = (mouseX - containerRect.left) / containerWidth;

				// Limit resizing between 10% and 90%
				const clampedPercent = Math.max(0.1, Math.min(0.9, percentPosition));

				leftPanel.style.width = `${clampedPercent * 100}%`;
				rightPanel.style.width = `${(1 - clampedPercent) * 100}%`;
			});
			document.on("pointerup", () => {
				isResizing = false;
				document.body.style.removeProperty("cursor");
			});

			sticky.on("classChange", () => {
				if (
					sticky.classList.contains("splitView") &&
					sticky.classList.contains("editMode")
				) {
					leftPanel.style.width = "50%";
					rightPanel.style.width = "50%";
				} else {
					leftPanel.style.width = "100%";
				}
			});
		}
		setupDivider(sticky, textarea, preview);

		function toggleDisable(disable: boolean) {
			sticky
				.$$("textarea,input,button")
				.forEach((el) => ((el as any).disabled = disable));
		}
		sticky.on("classChange", () => {
			if (sticky.classList.contains("pin")) {
				toggleDisable(true);
			} else {
				toggleDisable(false);
			}
		});

		sticky.plugin = {
			toggleEditMode() {
				editModeToggle.toggleChecked();
			},
			toggleSplitView() {
				splitViewToggle.toggleChecked();
			},
			updatePreview,
		};

		if (origin === "create") {
			sticky.classList.add("editMode");
			setTimeout(() => {
				sticky.$("textarea")!.focus();
			});
		} else if (origin === "restore") {
			const textarea = sticky.$("textarea")!;
			const pluginConfig = sticky.pluginConfig;
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
		}
	},
	onSave(sticky) {
		const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
		return {
			prevInput: textarea.value,
			blobUrlDataUrlMap: globalBlobUrlDataUrlMap.get(sticky)!,
		};
	},
	onDelete(sticky) {
		globalBlobUrlDataUrlMap.delete(sticky);
	},
};

const markdownStickyMenuItems: MenuItem[] = [
	(sticky: Sticky<"markdown">) => ({
		name: sticky.classList.contains("editMode")
			? "markdownStickyEditModeOff"
			: "markdownStickyEditModeOn",
		icon: sticky.classList.contains("editMode")
			? "lucide-sticky-note"
			: "lucide-pencil",
		execute() {
			sticky.plugin.toggleEditMode();
		},
	}),
	(sticky: Sticky<"markdown">) => ({
		name: sticky.classList.contains("splitView")
			? "markdownStickySplitViewOff"
			: "markdownStickySplitViewOn",
		icon: sticky.classList.contains("splitView")
			? "lucide-square-equal"
			: "lucide-columns-2",
		execute() {
			sticky.plugin.toggleSplitView();
		},
	}),
	"hr",
];

export function initMarkdownSticky() {
	registerSticky(markdownSticky);
	registerContextMenu("markdown", markdownStickyMenuItems);
	let id = setInterval(() => {
		if (window.Prism) {
			window.Prism.highlightAll();
			clearInterval(id);
		}
	}, 1000);
}
