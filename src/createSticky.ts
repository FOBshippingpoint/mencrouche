import { $, $$, $$$, type Penny } from "./utils/dollars";

let highestZIndex = 0;
/** An array for tracking the sticky order, from lowest -> topest */
const stickies: Penny<HTMLDivElement>[] = [];

let pointerX = 0;
let pointerY = 0;
let stickyContainer: Penny<HTMLDivElement>;

export function initStickyContainer() {
  stickyContainer = $<HTMLDivElement>(".stickyContainer")!;
  stickyContainer.addEventListener("pointermove", (e) => {
    pointerX = e.clientX - stickyContainer!.getBoundingClientRect().left;
    pointerY = e.clientY - stickyContainer!.getBoundingClientRect().top;
  });
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
    dragInitialX = e.clientX - Number.parseInt(sticky.style.left, 10);
    dragInitialY = e.clientY - Number.parseInt(sticky.style.top, 10);

    if (e.target === stickyHeader) {
      isDragging = true;
    }

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

  function close() {
    sticky.addEventListener("animationend", sticky.remove);
    sticky.classList.add("close");

    // Select previous sticky.
    const idx = stickies.indexOf(sticky);
    if (idx !== -1) {
      stickies.splice(idx, 1);
    }
    stickies.at(-1)?.focus();
  }

  const closeBtn = sticky.$(".closeBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  return sticky;
}

export function createSticky() {
  const sticky = $$$("div");
  sticky.tabIndex = 0; // To let div trigger keyboard event.
  sticky.classList.add("sticky");
  sticky.innerHTML = `
  <div class="stickyHeader">
    <div class="controls">
      <button class="closeBtn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  </div>
  <div class="stickyBody"></div>
  <div class="resizeHandle top"></div>
  <div class="resizeHandle right"></div>
  <div class="resizeHandle bottom"></div>
  <div class="resizeHandle left"></div>
  <div class="resizeHandle topLeft"></div>
  <div class="resizeHandle topRight"></div>
  <div class="resizeHandle bottomLeft"></div>
  <div class="resizeHandle bottomRight"></div>
  `;
  sticky.style.left = `${Math.max(pointerX - 10, 0)}px`;
  sticky.style.top = `${Math.max(pointerY - 10, 0)}px`;

  return enableStickyFunctionality(sticky);
}

function moveToTop(el: HTMLElement) {
  highestZIndex++;
  el.style.zIndex = highestZIndex.toString();
  el.style.order = highestZIndex.toString();
}

initStickyContainer();
