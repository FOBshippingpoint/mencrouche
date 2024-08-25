import { Apocalypse, apocalypse, Undoable } from "./commands";
import { $, $$, Allowance } from "./utils/dollars";
import { n81i } from "./utils/n81i";

export type StickyPlugin = Record<string, any>;
export interface StickyPluginRegistry {
  [key: string]: any;
}
export interface Sticky extends Allowance<HTMLDivElement> {
  delete: () => void;
  forceDelete: () => void;
  restore: () => void;
  duplicate: () => Sticky;
  toggleMaximize: () => void;
  toggleGhostMode: () => void;
  togglePin: () => void;
  addControlWidget: (element: HTMLElement) => void;
  replaceBody: (...nodes: (Node | string)[]) => void;
  plugin: StickyPluginRegistry;
}

const stickyTemplate = $<HTMLTemplateElement>("#sticky")!;
// This element is for getting var(--size-fluid-9) in pixels. So that we can
// set default sticky position to center if user hasn't move the cursor yet.
const stickySizeDummy = $<HTMLDivElement>("#stickySizeDummy")!;

let stickyContainer: Allowance<HTMLDivElement>;
let pointerX: number;
let pointerY: number;
let mutationObserver: MutationObserver;

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

  mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.target.dispatchEvent(new CustomEvent("classchange"));
    }
  });
}

class StickyManager {
  #highestZIndex: number = 0;
  /** An array for tracking the sticky order, from lowest -> topest */
  #stickies: Sticky[] = [];
  #apocalypse: Apocalypse;

  constructor(apocalypse: Apocalypse) {
    this.#apocalypse = apocalypse;
    this.refreshHighestZIndex();
  }

  refreshHighestZIndex() {
    // Find and set the highestZIndex when initialize from existing document.
    this.#highestZIndex = 0;
    for (const sticky of $$(".sticky")) {
      const zIndex = parseInt(sticky.style.zIndex);
      if (zIndex > this.#highestZIndex) {
        this.#highestZIndex = zIndex;
      }
    }
  }

  add(sticky: Sticky) {
    // TODO: delete this line
    sticky.dataset.id = crypto.randomUUID();

    this.#apocalypse.write({
      execute: () => {
        this.#stickies.push(sticky);
        stickyContainer.appendChild(sticky);
      },
      undo: () => {
        this.forceDelete(sticky);
      },
    });
  }

  restore(sticky: Sticky) {
    const isDeleted = sticky.classList.contains("deleted");
    this.#apocalypse.write({
      execute: () => {
        if (isDeleted) {
          this.#restoreSticky(sticky);
        }
      },
      undo: () => {
        if (isDeleted) {
          this.#deleteSticky(sticky);
        }
      },
    });
  }

  restoreAllFromHtml() {
    for (const sticky of stickyContainer.$$<HTMLDivElement>(".sticky")) {
      const extendedSticky = enableFunctionality(sticky);
      this.#stickies.push(extendedSticky);
      for (const customSticky of getRelatedCustomStickies(extendedSticky)) {
        customSticky.on(extendedSticky, "restoreFromHtml");
      }
    }
  }

  delete(sticky: Sticky) {
    this.#apocalypse.write({
      execute: () => {
        this.#deleteSticky(sticky);
      },
      undo: () => {
        this.#restoreSticky(sticky);
      },
    });
  }

  deleteLatest() {
    const sticky = this.getLatestSticky();
    if (sticky) {
      this.delete(sticky);
    }
  }

  forceDelete(sticky: Sticky) {
    this.#stickies.splice(this.#stickies.indexOf(sticky), 1);
    sticky.remove();
  }

  deleteAll() {
    const backup = [...this.#stickies];
    this.#apocalypse.write({
      execute: () => {
        while (this.#stickies.length) {
          this.#deleteSticky(this.#stickies.at(-1)!);
        }
      },
      undo: () => {
        for (const sticky of backup) {
          this.#restoreSticky(sticky);
        }
      },
    });
  }

  saveAll() {
    for (const sticky of this.#stickies) {
      for (const customSticky of getRelatedCustomStickies(sticky)) {
        customSticky.on(sticky, "save");
      }
    }
  }

  duplicate(sticky: Sticky) {
    const clone = $<HTMLDivElement>(sticky.cloneNode(true) as any);
    const duplicated = enableFunctionality(clone as any);
    this.#apocalypse.write({
      execute: () => {
        duplicated.style.left = `${parseInt(duplicated.style.left, 10) + 20}px`;
        duplicated.style.top = `${parseInt(duplicated.style.top, 10) + 20}px`;
        this.moveToTop(duplicated);
        stickyContainer.appendChild(duplicated);
        this.#stickies.push(duplicated);
        duplicated.focus();
      },
      undo: () => {
        this.#deleteSticky(sticky);
      },
    });
  }

  duplicateLatest() {
    const sticky = this.getLatestSticky();
    if (sticky) {
      this.duplicate(sticky);
    }
  }

  moveToTop(sticky: Sticky) {
    this.#highestZIndex++;
    sticky.style.zIndex = this.#highestZIndex.toString();
    sticky.style.order = this.#highestZIndex.toString();
  }

  getLatestSticky() {
    return this.#stickies.at(-1);
  }

  getAllStickies(): readonly Sticky[] {
    return this.#stickies;
  }

  #deleteSticky(sticky: Sticky) {
    sticky.on("animationend", () => sticky.classList.add("none"), {
      once: true,
    });
    sticky.classList.add("deleted");
    const idx = this.#stickies.indexOf(sticky);
    if (idx !== -1) {
      this.#stickies.splice(idx, 1);
    }
    this.#stickies.at(-1)?.focus();
    sticky.dataset.idx = idx.toString();
    for (const custom of getRelatedCustomStickies(sticky)) {
      custom.on(sticky, "delete");
    }
  }

  #restoreSticky(sticky: Sticky) {
    sticky.classList.remove("none", "deleted");
    for (const custom of getRelatedCustomStickies(sticky)) {
      custom.on(sticky, "restore");
    }
    this.#stickies.splice(parseInt(sticky.dataset.idx!), 0, sticky);
  }
}

