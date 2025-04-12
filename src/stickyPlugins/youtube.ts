import {
	type PluginStickyModel,
	type PluginStickyConfig,
	type Sticky,
	type PluginSticky,
	registerSticky,
} from "../sticky/sticky";
import { n81i } from "../utils/n81i";
import { $ } from "../utils/dollars";
import { formToObject } from "../utils/formToObject";
import { getTemplateFragment } from "../utils/getTemplate";

interface YouTubePlugin extends PluginSticky {
	initPlayer: () => void;
	player?: YT.Player;
}
interface YouTubeConfig extends PluginStickyConfig {
	iframeSrc: string;
	currentTime: number;
	playerState: number;
}

let isYoutubeScriptLoaded = false;

const dialog = $<HTMLDialogElement>("#youtubeDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const cancelBtn = dialog.$<HTMLButtonElement>('[data-i18n="cancelSubmitBtn"]')!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
const videoIdInput = dialog.$<HTMLInputElement>('[name="videoId"]')!;
const autoplayCheckbox = dialog.$<HTMLInputElement>('[name="autoplay"]')!;
let current: Sticky<YouTubePlugin>;

cancelBtn.on("click", () => {
	dialog.close();
	if (current?.dataset.isPlaying === "on") {
		current?.plugin.player?.playVideo();
	}
});

linkInput.on("input", () => {
	const link = linkInput.value;
	let videoId: string | null = link.trim();

	try {
		const url = new URL(link);
		if (url.host.endsWith("youtube.com")) {
			videoId = url.searchParams.get("v");
		} else if (url.host.endsWith("youtu.be")) {
			videoId = url.pathname.substring(1);
		}
		if (url.searchParams.get("autoplay") === "1") {
			autoplayCheckbox.checked = true;
		}
	} catch (_) {}

	if (videoId) {
		videoIdInput.value = videoId;
		linkInput.setCustomValidity(""); // empty = valid, we need to refresh the
		// validity message to recover from previous invalid state.
	} else {
		linkInput.setCustomValidity(n81i.t("cannotFoundYoutubeVideo"));
		linkInput.reportValidity();
	}
});
form.on("submit", (e) => {
	e.preventDefault();
	const { videoId, autoplay, link } = formToObject(form);
	let embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

	embedUrl.searchParams.set("enablejsapi", "1");
	embedUrl.searchParams.set("origin", window.location.origin);
	if (autoplay) {
		embedUrl.searchParams.set("autoplay", "1");
	}

	current.$<HTMLIFrameElement>("iframe")!.src = embedUrl.toString();
	current.plugin.initPlayer();
	current.dataset.videoId = videoId;
	current.dataset.link = link;
	current.dataset.autoplay = autoplay;

	dialog.close();
});

const youtubeSticky: PluginStickyModel<YouTubePlugin, YouTubeConfig> = {
	type: "youtube",
	onCreate(sticky) {
		sticky.classList.add("none");
		enable(sticky, () => {
			if (sticky.dataset.autoplay === "on") {
				sticky.plugin.player?.playVideo();
			}
		});
		if (window.matchMedia("(min-width: 1536px)").matches) {
			sticky.style.width = "864px";
			sticky.style.height = "528px";
		} else if (window.matchMedia("(min-width: 1024px)").matches) {
			sticky.style.width = "720px";
			sticky.style.height = "432px";
		} else {
			sticky.style.width = "368px";
			sticky.style.height = "240px";
		}

		// sticky.style.left = `${parseInt(sticky.style.left) - parseInt(sticky.style.width) / 2}px`;

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
		linkInput.focus();
	},
	onSave(sticky) {
		// Save current player state and time.
		if (sticky.plugin.player) {
			const pluginConfig: YouTubeConfig = {
				playerState:
					sticky.plugin.player.getPlayerState?.() ?? YT.PlayerState.UNSTARTED,
				currentTime: sticky.plugin.player.getCurrentTime?.() ?? 0,
				iframeSrc: sticky.$<HTMLIFrameElement>("iframe")!.src,
			};
			return pluginConfig;
		}
	},
	onDelete() {},
	onRestore(sticky, pluginConfig) {
		if (pluginConfig) {
			enable(sticky, () => {
				if (pluginConfig.currentTime) {
					sticky.plugin.player?.seekTo(pluginConfig.currentTime, true);
				}
				if (pluginConfig.playerState === YT.PlayerState.PLAYING) {
					sticky.plugin.player?.playVideo();
				}
			});
			sticky.$<HTMLIFrameElement>("iframe")!.src = pluginConfig.iframeSrc;
			sticky.plugin.initPlayer();
		}
	},
};

function enable(sticky: Sticky<YouTubePlugin>, onScriptLoad: () => void) {
	const widgets = getTemplateFragment("youtubeStickyWidgets");
	const editLinkBtn = widgets.$<HTMLButtonElement>(".editLinkBtn")!;
	const iframe = widgets.$("iframe")!;

	sticky.addControlWidget(editLinkBtn);
	sticky.replaceBody(iframe);

	current = sticky;
	linkInput.value = "";
	videoIdInput.value = "";
	iframe.id = crypto.randomUUID();

	editLinkBtn.on("click", () => {
		current = sticky;
		sticky.dataset.isPlaying =
			current.plugin.player?.getPlayerState?.() === YT.PlayerState.PLAYING
				? "on"
				: "off";
		sticky.plugin.player?.pauseVideo();
		linkInput.value = sticky.dataset.link ?? "";
		videoIdInput.value = sticky.dataset.videoId ?? "";
		autoplayCheckbox.checked = sticky.dataset.autoplay === "on";
		dialog.showModal();
		linkInput.focus();
		linkInput.select();
	});

	let inited = false;
	sticky.plugin.initPlayer = () => {
		if (inited) return;
		if (isYoutubeScriptLoaded) {
			sticky.plugin.player = new YT.Player(iframe.id, {
				events: {
					onReady: () => {
						onScriptLoad();
						inited = true;
					},
				},
			});
		}
	};

	if (isYoutubeScriptLoaded) {
		sticky.plugin.initPlayer();
	} else {
		const tag = document.createElement("script");
		tag.src = "https://www.youtube.com/iframe_api";
		const firstScriptTag = document.getElementsByTagName("script")[0];
		firstScriptTag?.parentNode!.insertBefore(tag, firstScriptTag);

		Object.assign(window, {
			onYouTubeIframeAPIReady() {
				isYoutubeScriptLoaded = true;
				sticky.plugin.initPlayer();
			},
		});
	}
}

export function initYouTubeSticky() {
	registerSticky(youtubeSticky);
}
