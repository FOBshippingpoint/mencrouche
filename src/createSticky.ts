import { marked } from "marked";
import { $, $$, Penny } from "./utils/dollars";
import { n81i } from "./utils/n81i";

type Sticky = Penny<HTMLDivElement> & {
  delete: () => void;
  duplicate: () => void;
  toggleEditMode: () => void;
  toggleMaximize: () => void;
  toggleSplitView: () => void;
  toggleGhostMode: () => void;
  togglePin: () => void;
};

let highestZIndex = 0;
/** An array for tracking the sticky order, from lowest -> topest */
const stickies: Penny<HTMLDivElement>[] = [];
const stickyTemplate = $<HTMLTemplateElement>("#sticky")!;
// This element is for getting var(--size-fluid-9) in pixels. So that we can
// set default sticky position to center if user didn't move their mouse yet.
const stickySizeDummy = $<HTMLDivElement>("#stickySizeDummy")!;

let stickyContainer: Penny<HTMLDivElement>;
let pointerX: number;
let pointerY: number;

export function getLatestSticky(): Sticky | undefined {
  return stickies.at(-1) as Sticky;
}

export function initStickyContainer() {
  stickyContainer = $<HTMLDivElement>(".stickyContainer")!;
  stickyContainer.addEventListener("pointermove", (e) => {
    pointerX = e.clientX - stickyContainer!.getBoundingClientRect().left;
    pointerY = e.clientY - stickyContainer!.getBoundingClientRect().top;
  });

  pointerX =
    (stickyContainer.getBoundingClientRect().width -
      stickySizeDummy.getBoundingClientRect().width) /
    2;
  pointerY =
    (stickyContainer.getBoundingClientRect().height -
      stickySizeDummy.getBoundingClientRect().width) /
    2;

  // Find and set the highestZIndex when initialize from existing document.
  for (const sticky of $$(".sticky")) {
    const zIndex = parseInt(sticky.style.zIndex);
    if (zIndex > highestZIndex) {
      highestZIndex = zIndex;
    }
  }
}

