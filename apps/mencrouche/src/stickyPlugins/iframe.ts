import { registerSticky } from "../sticky/sticky";
import { $, n81i } from "../utils/tools";
import { formToObject } from "../utils/formToObject";
import { getTemplateFragment } from "../utils/getTemplate";
import { parseUrl } from "../utils/parseUrl";
import type {
	StickyPlugin,
	Sticky,
	StickyPluginModel,
} from "@mencrouche/types";

declare module "@mencrouche/types" {
	interface StickyPluginRegistry {
		iframe: IFramePlugin;
	}
}

interface IFramePlugin extends StickyPlugin {
	updateIFrameUrl(url?: string | URL): void;
	config: { iframeSrc: string };
}

const dialog = $<HTMLDialogElement>("#iframeDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const cancelBtn = dialog.$<HTMLButtonElement>('[data-i18n="cancelSubmitBtn"]')!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
let current: Sticky<"iframe">;

cancelBtn.on("click", () => {
	dialog.close();
});

form.on("submit", (e) => {
	e.preventDefault();
	const { link } = formToObject<{ link: string }>(form);
	current.plugin.updateIFrameUrl(link);
	dialog.close();
});

const iframeSticky: StickyPluginModel<"iframe"> = {
	type: "iframe",
	meta: {
		contextMenuIcon: "lucide:globe",
	},
	onMount(sticky, origin) {
		const widgets = getTemplateFragment("iframeStickyWidgets");
		const ghostBtn = widgets.$<HTMLButtonElement>(".ghostBtn")!;
		const iframe = widgets.$<HTMLIFrameElement>("iframe")!;
		const addressBar = widgets.$("input")!;

		sticky.addControlWidget(ghostBtn);
		sticky.$(".stickyTitle")!.replaceChildren(addressBar);
		sticky.replaceBody(iframe);
		ghostBtn.on("click", sticky.toggleGhostMode);

		// TODO: it doesn't make sense to call without argument,
		// should improve later
		function updateIFrameUrl(url?: URL | string) {
			let urlLike = addressBar.value;
			if (url instanceof URL) {
				addressBar.setCustomValidity(""); // empty = valid, we need to refresh the
				iframe.src = url.href;
				linkInput.value = url.href;
				addressBar.value = url.href;
			}

			if (typeof url === "string") {
				urlLike = url;
			}
			const parsedUrl = parseUrl(urlLike);
			if (parsedUrl?.href !== iframe.src) {
				if (parsedUrl) {
					addressBar.setCustomValidity(""); // empty = valid, we need to refresh the
					// validity message to recover from previous invalid state.
					iframe.src = parsedUrl.href;
					linkInput.value = parsedUrl.href;
					addressBar.value = parsedUrl.href;
				} else {
					addressBar.setCustomValidity(n81i.t("invalidUrl"));
					addressBar.reportValidity();
				}
			}
		}
		addressBar.on("focus", () => addressBar.select());
		addressBar.on("blur", () => updateIFrameUrl());
		addressBar.on("keydown", (e) => {
			if (e.key === "Enter") {
				updateIFrameUrl();
			}
		});
		sticky.plugin.updateIFrameUrl = updateIFrameUrl;

		if (origin === "create") {
			sticky.classList.add("none");
			current = sticky;
			// Remove sticky if user cancel.
			const controller = new AbortController();
			form.on(
				"submit",
				() => {
					controller.abort();
					sticky.classList.remove("none");
				},
				{ signal: controller.signal },
			);
			dialog.on(
				"close",
				() => {
					if (!controller.signal.aborted) {
						sticky.forceDelete();
						controller.abort();
					}
				},
				{ once: true },
			);
			dialog.showModal();
			linkInput.select();
		} else if (origin === "restore") {
			const iframe = sticky.$("iframe")!;
			const addressBar = sticky.$("input")!;
			const pluginConfig = sticky.pluginConfig;
			if (pluginConfig) {
				iframe.src = pluginConfig.iframeSrc;
				addressBar.value = pluginConfig.iframeSrc;
			}
		}
	},
	onSave(sticky) {
		const iframe = sticky.$<HTMLIFrameElement>("iframe")!;
		return {
			iframeSrc: iframe.src,
		};
	},
	onDelete() {},
};

export function initIFrameSticky() {
	registerSticky(iframeSticky);
}
