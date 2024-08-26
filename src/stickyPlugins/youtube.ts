import {
  CustomSticky,
  Sticky,
  StickyPlugin,
  StickyLifeCycleState,
} from "../sticky";
import { getWidgets } from "./getWidgets";
import { n81i } from "../utils/n81i";
import { $ } from "../utils/dollars";
import { formToObject } from "../utils/formToObject";

declare module "../sticky" {
  interface StickyPluginRegistry {
    youtube: YouTubePlugin;
  }
}

interface YouTubePlugin extends StickyPlugin {
  onSubmit?: () => void;
  initPlayer?: () => void;
  player?: YT.Player;
}

let isYoutubeScriptLoaded = false;

const dialog = $<HTMLDialogElement>("#youtubeDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const cancelBtn = dialog.$<HTMLButtonElement>(
  '[data-i18n="cancel_submit_btn"]',
)!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
const videoIdInput = dialog.$<HTMLInputElement>('[name="videoId"]')!;
const autoplayCheckbox = dialog.$<HTMLInputElement>('[name="autoplay"]')!;
let current: Sticky;

cancelBtn.on("click", () => {
  dialog.close();
  if (current?.dataset.isPlaying === "on") {
    current?.plugin.youtube.player?.playVideo();
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
    linkInput.setCustomValidity(n81i.t("cannot_found_youtube_video"));
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
  current.$<HTMLIFrameElement>("iframe")!.classList.remove("none");
  current.dataset.videoId = videoId;
  current.dataset.link = link;
  current.dataset.autoplay = autoplay;

  // idk why, but with setTimeout, the onReady event will be triggered.
  setTimeout(() => {
    current.plugin.youtube.initPlayer?.();
  }, 0);

  dialog.close();
});

function onSave(sticky: Sticky) {
  // Save current player state and time to dataset.
  sticky.dataset.playerState = sticky.plugin.youtube.player
    ?.getPlayerState()
    .toString();
  sticky.dataset.currentTime = sticky.plugin.youtube.player
    ?.getCurrentTime()
    .toString();
}

function onDelete(sticky: Sticky) {
  sticky.dataset.playerState = sticky.plugin.youtube.player
    ?.getPlayerState()
    .toString();
  sticky.plugin.youtube.player?.pauseVideo();
}

export const youtubeSticky: CustomSticky = {
  type: "youtube",
  on(sticky: Sticky, state: StickyLifeCycleState) {
    if (state === "save") {
      onSave(sticky);
      return;
    }

    if (state === "delete") {
      onDelete(sticky);
      return;
    }

    const widgets = getWidgets(sticky, "youtubeStickyWidgets");
    const editLinkBtn = widgets.$<HTMLButtonElement>(".editLinkBtn")!;
    const iframe = widgets.$<HTMLIFrameElement>("iframe")!;
    let player = sticky.plugin.youtube?.player;

    if (state === "create") {
      sticky.addControlWidget(editLinkBtn);
      sticky.replaceBody(iframe);
      current = sticky;
      linkInput.value = "";
      videoIdInput.value = "";

      if (window.matchMedia("(min-width: 1536px)").matches) {
        sticky.style.width = "54em";
        sticky.style.height = "33em";
      } else if (window.matchMedia("(min-width: 1024px)").matches) {
        sticky.style.width = "45em";
        sticky.style.height = "27em";
      } else {
        sticky.style.width = "23em";
        sticky.style.height = "15em";
      }
    }

    if (state === "create" || state === "restoreFromHtml") {
      editLinkBtn.on("click", () => {
        current = sticky;
        player?.pauseVideo();
        linkInput.value = sticky.dataset.link ?? "";
        videoIdInput.value = sticky.dataset.videoId ?? "";
        autoplayCheckbox.checked = sticky.dataset.autoplay === "on";
        sticky.dataset.isPlaying =
          player?.getPlayerState() === YT.PlayerState.PLAYING ? "on" : "off";
        dialog.showModal();
        linkInput.focus();
        linkInput.select();
      });
      sticky.plugin.youtube = {};
      iframe.id ||= crypto.randomUUID();
    }

    // Only call when create or restoreFromHtml
    function initPlayer() {
      player = new YT.Player(iframe.id, {
        events: {
          onReady: (event) => {
            if (sticky.dataset.currentTime) {
              player?.seekTo(parseInt(sticky.dataset.currentTime, 10), true);
            }

            if (state === "restoreFromHtml") {
              if (
                sticky.dataset.playerState ===
                  YT.PlayerState.PLAYING.toString() &&
                sticky.dataset.autoplay === "on"
              ) {
                // Not working sometimes. I think browser is blocking auto play
                // somehow?
                player?.playVideo();
              }
            }
          },
          // onStateChange: (event) =>
          //   (sticky.dataset.playerState = player.getPlayerState().toString()),
        },
      });
      sticky.plugin.youtube.player = player;
    }

    sticky.plugin.youtube.initPlayer = initPlayer;
    if (isYoutubeScriptLoaded) {
      if (state === "create" || state === "restoreFromHtml") {
        initPlayer();
      } else if (state === "restore") {
        if (sticky.dataset.playerState === YT.PlayerState.PLAYING.toString()) {
          if (sticky.dataset.autoplay === "on") {
            player?.playVideo();
          }
        }
      }
    }

    if (!isYoutubeScriptLoaded) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

      Object.assign(window, {
        onYouTubeIframeAPIReady() {
          isYoutubeScriptLoaded = true;

          if (state === "create" || state === "restoreFromHtml") {
            initPlayer();
          }
        },
      });
    }

    if (state === "create") {
      // Remove sticky if user cancel.
      let isSubmitted = false;
      const controller = new AbortController();
      form.on(
        "submit",
        () => {
          isSubmitted = true;
          sticky.plugin.youtube.onSubmit?.();
        },
        { signal: controller.signal },
      );
      dialog.on(
        "close",
        () => {
          if (!isSubmitted) {
            sticky.forceDelete();
            controller.abort();
          }
        },
        { once: true },
      );
      dialog.showModal();
      linkInput.focus();
    }
  },
};