export const stickyManager = new StickyManager(apocalypse);

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
        (sticky as Sticky).toggleMaximize();
      }
    }

    dragInitialX = e.clientX - sticky.offsetLeft;
    dragInitialY = e.clientY - sticky.offsetTop;

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
    resizeStartWidth = sticky.offsetWidth;
    resizeStartHeight = sticky.offsetHeight;
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

  const extendedSticky = sticky as Sticky;

  Object.assign(sticky, {
    delete() {
      stickyManager.delete(extendedSticky);
    },
    forceDelete() {
      stickyManager.forceDelete(extendedSticky);
    },
    restore() {
      stickyManager.restore(extendedSticky);
    },
    duplicate() {
      stickyManager.duplicate(extendedSticky);
    },
    toggleMaximize() {
      maximizeToggleLbl.$$("svg").do((el) => el.classList.toggle("none"));
      sticky.classList.toggle("maximized");

      sticky.dispatchEvent(
        new CustomEvent(
          sticky.classList.contains("maximized") ? "minimize" : "maximize",
        ),
      );
    },
    toggleGhostMode() {
      sticky.classList.toggle("ghost");
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
      sticky.$<HTMLDivElement>(".controls slot")!.appendChild(element);
    },
    replaceBody(...nodes: (Node | string)[]) {
      sticky.$(".stickyBody")!.replaceChildren(...nodes);
    },
    plugin: {},
  });

  sticky.on("pointerdown", () => {
    stickyManager.moveToTop(extendedSticky);
  });

  deleteBtn.on("click", () => {
    extendedSticky.delete();
  });

  maximizeToggleLbl.on("change", () => {
    extendedSticky.toggleMaximize();
  });

  mutationObserver.observe(sticky, { attributeFilter: ["class"] });

  // colorful outline
  // [].forEach.call($$("*"), function (a) { a.style.outline = "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16); });

  return sticky as Sticky;
}

const customStickies = new Map<string, CustomSticky>();

export interface CreateStickyOptions {
  coord?: {
    left: number;
    top: number;
  };
  size?: {
    width: number;
    height: number;
  };
}

export function createSticky(type?: string, options: CreateStickyOptions = {}) {
  const sticky = $<HTMLDivElement>(
    (stickyTemplate.content.cloneNode(true) as any).firstElementChild,
  )!;

  if (options.coord) {
    sticky.style.left = `${options.coord.left}px`;
    sticky.style.top = `${options.coord.top}px`;
  } else {
    sticky.style.left = `${pointerX - stickySizeDummy.getBoundingClientRect().width / 2}px`;
    sticky.style.top = `${Math.max(pointerY - 10, 0)}px`;
  }
  if (options.size) {
    sticky.style.width = `${options.size.width}px`;
    sticky.style.height = `${options.size.height}px`;
  }

  const basicSticky = enableFunctionality(sticky);
  if (type) {
    const custom = customStickies.get(type);
    if (custom) {
      custom.on(basicSticky, "create");
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

export type StickyLifeCycleState =
  | "create"
  | "restore"
  | "restoreFromHtml"
  | "delete"
  | "save";

export interface CustomSticky {
  type: string;
  on: (sticky: Sticky, state: StickyLifeCycleState) => void;
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
