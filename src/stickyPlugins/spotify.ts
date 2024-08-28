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
    spotify: SpotifyPlugin;
  }
}

interface SpotifyPlugin extends StickyPlugin {
  onSubmit?: () => void;
}

const dialog = $<HTMLDialogElement>("#spotifyDialog")!;
const form = dialog.$<HTMLFormElement>("form")!;
const cancelBtn = dialog.$<HTMLButtonElement>(
  '[data-i18n="cancel_submit_btn"]',
)!;
const linkInput = dialog.$<HTMLInputElement>('[name="link"]')!;
let current: Sticky;

cancelBtn.on("click", () => {
  dialog.close();
});

linkInput.on("input", () => {
  const url = new URL(linkInput.value);
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
    linkInput.setCustomValidity(n81i.t("cannot_found_spotify_media"));
    linkInput.reportValidity();
  }
});
form.on("submit", (e) => {
  e.preventDefault();
  const { height, link } = formToObject(form);

  const url = new URL(link);
  if (!url.pathname.startsWith("/embed")) {
    url.pathname = "/embed" + url.pathname;
  }
  for (const key of url.searchParams.keys()) {
    url.searchParams.delete(key);
  }

  const iframe = current.$<HTMLIFrameElement>("iframe")!;
  iframe.src = url.toString();
  iframe.height = height;
  iframe.classList.remove("none");

  current.dataset.link = link;
  current.dataset.height = height;

  dialog.close();
});

export const spotifySticky: CustomSticky = {
  type: "spotify",
  on(sticky: Sticky, state: StickyLifeCycleState) {
    if (state === "save") {
      return;
    }

    const widgets = getWidgets(sticky, "spotifyStickyWidgets");
    const editLinkBtn = widgets.$<HTMLButtonElement>(".editLinkBtn")!;
    const ghostBtn = widgets.$<HTMLButtonElement>(".ghostBtn")!;
    const iframe = widgets.$<HTMLIFrameElement>("iframe")!;

    if (state === "delete") {
      // Reassign src to stop playing.
      iframe.src = iframe.src;
      return;
    }

    if (state === "create") {
      sticky.addControlWidget(editLinkBtn);
      sticky.addControlWidget(ghostBtn);
      sticky.replaceBody(iframe);
      current = sticky;
      linkInput.value = "";

      if (window.matchMedia("(min-width: 1536px)").matches) {
        sticky.style.width = "500px";
      } else if (window.matchMedia("(min-width: 1024px)").matches) {
        sticky.style.width = "300px";
      } else {
        sticky.style.width = "100px";
      }
    }

    if (state === "create" || state === "restoreFromHtml") {
      editLinkBtn.on("click", () => {
        current = sticky;
        linkInput.value = sticky.dataset.link ?? "";
        form.$$<HTMLOptionElement>("option").do((el) => {
          if (current.dataset.height) {
            el.selected = current.dataset.height === el.value;
          }
        });
        dialog.showModal();
        linkInput.select();
      });
      ghostBtn.on("click", sticky.toggleGhostMode);
      sticky.plugin.spotify = {};
      iframe.id ||= crypto.randomUUID();
    }

    if (state === "create") {
      // Remove sticky if user cancel.
      let isSubmitted = false;
      const controller = new AbortController();
      form.on(
        "submit",
        () => {
          isSubmitted = true;
          sticky.plugin.spotify.onSubmit?.();
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
      linkInput.select();
    }
  },
};