export function enableStickyFunctionality(sticky: Penny<HTMLDivElement>) {
  const stickyHeader = sticky.$(".stickyHeader")!;

  // Drag-and-drop variables
  let isDragging = false;
  let dragCurrentX: number;
  let dragCurrentY: number;
  let dragInitialX: number;
  let dragInitialY: number;
  let dragX = Number.parseInt(sticky.style.left, 10) || pointerX;
  let dragY = Number.parseInt(sticky.style.top, 10) || pointerY;

  sticky.on("pointerdown", () => {
    moveToTop(sticky);
    const idx = stickies.indexOf(sticky);
    if (idx !== -1) {
      stickies.splice(idx, 1);
      stickies.push(sticky);
    }
  });
  stickyHeader.addEventListener("pointerdown", dragStart);

  // Resize variables
  const resizeHandles = sticky.$$<HTMLDivElement>(".resizeHandle");
  let isResizing = false;
  let resizeHandle: HTMLDivElement | null = null;
  let resizeStartX: number;
  let resizeStartY: number;
  let resizeStartWidth: number;
  let resizeStartHeight: number;
  let resizeStartLeft: number;
  let resizeStartTop: number;

  resizeHandles.forEach((handle) => {
    handle.addEventListener("pointerdown", initResize);
  });

  function dragStart(e: PointerEvent) {
    if (e.target === stickyHeader) {
      isDragging = true;
      if (sticky.classList.contains("maximized")) {
        sticky.style.top = "0px";

        let width: number;
        if (sticky.style.width) {
          width = parseInt(sticky.style.width, 10);
        } else {
          width = stickySizeDummy.getBoundingClientRect().width;
        }
        sticky.style.left = `${e.clientX - width / 2}px`;
        sticky.classList.remove("maximized");
      }
    }

    dragInitialX = e.clientX - parseInt(sticky.style.left, 10);
    dragInitialY = e.clientY - parseInt(sticky.style.top, 10);

    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", dragEnd);
  }

  function drag(e: PointerEvent) {
    if (isDragging && !isResizing) {
      e.preventDefault();
      dragCurrentX = e.clientX - dragInitialX;
      dragCurrentY = e.clientY - dragInitialY;

      // Extended boundaries
      const maxX = stickyContainer.offsetWidth - 20;
      const maxY = stickyContainer.offsetHeight - 20;
      const minX = -sticky.offsetWidth + 20;
      const minY = 0;

      dragX = Math.min(Math.max(dragCurrentX, minX), maxX);
      dragY = Math.min(Math.max(dragCurrentY, minY), maxY);

      sticky.style.left = `${dragX}px`;
      sticky.style.top = `${dragY}px`;
    }
  }

  function dragEnd() {
    dragInitialX = sticky.offsetLeft;
    dragInitialY = sticky.offsetTop;
    isDragging = false;

    document.removeEventListener("pointermove", drag);
    document.removeEventListener("pointerup", dragEnd);
  }

  function initResize(e: PointerEvent) {
    isResizing = true;
    resizeHandle = e.target as HTMLDivElement;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = Number.parseInt(getComputedStyle(sticky).width, 10);
    resizeStartHeight = Number.parseInt(getComputedStyle(sticky).height, 10);
    resizeStartLeft = sticky.offsetLeft;
    resizeStartTop = sticky.offsetTop;
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", stopResize);
    e.preventDefault();
  }

  function resize(e: PointerEvent) {
    if (!isResizing) return;
    const resizeDeltaX = e.clientX - resizeStartX;
    const resizeDeltaY = e.clientY - resizeStartY;

    if (
      resizeHandle!.classList.contains("right") ||
      resizeHandle!.classList.contains("bottomRight") ||
      resizeHandle!.classList.contains("topRight")
    ) {
      sticky.style.width = `${resizeStartWidth + resizeDeltaX}px`;
    }
    if (
      resizeHandle!.classList.contains("bottom") ||
      resizeHandle!.classList.contains("bottomRight") ||
      resizeHandle!.classList.contains("bottomLeft")
    ) {
      sticky.style.height = `${resizeStartHeight + resizeDeltaY}px`;
    }
    if (
      resizeHandle!.classList.contains("left") ||
      resizeHandle!.classList.contains("topLeft") ||
      resizeHandle!.classList.contains("bottomLeft")
    ) {
      if (
        Number.parseInt(getComputedStyle(sticky).minWidth, 10) <
        resizeStartWidth - resizeDeltaX
      ) {
        sticky.style.width = `${resizeStartWidth - resizeDeltaX}px`;
        sticky.style.left = `${resizeStartLeft + resizeDeltaX}px`;
      }
    }
    if (
      resizeHandle!.classList.contains("top") ||
      resizeHandle!.classList.contains("topLeft") ||
      resizeHandle!.classList.contains("topRight")
    ) {
      if (
        Number.parseInt(getComputedStyle(sticky).minHeight, 10) <
        resizeStartHeight - resizeDeltaY
      ) {
        sticky.style.height = `${resizeStartHeight - resizeDeltaY}px`;
        sticky.style.top = `${resizeStartTop + resizeDeltaY}px`;
      }
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", stopResize);
  }

  moveToTop(sticky);
  stickies.push(sticky);

  const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
  const preview = sticky.$<HTMLDivElement>(".preview")!;
  const deleteBtn = sticky.$<HTMLButtonElement>(".deleteBtn")!;
  const editModeToggleLbl = sticky.$<HTMLLabelElement>(".editModeToggleLbl")!;
  const maximizeToggleLbl = sticky.$<HTMLLabelElement>(".maximizeToggleLbl")!;

  deleteBtn.on("click", () => {
    sticky.on("animationend", sticky.remove, { once: true });
    sticky.classList.add("remove");

    // Select previous sticky.
    const idx = stickies.indexOf(sticky);
    if (idx !== -1) {
      stickies.splice(idx, 1);
    }
    stickies.at(-1)?.focus();
  });

  n81i.translateElement(textarea);
  textarea.on("input", () => (textarea.dataset.value = textarea.value));
  preview.classList.add("preview");
  handleTextAreaPaste(sticky);
  sticky.dataset.prevInput = "";

  function updatePreview() {
    const html = marked.parse(textarea.value) as string;
    const fragment = document.createRange().createContextualFragment(html);
    preview.replaceChildren(fragment);
  }

  editModeToggleLbl.on("change", () => {
    editModeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));

    if (sticky.classList.contains("editMode") /* Change to view mode */) {
      if (sticky.dataset.prevInput !== textarea.value) {
        updatePreview();
      }
      sticky.focus();
    }
    textarea.disabled = !textarea.disabled;
    textarea.hidden = !textarea.hidden;
    sticky.dataset.prevInput = textarea.value;
    preview.hidden = !preview.hidden;
    textarea.focus();

    sticky.classList.toggle("editMode");
  });

  maximizeToggleLbl.on("change", () => {
    maximizeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
    sticky.classList.toggle("maximized");
  });

  textarea.on("input", () => {
    if (sticky.classList.contains("splitView")) {
      updatePreview();
      sticky.dataset.prevInput = textarea.value;
    }
  });

  // colorful outline
  // [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });

  return Object.assign(sticky, {
    delete() {
      deleteBtn.click();
    },
    duplicate() {
      const clone = $<HTMLDivElement>(sticky.cloneNode(true) as any);
      const duplicated = enableStickyFunctionality(clone as any);
      duplicated.style.left = `${parseInt(duplicated.style.left, 10) + 10}px`;
      duplicated.style.top = `${parseInt(duplicated.style.top, 10) + 10}px`;
      moveToTop(duplicated);
      stickyContainer.appendChild(duplicated);
      duplicated.focus();
    },
    toggleMaximize() {
      maximizeToggleLbl.click();
    },
    toggleEditMode() {
      editModeToggleLbl.click();
    },
    toggleSplitView() {
      if (!sticky.classList.contains("editMode")) {
        editModeToggleLbl.click();
      }
      updatePreview();
      sticky.classList.toggle("splitView");
      sticky.$("textarea")!.focus();
    },
    toggleGhostMode() {
      sticky.classList.toggle("ghost");
    },
    togglePin() {
      sticky.classList.toggle("pin");
      sticky
        .$$("textarea,input,button")
        .do((el) => (el.disabled = !el.disabled));
    },
  });
}

