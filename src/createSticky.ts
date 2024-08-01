import { $, $$, Penny } from "./utils/dollars";

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

export function getLatestSticky() {
  return stickies.at(-1);
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
        sticky.style.left = `${e.clientX - parseInt(sticky.style.width, 10) / 2}px`;
        sticky.classList.remove("maximized");
      }
    }

    dragInitialX = e.clientX - Number.parseInt(sticky.style.left, 10);
    dragInitialY = e.clientY - Number.parseInt(sticky.style.top, 10);

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

  sticky.$(".removeBtn")!.on("click", () => {
    sticky.on("animationend", sticky.remove, { once: true });
    sticky.classList.add("remove");

    // Select previous sticky.
    const idx = stickies.indexOf(sticky);
    if (idx !== -1) {
      stickies.splice(idx, 1);
    }
    stickies.at(-1)?.focus();
  });

  sticky
    .$(".maximizeBtn")!
    .on("click", () => sticky.classList.toggle("maximized"));

  return sticky;
}

export function createSticky() {
  const sticky = $<HTMLDivElement>(
    stickyTemplate.content.cloneNode(true).firstElementChild,
  )!;
  sticky.style.left = `${Math.max(pointerX - stickySizeDummy.getBoundingClientRect().width / 2, 0)}px`;
  sticky.style.top = `${Math.max(pointerY - 10, 0)}px`;

  return enableStickyFunctionality(sticky);
}

function moveToTop(el: HTMLElement) {
  highestZIndex++;
  el.style.zIndex = highestZIndex.toString();
  el.style.order = highestZIndex.toString();
}

initStickyContainer();
