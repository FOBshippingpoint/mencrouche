import type { ImageChangeDetail } from "../component/imagePicker";
import { registerSticky, workspace } from "../sticky/sticky";
import { getTemplateFragment } from "../utils/getTemplate";
import { handlePasteImage } from "../utils/pasteImage";
import {
	copyBlobToClipboard,
	downloadBlobAsFile,
	urlToBlob,
} from "../utils/toDataUrl";
import { trayTip } from "../utils/trayTip";
import { $, n81i } from "../utils/tools";
import type { StickyPlugin, StickyPluginModel } from "@mencrouche/types";

declare module "@mencrouche/types" {
	interface StickyPluginRegistry {
		image: ImagePlugin;
	}
}

interface ImagePlugin extends StickyPlugin {
	updateIFrameUrl(url?: string | URL): void;
	config: {
		imgSrc: string;
		imgAlt: string;
	};
}

function constraint(
	img: HTMLImageElement,
	maxWidth: number,
	maxHeight: number,
) {
	const naturalWidth = img.naturalWidth;
	const naturalHeight = img.naturalHeight;
	const aspectRatio = Math.round(naturalWidth / naturalHeight);
	let newWidth = naturalWidth;
	let newHeight = naturalHeight;

	// Apply constraints while maintaining aspect ratio
	if (newWidth > maxWidth) {
		newWidth = maxWidth;
		newHeight = newWidth / aspectRatio;
	}

	if (newHeight > maxHeight) {
		newHeight = maxHeight;
		newWidth = newHeight * aspectRatio;
	}

	return { width: Math.round(newWidth), height: Math.round(newHeight) };
}

const imageSticky: StickyPluginModel<"image"> = {
	type: "image",
	meta: {
		contextMenuIcon: "lucide:image",
	},
	onMount(sticky) {
		const widgets = getTemplateFragment("imageStickyWidgets");
		const downloadBtn = widgets.$<HTMLButtonElement>(".downloadBtn")!;
		const copyBtn = widgets.$<HTMLButtonElement>(".copyBtn")!;
		const imagePicker = widgets.$<HTMLButtonElement>("image-picker")!;
		const img = widgets.$("img")!;

		sticky.addControlWidget(downloadBtn);
		sticky.addControlWidget(copyBtn);

		const pluginConfig = sticky.pluginConfig;
		if (pluginConfig) {
			img.src = pluginConfig.imgSrc;
			img.alt = pluginConfig.imgAlt;
			img.title = img.alt;
			sticky.replaceBody(img);
		} else {
			sticky.replaceBody(imagePicker);
			downloadBtn.disabled = true;
			copyBtn.disabled = true;
		}
		imagePicker.on("imageChange", (e) => {
			const { url, name } = (e as CustomEvent<ImageChangeDetail>).detail;
			img.src = url;
			img.alt = name ?? n81i.t("untitled");
			img.title = img.alt;
			sticky.replaceBody(img);
			downloadBtn.disabled = false;
			copyBtn.disabled = false;
		});

		downloadBtn.on("click", async () => {
			const blob = await urlToBlob(img.src);
			downloadBlobAsFile(blob, img.alt);
		});
		copyBtn.on("click", async () => {
			const blob = await urlToBlob(img.src);
			await copyBlobToClipboard(blob);
			trayTip({
				type: "success",
				title: n81i.t("imageCopiedTitle"),
				message: n81i.t("imageCopiedMessage"),
			});
		});

		img.onload = () => {
			const { width, height } = constraint(
				img,
				window.screen.availWidth * 0.8,
				window.screen.availHeight * 0.8,
			);
			// TODO: I think I din't consider header height, just hardcoded value 🥵
			sticky.style.width = `${Math.round(width)}px`;
			sticky.style.height = `${Math.round(height + 35)}px`;
		};
	},
	onSave(sticky) {
		const img = sticky.$("img");
		if (img) {
			return {
				imgSrc: img.src,
				imgAlt: img.alt,
			};
		}
	},
	onDelete() {},
};

export function initImageSticky() {
	registerSticky(imageSticky);
	window.on("paste", async (e) => {
		const isInputting = (e.target as HTMLElement).closest(
			"input,textarea,[contenteditable='true']",
		);
		const isSettingsPageOpened = !$("#settings")!.isHidden;
		if (isInputting || isSettingsPageOpened) {
			return;
		}

		const url = await handlePasteImage(e as ClipboardEvent);
		if (url) {
			workspace.createSticky({
				type: "image",
				pluginConfig: { imgSrc: url, imgAlt: n81i.t("untitled") },
			});
		}
	});
}