export function createSticky() {
  const sticky = $<HTMLDivElement>(
    stickyTemplate.content.cloneNode(true).firstElementChild,
  )!;
  sticky.style.left = `${pointerX - stickySizeDummy.getBoundingClientRect().width / 2}px`;
  sticky.style.top = `${Math.max(pointerY - 10, 0)}px`;

  return enableStickyFunctionality(sticky);
}

function moveToTop(el: HTMLElement) {
  highestZIndex++;
  el.style.zIndex = highestZIndex.toString();
  el.style.order = highestZIndex.toString();
}

export function handleTextAreaPaste(sticky: Penny<HTMLDivElement>) {
  const textarea = sticky.$<HTMLTextAreaElement>("textarea")!;
  textarea.on("paste", async (e) => {
    let isPasteImage = false;
    const clipboardItems =
      typeof navigator?.clipboard?.read === "function"
        ? await navigator.clipboard.read()
        : (e as any).clipboardData.files;

    for (const clipboardItem of clipboardItems) {
      let blob;
      if (clipboardItem.type?.startsWith("image/")) {
        blob = clipboardItem;
        paste(
          textarea,
          createMarkdownImageDescription(URL.createObjectURL(blob)),
        );
        isPasteImage = true;
      } else {
        const imageTypes = clipboardItem.types?.filter((type) =>
          type.startsWith("image/"),
        );
        for (const imageType of imageTypes) {
          blob = await clipboardItem.getType(imageType);
          paste(
            textarea,
            createMarkdownImageDescription(URL.createObjectURL(blob)),
          );
          isPasteImage = true;
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

initStickyContainer();
