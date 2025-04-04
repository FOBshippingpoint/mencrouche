import { marked } from "marked";
import {
	registerSticky,
	type CustomStickyComposer,
	type CustomStickyConfig,
	type Sticky,
	type StickyPlugin,
} from "../sticky/sticky";
import { registerContextMenu, type MenuItem } from "../contextMenu";
import { blobToDataUrl } from "../utils/toDataUrl";
import { getTemplate } from "../utils/getTemplate";
import DOMPurify from "dompurify";
import { markDirtyAndSaveDocument } from "../lifesaver";
import { isScriptExecutionAllowed } from "../settings";
import Prism from "prismjs";

declare module "../sticky/sticky" {
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

// TODO: we do not revokeObjectURL when the link is gone
// This may cause serious memory problem. should improve later.
type BlobUrlDataUrl = [string, string];
const globalBlobUrlDataUrlMap = new Map<Sticky, BlobUrlDataUrl[]>();

function handleTextAreaPaste(
	sticky: Sticky<MarkdownPlugin, MarkdownConfig>,
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

const markdownSticky: CustomStickyComposer<MarkdownPlugin, MarkdownConfig> = {
	type: "markdown",
	onCreate(sticky) {
		enable(sticky);
		// Default set to edit mode.
		sticky.classList.add("editMode");
		sticky.$<HTMLTextAreaElement>("textarea")!.focus();
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
	onRestore(sticky, pluginConfig) {
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
	},
	options: {
		noPadding: true,
	},
};

const markdownStickyMenuItems: MenuItem[] = [
	(sticky: Sticky<MarkdownPlugin>) => ({
		name:
			"markdownStickyEditMode" +
			(sticky.classList.contains("editMode") ? "Off" : "On"),
		icon: sticky.classList.contains("editMode")
			? "lucide-sticky-note"
			: "lucide-pencil",
		execute() {
			sticky.plugin.toggleEditMode();
		},
	}),
	(sticky: Sticky<MarkdownPlugin>) => ({
		name:
			"markdownStickySplitView" +
			(sticky.classList.contains("splitView") ? "Off" : "On"),
		icon: sticky.classList.contains("splitView")
			? "lucide-square-equal"
			: "lucide-columns-2",
		execute() {
			sticky.plugin.toggleSplitView();
		},
	}),
	"hr",
];

function enable(sticky: Sticky<MarkdownPlugin, MarkdownConfig>) {
	const widgets = getTemplate("markdownStickyWidgets");
	const editModeToggleLbl = widgets.$<HTMLLabelElement>(".editModeToggleLbl")!;
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

	function updatePreview() {
		const dirtyHtml = marked.parse(textarea.value) as string;
		let html: string;
		if (isScriptExecutionAllowed()) {
			html = dirtyHtml;
		} else {
			// Sanitize the HTML content before parse.
			html = DOMPurify.sanitize(dirtyHtml, {
				// allow showing image
				ALLOWED_URI_REGEXP:
					/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
			});
		}
		const fragment = document.createRange().createContextualFragment(html);
		for (const el of fragment.querySelectorAll("pre code")) {
			const language = el.className.slice(9);
			el.innerHTML = Prism.highlight(
				(el as HTMLElement).innerText,
				Prism.languages[language],
				language,
			);
		}
		preview.replaceChildren(fragment);
	}

	sticky.dataset.contextMenu = "markdown basic";
	sticky.replaceBody(textarea, divider, preview);
	sticky.addControlWidget(editModeToggleLbl);

	handleTextAreaPaste(sticky, textarea);

	textarea.on("input", () => {
		textarea.dataset.value = textarea.value;
		markDirtyAndSaveDocument();
		if (sticky.classList.contains("splitView")) {
			updatePreview();
			sticky.dataset.prevInput = textarea.value;
		}
	});
	editModeToggleLbl.on("change", () => {
		editModeToggleLbl.$$("svg").forEach((el) => el.classList.toggle("none"));
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

		sticky.on("classchange", () => {
			if (
				sticky.classList.contains("splitView") &&
				sticky.classList.contains("editMode")
			) {
				leftPanel.style.width = "50%";
				rightPanel.style.width = "50%";
			}
		});
	}
	setupDivider(sticky, textarea, preview);

	function toggleDisable(disable: boolean) {
		sticky
			.$$("textarea,input,button")
			.forEach((el) => ((el as any).disabled = disable));
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
