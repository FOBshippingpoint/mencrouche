import { $, $$$ } from "./utils/dollars";

let highestZIndex = 0;

let mouseX = 0;
let mouseY = 0;

const stickyContainer = $(".stickyContainer")!;
stickyContainer.addEventListener("pointermove", (e) => {
  mouseX = e.clientX - stickyContainer!.getBoundingClientRect().left;
  mouseY = e.clientY - stickyContainer!.getBoundingClientRect().top;
});

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
  const stickyHeader = sticky.$(".stickyHeader")!;
  sticky.style.left = `${mouseX - 10}px`;
  sticky.style.top = `${mouseY - 10}px`;

  let isDragging = false;
  let currentX: number;
  let currentY: number;
  let initialX: number;
  let initialY: number;
  let x = mouseX;
  let y = mouseY;

  // TODO: may be further simplify by dollars.on and off
  stickyHeader.addEventListener("pointerdown", dragStart);

  const resizeHandles = sticky.$$<HTMLDivElement>(".resizeHandle");
  let isResizing = false;
  let handle: HTMLDivElement | null = null;
  let startX: number,
    startY: number,
    startWidth: number,
    startHeight: number,
    startLeft: number,
    startTop: number;

  resizeHandles.forEach((handle) => {
    handle.addEventListener("mousedown", initResize);
  });

  function dragStart(e: PointerEvent) {
    initialX = e.clientX - parseInt(sticky.style.left, 10);
    initialY = e.clientY - parseInt(sticky.style.top, 10);

    if (e.target === stickyHeader) {
      isDragging = true;
      moveToTop(sticky);
    }

    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", dragEnd);
  }

  function drag(e: PointerEvent) {
    if (isDragging && !isResizing) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Extended boundaries
      const maxX = stickyContainer.offsetWidth - 20; // TODO: Use constant.
      const maxY = stickyContainer.offsetHeight - 20;
      const minX = -sticky.offsetWidth + 20;
      const minY = 0;

      x = Math.min(Math.max(currentX, minX), maxX);
      y = Math.min(Math.max(currentY, minY), maxY);

      sticky.style.left = `${x}px`;
      sticky.style.top = `${y}px`;
    }
  }

  function dragEnd() {
    initialX = sticky.offsetLeft;
    initialY = sticky.offsetTop;
    isDragging = false;

    document.removeEventListener("pointermove", drag);
    document.removeEventListener("pointerup", dragEnd);
  }

  function initResize(e: PointerEvent) {
    isResizing = true;
    handle = e.target;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(getComputedStyle(sticky).width, 10);
    startHeight = parseInt(getComputedStyle(sticky).height, 10);
    startLeft = sticky.offsetLeft;
    startTop = sticky.offsetTop;
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
    e.preventDefault();
  }

  function resize(e: PointerEvent) {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (
      handle.classList.contains("right") ||
      handle.classList.contains("bottomRight") ||
      handle.classList.contains("topRight")
    ) {
      sticky.style.width = `${startWidth + dx}px`;
    }
    if (
      handle.classList.contains("bottom") ||
      handle.classList.contains("bottomRight") ||
      handle.classList.contains("bottomLeft")
    ) {
      sticky.style.height = `${startHeight + dy}px`;
    }
    if (
      handle.classList.contains("left") ||
      handle.classList.contains("topLeft") ||
      handle.classList.contains("bottomLeft")
    ) {
      if (parseInt(getComputedStyle(sticky).minWidth, 10) < startWidth - dx) {
        sticky.style.width = `${startWidth - dx}px`;
        sticky.style.left = `${startLeft + dx}px`;
      }
    }
    if (
      handle.classList.contains("top") ||
      handle.classList.contains("topLeft") ||
      handle.classList.contains("topRight")
    ) {
      if (parseInt(getComputedStyle(sticky).minHeight, 10) < startHeight - dy) {
        sticky.style.height = `${startHeight - dy}px`;
        sticky.style.top = `${startTop + dy}px`;
      }
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
  }

  moveToTop(sticky);

  function close() {
    sticky.on("animationend", sticky.remove);
    sticky.classList.add("close");
  }
  sticky.$(".closeBtn")!.on("click", close);

  return Object.assign(sticky, { close });
}

function moveToTop(el: HTMLElement) {
  highestZIndex++;
  el.style.zIndex = highestZIndex.toString();
  el.style.order = highestZIndex.toString();
}
