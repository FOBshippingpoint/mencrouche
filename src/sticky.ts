import { $, $$, Allowance } from "./utils/dollars";
import { n81i } from "./utils/n81i";

export type StickyPlugin = Record<string, any>;
export interface StickyPluginRegistry {
  [key: string]: any;
}
export type Sticky = Allowance<HTMLDivElement> & {
  delete: () => void;
  forceDelete: () => void;
  recover: () => void;
  duplicate: () => Sticky;
  toggleMaximize: () => void;
  toggleGhostMode: () => void;
  togglePin: () => void;
  addControlWidget: (element: HTMLElement) => void;
  replaceBody: (...nodes: (Node | string)[]) => void;
  plugin: StickyPluginRegistry;
};

let highestZIndex = 0;
/** An array for tracking the sticky order, from lowest -> topest */
const stickies: Sticky[] = [];
const stickyTemplate = $<HTMLTemplateElement>("#sticky")!;
// This element is for getting var(--size-fluid-9) in pixels. So that we can
// set default sticky position to center if user hasn't move the cursor yet.
const stickySizeDummy = $<HTMLDivElement>("#stickySizeDummy")!;

let stickyContainer: Allowance<HTMLDivElement>;
let pointerX: number;
let pointerY: number;
let mutationObserver: MutationObserver;

export function getLatestSticky(): Sticky | undefined {
  return stickies.at(-1);
}

export function getAllStickies(): readonly Sticky[] {
  return stickies;
}

export function initStickyEnvironment() {
  stickyContainer = $<HTMLDivElement>(".stickyContainer")!;

  stickyContainer.on("pointermove", (e) => {
    pointerX = e.clientX - stickyContainer!.getBoundingClientRect().left;
    pointerY = e.clientY - stickyContainer!.getBoundingClientRect().top;
  });

  pointerX = stickyContainer.getBoundingClientRect().width / 2;
  pointerY =
    (stickyContainer.getBoundingClientRect().height -
      stickySizeDummy.getBoundingClientRect().width) /
    2;

  // Find and set the highestZIndex when initialize from existing document.
  highestZIndex = 0;
  for (const sticky of $$(".sticky")) {
    const zIndex = parseInt(sticky.style.zIndex);
    if (zIndex > highestZIndex) {
      highestZIndex = zIndex;
    }
  }

  mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.target.dispatchEvent(new CustomEvent("classchange"));
    }
  });
}

