import { registerSticky } from "../sticky/sticky";
import { $, n81i } from "../utils/tools";
import { formToObject } from "../utils/formToObject";
import { getTemplateFragment } from "../utils/getTemplate";
import type {
	StickyPlugin,
	Sticky,
	StickyPluginModel,
} from "@mencrouche/types";

declare module "@mencrouche/types" {
	interface StickyPluginRegistry {
		spotify: SpotifyPlugin;
	}
}

interface SpotifyPlugin extends StickyPlugin {
	config: {
		iframeHeight: string;
		iframeSrc: string;
	};
}

const dialog = $<HTMLDialogElement>("#spotifyDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const cancelBtn = dialog.$<HTMLButtonElement>('[data-i18n="cancelSubmitBtn"]')!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
let current: Sticky<"spotify">;

cancelBtn.on("click", () => {
	dialog.close();
});

linkInput.on("input", () => {
	let url: URL;
	try {
		url = new URL(linkInput.value);
		if (
			url.host.endsWith("spotify.com") &&
			(url.pathname.startsWith("/track") ||
				url.pathname.startsWith("/album") ||
				url.pathname.startsWith("/episode") ||
				url.pathname.startsWith("/embed"))
		) {
			linkInput.setCustomValidity(""); // empty = valid, we need to refresh the
			// validity message to recover from previous invalid state.
		} else {
			linkInput.setCustomValidity(n81i.t("cannotFoundSpotifyMedia"));
			linkInput.reportValidity();
		}
	} catch (_) {
		linkInput.setCustomValidity(n81i.t("cannotFoundSpotifyMedia"));
		linkInput.reportValidity();
	}
});
form.on("submit", (e) => {
	e.preventDefault();
	const { height, link } = formToObject<{ height: string; link: string }>(form);

	const url = new URL(link);
	if (!url.pathname.startsWith("/embed")) {
		url.pathname = "/embed" + url.pathname;
	}
	for (const key of url.searchParams.keys()) {
		url.searchParams.delete(key);
	}

	const iframe = current.$("iframe")!;
	iframe.src = url.toString();
	iframe.height = height;
	iframe.show();

	current.dataset.link = link;
	current.dataset.height = height;

	// Adjust height
	current.style.height = `${parseInt(height) + 28}px`;

	// Adjust width
	if (window.matchMedia("(min-width: 1536px)").matches) {
		current.style.width = "500px";
	} else if (window.matchMedia("(min-width: 1024px)").matches) {
		current.style.width = "400px";
	} else if (window.matchMedia("(min-width: 768px)").matches) {
		current.style.width = "300px";
	} else {
		current.style.width = "200px";
	}

	dialog.close();
});

const spotifySticky: StickyPluginModel<"spotify"> = {
	type: "spotify",
	meta: {
		contextMenuIcon: "mdi:spotify",
	},
	onMount(sticky, origin) {
		const widgets = getTemplateFragment("spotifyStickyWidgets");
		const editLinkBtn = widgets.$<HTMLButtonElement>(".editLinkBtn")!;
		const ghostBtn = widgets.$<HTMLButtonElement>(".ghostBtn")!;
		const iframe = widgets.$("iframe")!;

		sticky.addControlWidget(editLinkBtn);
		sticky.addControlWidget(ghostBtn);
		sticky.replaceBody(iframe);

		linkInput.value = "";

		editLinkBtn.on("click", () => {
			current = sticky;
			linkInput.value = sticky.dataset.link ?? "";
			form.$$("option").forEach((el) => {
				if (current.dataset.height) {
					el.selected = current.dataset.height === el.value;
				}
			});
			dialog.showModal();
			linkInput.select();
		});
		ghostBtn.on("click", sticky.toggleGhostMode);

		if (origin === "create") {
			sticky.hide();
			current = sticky;
			// Remove sticky if user cancel.
			const controller = new AbortController();
			form.on(
				"submit",
				() => {
					controller.abort();
					sticky.show();
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
			const pluginConfig = sticky.pluginConfig;
			if (pluginConfig) {
				iframe.src = pluginConfig.iframeSrc;
				iframe.height = pluginConfig.iframeHeight;
			}
		}
	},
	onSave(sticky) {
		const iframe = sticky.$("iframe")!;
		return {
			iframeHeight: iframe.height,
			iframeSrc: iframe.src,
		};
	},
	onDelete() {},
};

export function initSpotifySticky() {
	registerSticky(spotifySticky);
}
