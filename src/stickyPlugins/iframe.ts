import {
	type PluginStickyModel,
	type PluginStickyConfig,
	type Sticky,
	type PluginSticky,
	registerSticky,
	workspace,
} from "../sticky/sticky";
import { n81i } from "../utils/n81i";
import { $ } from "../utils/dollars";
import { formToObject } from "../utils/formToObject";
import { getTemplateFragment } from "../utils/getTemplate";
import { registerCommand } from "../commands";
import { parseUrl } from "../utils/parseUrl";

declare module "../sticky/sticky" {
	interface PluginStickyPoolMap {
		iframe: Sticky<IFramePlugin, IFrameConfig>;
	}
}

interface IFramePlugin extends PluginSticky {
	updateIFrameUrl(url?: string | URL): void;
}
interface IFrameConfig extends PluginStickyConfig {
	iframeSrc: string;
}

const dialog = $<HTMLDialogElement>("#iframeDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const cancelBtn = dialog.$<HTMLButtonElement>('[data-i18n="cancelSubmitBtn"]')!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
let current: Sticky<IFramePlugin, IFrameConfig>;

cancelBtn.on("click", () => {
	dialog.close();
});

form.on("submit", (e) => {
	e.preventDefault();
	const { link } = formToObject<{ link: string }>(form);
	current.plugin.updateIFrameUrl(link);
	dialog.close();
});

const iframeSticky: PluginStickyModel<IFramePlugin, IFrameConfig> = {
	type: "iframe",
	onCreate(sticky: Sticky<IFramePlugin, IFrameConfig>) {
		sticky.classList.add("none");
		enable(sticky);
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
	},
	onSave(sticky) {
		const iframe = sticky.$<HTMLIFrameElement>("iframe")!;
		return {
			iframeSrc: iframe.src,
		};
	},
	onDelete() {},
	onRestore(sticky, config) {
		enable(sticky);
		const iframe = sticky.$("iframe")!;
		const addressBar = sticky.$("input")!;
		if (config) {
			iframe.src = config.iframeSrc;
			addressBar.value = config.iframeSrc;
		}
	},
};

function enable(sticky: Sticky<IFramePlugin, IFrameConfig>) {
	const widgets = getTemplateFragment("iframeStickyWidgets");
	const ghostBtn = widgets.$<HTMLButtonElement>(".ghostBtn")!;
	const iframe = widgets.$<HTMLIFrameElement>("iframe")!;
	const addressBar = widgets.$("input")!;

	sticky.addControlWidget(ghostBtn);
	sticky.$(".stickyTitle")!.replaceChildren(addressBar);
	sticky.replaceBody(iframe);
	ghostBtn.on("click", sticky.toggleGhostMode);

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
}

export function initIFrameSticky() {
	registerSticky(iframeSticky);
}

registerCommand({
	name: "s",
	defaultShortcut: "A-t",
	execute() {
		workspace.create({ type: "iframe" });
	},
});