export function enableFunctionality(sticky: Allowance<HTMLDivElement>): Sticky {
  const stickyHeader = sticky.$(".stickyHeader")!;
  const deleteBtn = sticky.$<HTMLButtonElement>(".deleteBtn")!;
  const maximizeToggleLbl = sticky.$<HTMLLabelElement>(".maximizeToggleLbl")!;

  // Drag-and-drop variables
  let isDragging = false;
  let dragCurrentX: number;
  let dragCurrentY: number;
  let dragInitialX: number;
  let dragInitialY: number;
  let dragX = parseInt(sticky.style.left, 10) || pointerX;
  let dragY = parseInt(sticky.style.top, 10) || pointerY;

  stickyHeader.on("pointerdown", dragStart);

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

  for (const handle of resizeHandles) {
    handle.on("pointerdown", resizeStart);
  }

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
        maximizeToggleLbl.click();
      }
    }

    dragInitialX = e.clientX - parseInt(sticky.style.left, 10);
    dragInitialY = e.clientY - parseInt(sticky.style.top, 10);

    document.on("pointermove", drag);
    document.on("pointerup", dragEnd);
  }

  function drag(e: PointerEvent) {
    if (isDragging && !isResizing) {
      e.preventDefault();
      dragCurrentX = e.clientX - dragInitialX;
      dragCurrentY = e.clientY - dragInitialY;

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

  function resizeStart(e: PointerEvent) {
    e.preventDefault();

    isResizing = true;
    resizeHandle = e.target as HTMLDivElement;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = parseInt(getComputedStyle(sticky).width, 10);
    resizeStartHeight = parseInt(getComputedStyle(sticky).height, 10);
    resizeStartLeft = sticky.offsetLeft;
    resizeStartTop = sticky.offsetTop;

    document.on("pointermove", resize);
    document.on("pointerup", resizeEnd);
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
        parseInt(getComputedStyle(sticky).minWidth, 10) <
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
        parseInt(getComputedStyle(sticky).minHeight, 10) <
        resizeStartHeight - resizeDeltaY
      ) {
        sticky.style.height = `${resizeStartHeight - resizeDeltaY}px`;
        sticky.style.top = `${resizeStartTop + resizeDeltaY}px`;
      }
    }
  }

  function resizeEnd() {
    isResizing = false;

    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", resizeEnd);
  }

  const result = Object.assign(sticky, {
    delete() {
      deleteBtn.click();
    },
    forceDelete() {
      sticky.remove();
    },
    recover() {
      if (sticky.classList.contains("deleted")) {
        sticky.classList.remove("deleted");
        sticky.classList.remove("none");
        stickyContainer.appendChild(sticky);
      }
    },
    duplicate() {
      const clone = $<HTMLDivElement>(sticky.cloneNode(true) as any);
      const duplicated = enableFunctionality(clone as any);
      duplicated.style.left = `${parseInt(duplicated.style.left, 10) + 10}px`;
      duplicated.style.top = `${parseInt(duplicated.style.top, 10) + 10}px`;
      moveToTop(duplicated);
      stickyContainer.appendChild(duplicated);
      duplicated.focus();

      return duplicated;
    },
    toggleMaximize() {
      maximizeToggleLbl.click();
    },
    toggleGhostMode() {
      sticky.classList.toggle("ghost");
      // How about global???
      // if (sticky.classList.contains("ghost")) {
      //   sticky.dispatchEvent(new CustomEvent("ghoston"));
      // } else {
      //   sticky.dispatchEvent(new CustomEvent("ghostoff"));
      // }
    },
    togglePin() {
      sticky.classList.toggle("pin");
      if (sticky.classList.contains("pin")) {
        sticky.dispatchEvent(new CustomEvent("pin"));
      } else {
        sticky.dispatchEvent(new CustomEvent("unpin"));
      }
    },
    addControlWidget(element: HTMLElement) {
      sticky.$<HTMLDivElement>(".controls slot")!.replaceChildren(element);
    },
    replaceBody(...nodes: (Node | string)[]) {
      sticky.$(".stickyBody")!.replaceChildren(...nodes);
    },
    plugin: {},
  });

  sticky.on("pointerdown", () => {
    moveToTop(sticky);
    const idx = stickies.indexOf(sticky);
    if (idx !== -1) {
      stickies.splice(idx, 1);
      stickies.push(sticky);
    }
  });

  moveToTop(sticky);
  stickies.push(sticky);
  mutationObserver.observe(sticky, { attributeFilter: ["class"] });

  deleteBtn.on("click", () => {
    console.log("click deletebtn")
    sticky.on(
      "animationend",
      () => {
        sticky.classList.add("none");
      },
      { once: true },
    );
    sticky.classList.add("deleted");

    // Select previous sticky.
    const idx = stickies.indexOf(sticky);
    if (idx !== -1) {
      stickies.splice(idx, 1);
    }
    stickies.at(-1)?.focus();

    for (const custom of getRelatedCustomStickies(sticky)) {
      custom.onDelete(result);
    }
  });

  maximizeToggleLbl.on("change", () => {
    maximizeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
    sticky.classList.toggle("maximized");

    sticky.dispatchEvent(
      new CustomEvent(
        sticky.classList.contains("maximized") ? "minimize" : "maximize",
      ),
    );
  });

  // colorful outline
  // [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });

  for (const custom of getRelatedCustomStickies(sticky)) {
    custom.onRestore(result);
  }

  return result;
}

const customStickies = new Map<string, CustomSticky>();

interface CreateStickyOptions {
  coord?: {
    left: string;
    top: string;
  };
}

export function createSticky(type?: string, options: CreateStickyOptions = {}) {
  const sticky = $<HTMLDivElement>(
    (stickyTemplate.content.cloneNode(true) as any).firstElementChild,
  )!;

  if (options.coord) {
    sticky.style.left = options.coord.left;
    sticky.style.top = options.coord.top;
  } else {
    sticky.style.left = `${pointerX - stickySizeDummy.getBoundingClientRect().width / 2}px`;
    sticky.style.top = `${Math.max(pointerY - 10, 0)}px`;
  }

  const basicSticky = enableFunctionality(sticky);
  if (type) {
    const custom = customStickies.get(type);
    if (custom) {
      custom.onNew(basicSticky);
      basicSticky.classList.add(type);
    } else {
      throw Error(
        `Custom sticky type '${type}' not found. Please register sticky type first via 'registerSticky'.`,
      );
    }
  }
  n81i.translateElement(basicSticky);

  return basicSticky;
}

function moveToTop(el: HTMLElement) {
  highestZIndex++;
  el.style.zIndex = highestZIndex.toString();
  el.style.order = highestZIndex.toString();
}

export interface CustomSticky {
  type: string;
  onNew: (sticky: Sticky) => void;
  onRestore: (sticky: Sticky) => void;
  onDelete: (sticky: Sticky) => void;
}

export function registerSticky(customSticky: CustomSticky) {
  if (customStickies.has(customSticky.type)) {
    throw Error(
      `Custom sticky '${customSticky.type}' already exists. Please try another name.`,
    );
  }

  customStickies.set(customSticky.type, customSticky);
}

export function getRelatedCustomStickies(
  sticky: Allowance<HTMLDivElement> | Sticky,
) {
  const result = [];
  for (const className of sticky.classList.values()) {
    const custom = customStickies.get(className);
    if (custom) {
      result.push(custom);
    }
  }
  return result;
}

export function getCustomStickyTypes() {
  return [...customStickies.values()].map(({ type }) => type);
}

initStickyEnvironment();

export { stickyContainer };
