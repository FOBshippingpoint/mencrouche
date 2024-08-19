import { CustomSticky, Sticky, StickyPlugin } from "../sticky";
import { getWidgets } from "./getWidgets";
import { n81i } from "../utils/n81i";
import { $, Allowance } from "../utils/dollars";
import { formToObject } from "../utils/formToObject";
import { apocalypse } from "../commands";

declare module "../sticky" {
  interface StickyPluginRegistry {
    youtube: YouTubePlugin;
  }
}

interface YouTubePlugin extends StickyPlugin {}

const dialog = $<HTMLDialogElement>("#youtubeDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const submitBtn = dialog.$<HTMLButtonElement>('[type="submit"]')!;
const cancelBtn = dialog.$<HTMLButtonElement>(
  '[data-i18n="cancel_submit_btn"]',
)!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
const videoIdInput = dialog.$<HTMLInputElement>('[name="videoId"]')!;
const autoplayCheckbox = dialog.$<HTMLInputElement>('[name="autoplay"]')!;
let current: Allowance<HTMLDivElement>;

cancelBtn.on("click", () => dialog.close());

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
  } else {
    linkInput.setCustomValidity(n81i.t("cannot_found_youtube_video"));
    linkInput.reportValidity();
  }
});
form.on("submit", (e) => {
  e.preventDefault();
  const { videoId, autoplay, link } = formToObject(form);
  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

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

  dialog.close();
});

export function enable(sticky: Sticky, isRestore: boolean): Sticky {
  const widgets = getWidgets(sticky, "youtubeStickyWidgets");
  const editLinkBtn = widgets.$<HTMLButtonElement>(".editLinkBtn")!;
  const iframe = widgets.$<HTMLIFrameElement>("iframe")!;

  if (!isRestore /* == New */) {
    sticky.addControlWidget(editLinkBtn);
    sticky.replaceBody(iframe);
    current = sticky;
    linkInput.value = "";
    videoIdInput.value = "";

    // Remove sticky if user cancel.
    let isSubmitted = false;
    form.on("submit", () => (isSubmitted = true), { once: true });
    dialog.on(
      "close",
      () => {
        if (!isSubmitted) {
          sticky.forceDelete();
        }
      },
      { once: true },
    );
    dialog.showModal();
  }

  editLinkBtn.on("click", () => {
    pauseVideo(iframe);
    linkInput.value = sticky.dataset.link ?? "";
    videoIdInput.value = sticky.dataset.videoId ?? "";
    autoplayCheckbox.checked = sticky.dataset.autoplay === "on";
    dialog.showModal();
  });
  sticky.plugin.youtube = {};
  sticky.classList.add("youtube");

  return sticky;
}

function pauseVideo(iframe: HTMLIFrameElement) {
  iframe.contentWindow?.postMessage(
    '{"event":"command","func":"pauseVideo","args":""}',
    "*",
  );
}

// TODO: click edit button when playing video, if cancel, it should resume video.
function playVideo(iframe: HTMLIFrameElement) {
  iframe.contentWindow?.postMessage(
    '{"event":"command","func":"playVideo","args":""}',
    "*",
  );
}

export const youtubeSticky: CustomSticky = {
  type: "youtube",
  onNew(sticky: Sticky) {
    enable(sticky, false);
  },
  onRestore(sticky: Sticky) {
    enable(sticky, true);
  },
  onDelete(sticky: Sticky) {
    apocalypse.write({
      execute() {
        pauseVideo(sticky.$<HTMLIFrameElement>("iframe")!);
        sticky.delete();
      },
      undo() {
        sticky.recover();
      },
    });
  },
};
