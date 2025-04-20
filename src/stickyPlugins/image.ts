import type { ImageChangeDetail } from "../component/imagePicker";
import {
	type StickyPluginModel,
	type StickyPlugin,
	registerSticky,
	workspace,
} from "../sticky/sticky";
import { getTemplateFragment } from "../utils/getTemplate";
import { n81i } from "../utils/n81i";
import { handlePasteImage } from "../utils/pasteImage";
import {
	copyBlobToClipboard,
	downloadBlobAsFile,
	urlToBlob,
} from "../utils/toDataUrl";
import { trayTip } from "../utils/traytip";

declare module "../sticky/sticky" {
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

const imageSticky: StickyPluginModel<"image"> = {
	type: "image",
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
			sticky.replaceBody(img);
		} else {
			sticky.replaceBody(imagePicker);
			downloadBtn.disabled = true;
			copyBtn.disabled = true;
		}
		imagePicker.on("imageChange", (e) => {
			const { url, name } = (e as CustomEvent<ImageChangeDetail>).detail;
			img.src = url;
			img.alt = name ?? "";
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
		if (
			(e.target as HTMLElement).matches(
				"input,textarea,[contenteditable='true']",
			)
		) {
			return;
		}

		const url = await handlePasteImage(e as ClipboardEvent);
		if (url) {
			workspace.createSticky({ type: "image", pluginConfig: { imgSrc: url } });
		}
	});
}
